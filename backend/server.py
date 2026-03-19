from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import httpx

from project_service import ProjectService
from models import (
    Project, ProjectPrompt, GenerationRun, ProjectFile, FileVersion,
    ProjectActivity, CreateProjectRequest, ContinueProjectRequest,
    ProjectSummary, ProjectDetailResponse, PromptType
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize project service
project_service = ProjectService(db)

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'https://ai-ide-preview-1.preview.emergentagent.com')

# Create the main app
app = FastAPI(title="ForJenta API", version="3.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ═══════════════════════════════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════════════════════════════

class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SessionRequest(BaseModel):
    session_id: str

class GitHubCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None

class GitHubConnection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    github_id: int
    github_login: str
    github_name: Optional[str] = None
    github_avatar: Optional[str] = None
    github_token: str  # Encrypted in production
    connected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CreateRepoRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    private: bool = False

class PushFilesRequest(BaseModel):
    owner: str
    repo: str
    branch: str = "main"
    files: List[Dict[str, str]]  # [{"path": "file.txt", "content": "..."}]
    message: str = "Update from ForJenta"

# ═══════════════════════════════════════════════════════════════════
# AUTH HELPERS
# ═══════════════════════════════════════════════════════════════════

async def get_current_user(request: Request) -> User:
    """Extract and validate current user from session cookie or auth header."""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header[7:]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiration
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

async def get_github_connection(user: User = Depends(get_current_user)) -> GitHubConnection:
    """Get user's GitHub connection."""
    connection = await db.github_connections.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )
    
    if not connection:
        raise HTTPException(status_code=404, detail="GitHub not connected")
    
    return GitHubConnection(**connection)

# ═══════════════════════════════════════════════════════════════════
# STATUS ROUTES
# ═══════════════════════════════════════════════════════════════════

@api_router.get("/")
async def root():
    return {"message": "ForJenta API v2.0.0"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# ═══════════════════════════════════════════════════════════════════
# EMERGENT GOOGLE AUTH ROUTES
# ═══════════════════════════════════════════════════════════════════

@api_router.post("/auth/session")
async def exchange_session(request: SessionRequest, response: Response):
    """
    Exchange Emergent Auth session_id for user data and set session cookie.
    REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    """
    try:
        async with httpx.AsyncClient() as http_client:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id},
                timeout=10.0
            )
            
            if auth_response.status_code != 200:
                logger.error(f"Emergent auth failed: {auth_response.text}")
                raise HTTPException(status_code=401, detail="Authentication failed")
            
            auth_data = auth_response.json()
            
            # Check if user exists, create or update
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            existing_user = await db.users.find_one(
                {"email": auth_data["email"]},
                {"_id": 0}
            )
            
            if existing_user:
                user_id = existing_user["user_id"]
                # Update user info
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "name": auth_data.get("name"),
                        "picture": auth_data.get("picture"),
                    }}
                )
            else:
                # Create new user
                await db.users.insert_one({
                    "user_id": user_id,
                    "email": auth_data["email"],
                    "name": auth_data.get("name"),
                    "picture": auth_data.get("picture"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            # Create session
            session_token = auth_data.get("session_token", f"session_{uuid.uuid4().hex}")
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.insert_one({
                "user_id": user_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            # Set httpOnly cookie
            response.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
                secure=True,
                samesite="none",
                path="/",
                max_age=7 * 24 * 60 * 60  # 7 days
            )
            
            # Get user data
            user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
            
            return {
                "success": True,
                "user": user_doc
            }
            
    except httpx.RequestError as e:
        logger.error(f"HTTP error during auth: {e}")
        raise HTTPException(status_code=502, detail="Authentication service unavailable")

@api_router.get("/auth/me")
async def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    # Check for GitHub connection
    github_connection = await db.github_connections.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "github_token": 0}  # Don't expose token
    )
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "github_connected": github_connection is not None,
        "github_login": github_connection.get("github_login") if github_connection else None
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session."""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    
    return {"success": True}

# ═══════════════════════════════════════════════════════════════════
# GITHUB OAUTH ROUTES
# ═══════════════════════════════════════════════════════════════════

@api_router.get("/github/connect")
async def github_connect_url(user: User = Depends(get_current_user)):
    """Get GitHub OAuth authorization URL."""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    state = f"{user.user_id}_{uuid.uuid4().hex[:8]}"
    
    # Store state for verification
    await db.oauth_states.insert_one({
        "state": state,
        "user_id": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={FRONTEND_URL}/auth/github/callback"
        f"&scope=repo,user"
        f"&state={state}"
    )
    
    return {"authorization_url": auth_url}

@api_router.post("/github/callback")
async def github_callback(request: GitHubCallbackRequest, user: User = Depends(get_current_user)):
    """Exchange GitHub authorization code for access token and connect account."""
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured")
    
    # Verify state if provided
    if request.state:
        state_doc = await db.oauth_states.find_one({"state": request.state})
        if not state_doc or state_doc.get("user_id") != user.user_id:
            raise HTTPException(status_code=400, detail="Invalid state parameter")
        # Delete used state
        await db.oauth_states.delete_one({"state": request.state})
    
    try:
        async with httpx.AsyncClient() as http_client:
            # Exchange code for token
            token_response = await http_client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": GITHUB_CLIENT_ID,
                    "client_secret": GITHUB_CLIENT_SECRET,
                    "code": request.code,
                },
                headers={"Accept": "application/json"},
                timeout=10.0
            )
            
            token_data = token_response.json()
            
            if "error" in token_data:
                logger.error(f"GitHub OAuth error: {token_data}")
                raise HTTPException(
                    status_code=401,
                    detail=f"GitHub authentication failed: {token_data.get('error_description', token_data['error'])}"
                )
            
            github_token = token_data["access_token"]
            
            # Fetch GitHub user info
            user_response = await http_client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10.0
            )
            
            if user_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Failed to fetch GitHub user info")
            
            github_user = user_response.json()
            
            # Store or update GitHub connection
            await db.github_connections.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "user_id": user.user_id,
                    "github_id": github_user["id"],
                    "github_login": github_user["login"],
                    "github_name": github_user.get("name"),
                    "github_avatar": github_user.get("avatar_url"),
                    "github_token": github_token,
                    "connected_at": datetime.now(timezone.utc).isoformat()
                }},
                upsert=True
            )
            
            return {
                "success": True,
                "github_login": github_user["login"],
                "github_avatar": github_user.get("avatar_url")
            }
            
    except httpx.RequestError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=502, detail="GitHub API unavailable")

@api_router.delete("/github/disconnect")
async def github_disconnect(user: User = Depends(get_current_user)):
    """Disconnect GitHub account."""
    result = await db.github_connections.delete_one({"user_id": user.user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="GitHub not connected")
    
    return {"success": True}

@api_router.get("/github/status")
async def github_status(user: User = Depends(get_current_user)):
    """Check GitHub connection status."""
    connection = await db.github_connections.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "github_token": 0}
    )
    
    return {
        "connected": connection is not None,
        "github_login": connection.get("github_login") if connection else None,
        "github_avatar": connection.get("github_avatar") if connection else None
    }

# ═══════════════════════════════════════════════════════════════════
# GITHUB REPOSITORY ROUTES
# ═══════════════════════════════════════════════════════════════════

@api_router.get("/github/repos")
async def list_github_repos(connection: GitHubConnection = Depends(get_github_connection)):
    """List user's GitHub repositories."""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                params={"per_page": 100, "sort": "updated"},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch repositories")
            
            repos = response.json()
            
            return {
                "repositories": [
                    {
                        "id": repo["id"],
                        "name": repo["name"],
                        "full_name": repo["full_name"],
                        "description": repo.get("description"),
                        "url": repo["html_url"],
                        "clone_url": repo["clone_url"],
                        "private": repo["private"],
                        "language": repo.get("language"),
                        "default_branch": repo.get("default_branch", "main"),
                        "updated_at": repo["updated_at"]
                    }
                    for repo in repos
                ]
            }
            
    except httpx.RequestError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=502, detail="GitHub API unavailable")

@api_router.post("/github/repos")
async def create_github_repo(
    request: CreateRepoRequest,
    connection: GitHubConnection = Depends(get_github_connection)
):
    """Create a new GitHub repository."""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                json={
                    "name": request.name,
                    "description": request.description,
                    "private": request.private,
                    "auto_init": True
                },
                timeout=15.0
            )
            
            if response.status_code not in [200, 201]:
                error_data = response.json()
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_data.get("message", "Failed to create repository")
                )
            
            repo = response.json()
            
            return {
                "success": True,
                "repository": {
                    "id": repo["id"],
                    "name": repo["name"],
                    "full_name": repo["full_name"],
                    "url": repo["html_url"],
                    "clone_url": repo["clone_url"],
                    "private": repo["private"]
                }
            }
            
    except httpx.RequestError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=502, detail="GitHub API unavailable")

@api_router.get("/github/repos/{owner}/{repo}/branches")
async def list_branches(
    owner: str,
    repo: str,
    connection: GitHubConnection = Depends(get_github_connection)
):
    """List branches in a repository."""
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                f"https://api.github.com/repos/{owner}/{repo}/branches",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                params={"per_page": 100},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch branches")
            
            branches = response.json()
            
            return {
                "branches": [
                    {
                        "name": branch["name"],
                        "sha": branch["commit"]["sha"],
                        "protected": branch.get("protected", False)
                    }
                    for branch in branches
                ]
            }
            
    except httpx.RequestError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=502, detail="GitHub API unavailable")

@api_router.get("/github/repos/{owner}/{repo}/contents")
async def get_repo_contents(
    owner: str,
    repo: str,
    path: str = "",
    ref: str = "main",
    connection: GitHubConnection = Depends(get_github_connection)
):
    """Get repository contents."""
    try:
        async with httpx.AsyncClient() as http_client:
            url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
            response = await http_client.get(
                url,
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                params={"ref": ref},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch contents")
            
            return response.json()
            
    except httpx.RequestError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=502, detail="GitHub API unavailable")

@api_router.post("/github/repos/{owner}/{repo}/push")
async def push_files(
    owner: str,
    repo: str,
    request: PushFilesRequest,
    connection: GitHubConnection = Depends(get_github_connection)
):
    """Push files to a GitHub repository."""
    import base64
    
    try:
        async with httpx.AsyncClient() as http_client:
            # Get the current commit SHA
            ref_response = await http_client.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{request.branch}",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10.0
            )
            
            if ref_response.status_code != 200:
                raise HTTPException(status_code=404, detail=f"Branch '{request.branch}' not found")
            
            current_sha = ref_response.json()["object"]["sha"]
            
            # Get the current tree
            commit_response = await http_client.get(
                f"https://api.github.com/repos/{owner}/{repo}/git/commits/{current_sha}",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                timeout=10.0
            )
            
            base_tree_sha = commit_response.json()["tree"]["sha"]
            
            # Create blobs for each file
            tree_items = []
            for file in request.files:
                blob_response = await http_client.post(
                    f"https://api.github.com/repos/{owner}/{repo}/git/blobs",
                    headers={
                        "Authorization": f"Bearer {connection.github_token}",
                        "Accept": "application/vnd.github.v3+json"
                    },
                    json={
                        "content": base64.b64encode(file["content"].encode()).decode(),
                        "encoding": "base64"
                    },
                    timeout=10.0
                )
                
                if blob_response.status_code != 201:
                    raise HTTPException(status_code=500, detail=f"Failed to create blob for {file['path']}")
                
                tree_items.append({
                    "path": file["path"],
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob_response.json()["sha"]
                })
            
            # Create new tree
            tree_response = await http_client.post(
                f"https://api.github.com/repos/{owner}/{repo}/git/trees",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                json={
                    "base_tree": base_tree_sha,
                    "tree": tree_items
                },
                timeout=10.0
            )
            
            if tree_response.status_code != 201:
                raise HTTPException(status_code=500, detail="Failed to create tree")
            
            new_tree_sha = tree_response.json()["sha"]
            
            # Create commit
            commit_create_response = await http_client.post(
                f"https://api.github.com/repos/{owner}/{repo}/git/commits",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                json={
                    "message": request.message,
                    "tree": new_tree_sha,
                    "parents": [current_sha]
                },
                timeout=10.0
            )
            
            if commit_create_response.status_code != 201:
                raise HTTPException(status_code=500, detail="Failed to create commit")
            
            new_commit_sha = commit_create_response.json()["sha"]
            
            # Update reference
            ref_update_response = await http_client.patch(
                f"https://api.github.com/repos/{owner}/{repo}/git/refs/heads/{request.branch}",
                headers={
                    "Authorization": f"Bearer {connection.github_token}",
                    "Accept": "application/vnd.github.v3+json"
                },
                json={"sha": new_commit_sha},
                timeout=10.0
            )
            
            if ref_update_response.status_code != 200:
                raise HTTPException(status_code=500, detail="Failed to update reference")
            
            return {
                "success": True,
                "commit_sha": new_commit_sha,
                "message": request.message
            }
            
    except httpx.RequestError as e:
        logger.error(f"GitHub API error: {e}")
        raise HTTPException(status_code=502, detail="GitHub API unavailable")


# ═══════════════════════════════════════════════════════════════════
# PROJECT ROUTES - Persistent AI Builder
# ═══════════════════════════════════════════════════════════════════

class CreateProjectBody(BaseModel):
    name: str
    prompt: str
    description: Optional[str] = None

class ContinueProjectBody(BaseModel):
    prompt: str
    force_rebuild: bool = False

class SaveFilesBody(BaseModel):
    files: List[Dict[str, str]]  # [{"path": "...", "content": "...", "language": "..."}]
    run_id: str
    prompt_id: str
    change_reason: Optional[str] = None

class UpdateArchitectureBody(BaseModel):
    architecture_summary: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    main_features: Optional[List[str]] = None


@api_router.post("/projects")
async def create_project(body: CreateProjectBody, user: User = Depends(get_current_user)):
    """Create a new project from initial prompt."""
    project = await project_service.create_project(
        user_id=user.user_id,
        name=body.name,
        initial_prompt=body.prompt,
        description=body.description
    )
    
    return {
        "success": True,
        "project": project.model_dump()
    }


@api_router.get("/projects")
async def list_projects(user: User = Depends(get_current_user)):
    """List all projects for the current user."""
    projects = await project_service.get_user_projects(user.user_id)
    
    return {
        "projects": [
            {
                "project_id": p.project_id,
                "name": p.name,
                "description": p.description,
                "status": p.status,
                "current_file_count": p.current_file_count,
                "total_prompts": p.total_prompts,
                "tech_stack": p.tech_stack,
                "main_features": p.main_features,
                "created_at": p.created_at.isoformat() if isinstance(p.created_at, datetime) else p.created_at,
                "updated_at": p.updated_at.isoformat() if isinstance(p.updated_at, datetime) else p.updated_at,
                "last_generation_at": p.last_generation_at.isoformat() if p.last_generation_at and isinstance(p.last_generation_at, datetime) else p.last_generation_at
            }
            for p in projects
        ]
    }


@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: User = Depends(get_current_user)):
    """Get full project details including files and history."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = await project_service.get_project_files(project_id)
    prompts = await project_service.get_prompt_history(project_id)
    activity = await project_service.get_activity_timeline(project_id, limit=20)
    
    return {
        "project": project.model_dump(),
        "files": [f.model_dump() for f in files],
        "prompts": [p.model_dump() for p in prompts],
        "activity": [a.model_dump() for a in activity]
    }


@api_router.get("/projects/{project_id}/context")
async def get_project_context(project_id: str, user: User = Depends(get_current_user)):
    """
    Load full project context for continuation.
    This is what the generator needs before processing a new prompt.
    """
    context = await project_service.load_project_context(project_id, user.user_id)
    
    if not context:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return context


@api_router.post("/projects/{project_id}/prompts")
async def add_prompt(
    project_id: str,
    body: ContinueProjectBody,
    user: User = Depends(get_current_user)
):
    """
    Add a new prompt to continue building the project.
    This classifies the prompt and prepares for generation.
    """
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get current files for classification
    files = await project_service.get_project_files(project_id)
    file_paths = [f.path for f in files]
    
    # Classify the prompt
    prompt_type, is_full_rebuild, targeted_files = project_service.classify_prompt(
        body.prompt,
        has_existing_files=len(files) > 0,
        existing_file_paths=file_paths
    )
    
    # Override if force_rebuild is set
    if body.force_rebuild:
        prompt_type = "full_rebuild"
        is_full_rebuild = True
    
    # Get sequence number
    last_prompt = await project_service.get_last_prompt(project_id)
    sequence_number = (last_prompt.sequence_number + 1) if last_prompt else 1
    
    # Create prompt record
    prompt = await project_service.add_prompt(
        project_id=project_id,
        user_id=user.user_id,
        content=body.prompt,
        prompt_type=prompt_type,
        is_continuation=not is_full_rebuild,
        sequence_number=sequence_number,
        targeted_files=targeted_files
    )
    
    # Create generation run
    run = await project_service.create_generation_run(
        project_id=project_id,
        user_id=user.user_id,
        prompt_id=prompt.prompt_id,
        prompt_type=prompt_type,
        is_full_rebuild=is_full_rebuild
    )
    
    # Log activity
    await project_service.log_activity(
        project_id=project_id,
        user_id=user.user_id,
        activity_type="prompt",
        title=f"{'Full Rebuild' if is_full_rebuild else 'Continue Building'}: {body.prompt[:50]}...",
        prompt_id=prompt.prompt_id,
        run_id=run.run_id
    )
    
    return {
        "success": True,
        "prompt": prompt.model_dump(),
        "run": run.model_dump(),
        "classification": {
            "prompt_type": prompt_type,
            "is_full_rebuild": is_full_rebuild,
            "is_continuation": not is_full_rebuild,
            "targeted_files": targeted_files
        },
        "context": {
            "existing_file_count": len(files),
            "existing_file_paths": file_paths
        }
    }


@api_router.get("/projects/{project_id}/prompts")
async def get_prompt_history(project_id: str, user: User = Depends(get_current_user)):
    """Get prompt/conversation history for a project."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    prompts = await project_service.get_prompt_history(project_id)
    
    return {
        "prompts": [p.model_dump() for p in prompts]
    }


@api_router.post("/projects/{project_id}/files")
async def save_project_files(
    project_id: str,
    body: SaveFilesBody,
    user: User = Depends(get_current_user)
):
    """Save or update project files with version history."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    results = {
        "created": [],
        "updated": [],
        "errors": []
    }
    
    for file_data in body.files:
        try:
            file, change_type = await project_service.save_file(
                project_id=project_id,
                path=file_data["path"],
                content=file_data["content"],
                language=file_data.get("language", "text"),
                run_id=body.run_id,
                prompt_id=body.prompt_id,
                change_reason=body.change_reason
            )
            
            if change_type == "created":
                results["created"].append(file_data["path"])
            else:
                results["updated"].append(file_data["path"])
                
        except Exception as e:
            logger.error(f"Error saving file {file_data['path']}: {e}")
            results["errors"].append({"path": file_data["path"], "error": str(e)})
    
    return {
        "success": len(results["errors"]) == 0,
        "results": results
    }


@api_router.get("/projects/{project_id}/files")
async def get_project_files(project_id: str, user: User = Depends(get_current_user)):
    """Get all current files for a project."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    files = await project_service.get_project_files(project_id)
    
    return {
        "files": [
            {
                "file_id": f.file_id,
                "path": f.path,
                "content": f.content,
                "language": f.language,
                "size_bytes": f.size_bytes,
                "line_count": f.line_count,
                "version_number": f.version_number,
                "updated_at": f.updated_at.isoformat() if isinstance(f.updated_at, datetime) else f.updated_at
            }
            for f in files
        ]
    }


@api_router.get("/projects/{project_id}/files/{path:path}/versions")
async def get_file_versions(
    project_id: str,
    path: str,
    user: User = Depends(get_current_user)
):
    """Get version history for a specific file."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    versions = await project_service.get_file_versions(project_id, path)
    
    return {
        "path": path,
        "versions": [v.model_dump() for v in versions]
    }


@api_router.get("/projects/{project_id}/generations")
async def get_generation_history(project_id: str, user: User = Depends(get_current_user)):
    """Get generation run history for a project."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    generations = await project_service.get_generation_history(project_id)
    
    return {
        "generations": [g.model_dump() for g in generations]
    }


@api_router.patch("/projects/{project_id}/generations/{run_id}")
async def update_generation_run(
    project_id: str,
    run_id: str,
    body: Dict[str, Any],
    user: User = Depends(get_current_user)
):
    """Update a generation run with results."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await project_service.update_generation_run(run_id, **body)
    
    # Update prompt result if provided
    if body.get("prompt_id") and body.get("change_summary"):
        await project_service.update_prompt_result(
            prompt_id=body["prompt_id"],
            run_id=run_id,
            change_summary=body["change_summary"],
            files_created=len(body.get("files_created", [])),
            files_updated=len(body.get("files_updated", [])),
            files_deleted=len(body.get("files_deleted", []))
        )
    
    return {"success": True}


@api_router.patch("/projects/{project_id}/architecture")
async def update_project_architecture(
    project_id: str,
    body: UpdateArchitectureBody,
    user: User = Depends(get_current_user)
):
    """Update project architecture summary and metadata."""
    updates = {}
    if body.architecture_summary is not None:
        updates["architecture_summary"] = body.architecture_summary
    if body.tech_stack is not None:
        updates["tech_stack"] = body.tech_stack
    if body.main_features is not None:
        updates["main_features"] = body.main_features
    
    if updates:
        project = await project_service.update_project(project_id, user.user_id, **updates)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        return {"success": True, "project": project.model_dump()}
    
    return {"success": True}


@api_router.get("/projects/{project_id}/activity")
async def get_project_activity(project_id: str, user: User = Depends(get_current_user)):
    """Get activity timeline for a project."""
    project = await project_service.get_project(project_id, user.user_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    activity = await project_service.get_activity_timeline(project_id)
    
    return {
        "activity": [a.model_dump() for a in activity]
    }


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: User = Depends(get_current_user)):
    """Soft delete a project."""
    success = await project_service.delete_project(project_id, user.user_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return {"success": True}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
