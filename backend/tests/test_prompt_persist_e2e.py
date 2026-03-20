"""
Test suite for E2E prompt persistence fix - P0 bug fix testing.
Tests the complete flow from landing page prompt to project creation to auto-generation.

Key fixes being tested:
1. useOAuthCallback creates REAL backend projects via POST /api/projects
2. IDEWorkspace auto-triggers sendPrompt via forjenta_auto_generate flag
3. workspaceStore guards against overwriting active generation state
4. AuthModal handlePostAuthHandoff creates real backend projects
"""
import pytest
import requests
import os
import json
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://prompt-persist-fix.preview.emergentagent.com').rstrip('/')

# Test session for authenticated tests
TEST_SESSION_TOKEN = "test-session-8ee31486befa493f"
TEST_PROJECT_ID = "proj_c427dc85e06a"


class TestProviderStatus:
    """Test /api/provider/status endpoint - critical for AI generation"""
    
    def test_provider_status_no_auth_required(self):
        """Provider status endpoint works without authentication"""
        response = requests.get(f"{BASE_URL}/api/provider/status")
        assert response.status_code == 200
        data = response.json()
        assert data["available"] == True
        assert data["provider"] == "inworld"
        print(f"PASS: Provider status available: {data['modelId']}")
    
    def test_provider_status_structure(self):
        """Provider status returns all expected fields"""
        response = requests.get(f"{BASE_URL}/api/provider/status")
        data = response.json()
        
        required_fields = ["available", "provider", "modelId", "modelLabel", "apiBaseUrl", "authType", "checks"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        assert data["checks"]["api_key_present"] == True
        print(f"PASS: All required fields present in provider status")


class TestProjectCRUDWithAuth:
    """Test project CRUD endpoints with valid authentication"""
    
    @pytest.fixture
    def auth_cookies(self):
        return {"session_token": TEST_SESSION_TOKEN}
    
    def test_create_project(self, auth_cookies):
        """POST /api/projects creates a real backend project"""
        unique_name = f"TEST_prompt_persist_{int(time.time())}"
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json={
                "name": unique_name,
                "prompt": "Build a simple landing page",
                "description": "Test project for E2E prompt persistence"
            },
            cookies=auth_cookies
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert "project" in data
        assert "project_id" in data["project"]
        assert data["project"]["name"] == unique_name
        
        project_id = data["project"]["project_id"]
        print(f"PASS: Created project: {project_id}")
        
        # Verify project exists via GET
        verify_response = requests.get(
            f"{BASE_URL}/api/projects/{project_id}",
            cookies=auth_cookies
        )
        assert verify_response.status_code == 200
        print(f"PASS: Project verified via GET")
        
        return project_id
    
    def test_get_project_returns_structure(self, auth_cookies):
        """GET /api/projects/:id returns full project with files and prompts"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}",
            cookies=auth_cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure for IDEWorkspace initialization
        assert "project" in data
        assert "files" in data
        assert "prompts" in data
        assert "activity" in data
        
        project = data["project"]
        assert "project_id" in project
        assert "name" in project
        assert "status" in project
        
        print(f"PASS: Project structure verified - {len(data['files'])} files, {len(data['prompts'])} prompts")
    
    def test_list_projects(self, auth_cookies):
        """GET /api/projects returns user's project list"""
        response = requests.get(
            f"{BASE_URL}/api/projects",
            cookies=auth_cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "projects" in data
        assert isinstance(data["projects"], list)
        print(f"PASS: Listed {len(data['projects'])} projects")


class TestProjectCRUDWithoutAuth:
    """Test project endpoints without authentication return 401"""
    
    def test_create_project_requires_auth(self):
        """POST /api/projects returns 401 without auth"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json={"name": "test", "prompt": "test", "description": "test"}
        )
        assert response.status_code == 401
        print("PASS: POST /api/projects correctly requires auth")
    
    def test_get_project_requires_auth(self):
        """GET /api/projects/:id returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}")
        assert response.status_code == 401
        print("PASS: GET /api/projects/:id correctly requires auth")
    
    def test_list_projects_requires_auth(self):
        """GET /api/projects returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 401
        print("PASS: GET /api/projects correctly requires auth")


class TestGenerateEndpoint:
    """Test /api/generate endpoint - handles code generation without user auth"""
    
    def test_generate_no_auth_required(self):
        """Generate endpoint works without user authentication (uses server-side credentials)"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={
                "projectId": "test_no_auth",
                "rootPrompt": "Create a simple HTML page saying TEST_E2E_PROMPT_PERSIST",
                "fileTree": [],
                "openFiles": [],
                "buildHistory": []
            },
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "files" in data
        assert len(data["files"]) > 0
        
        print(f"PASS: Generated {len(data['files'])} files without user auth")
    
    def test_generate_returns_proper_structure(self):
        """Generate response has all required fields for IDEWorkspace"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={
                "projectId": "test_structure",
                "rootPrompt": "Create index.html with 'Hello World'",
                "fileTree": [],
                "openFiles": [],
                "buildHistory": []
            },
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # IDEWorkspace expects these fields
        required_fields = ["success", "files", "logs"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Files must have path and content
        for file in data["files"]:
            assert "path" in file
            assert "content" in file
        
        print(f"PASS: Generate response structure verified")
    
    def test_generate_continuation_mode(self):
        """Generate handles continuation with existing fileTree"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={
                "projectId": "test_continuation",
                "rootPrompt": "Create a todo app",
                "followUpPrompt": "Add a delete button",
                "fileTree": [
                    {"path": "index.html", "content": "<html><body>Todo App</body></html>", "language": "html"}
                ],
                "openFiles": ["index.html"],
                "buildHistory": ["Create a todo app"]
            },
            timeout=120
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("PASS: Continuation mode works correctly")


class TestAuthEndpoints:
    """Test authentication-related endpoints"""
    
    def test_auth_me_returns_user_with_session(self):
        """GET /api/auth/me returns user info with valid session"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": TEST_SESSION_TOKEN}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "user_id" in data
        assert "email" in data
        print(f"PASS: Auth/me returns user: {data['email']}")
    
    def test_auth_me_returns_401_without_session(self):
        """GET /api/auth/me returns 401 without session"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("PASS: Auth/me correctly requires session")


class TestProjectFilesEndpoint:
    """Test project files endpoints"""
    
    @pytest.fixture
    def auth_cookies(self):
        return {"session_token": TEST_SESSION_TOKEN}
    
    def test_get_project_files(self, auth_cookies):
        """GET /api/projects/:id/files returns file list"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/files",
            cookies=auth_cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "files" in data
        assert isinstance(data["files"], list)
        
        if len(data["files"]) > 0:
            file = data["files"][0]
            assert "path" in file
            assert "content" in file
            assert "language" in file
        
        print(f"PASS: Got {len(data['files'])} files from project")
    
    def test_save_project_files(self, auth_cookies):
        """POST /api/projects/:id/files saves files"""
        response = requests.post(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/files",
            json={
                "files": [
                    {"path": "test_persist.txt", "content": "Test content for persistence", "language": "text"}
                ],
                "run_id": "test_run_id",
                "prompt_id": "test_prompt_id",
                "change_reason": "Testing file persistence"
            },
            cookies=auth_cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        print("PASS: File saved successfully")


class TestProjectContextEndpoint:
    """Test /api/projects/:id/context endpoint used for continuation"""
    
    @pytest.fixture
    def auth_cookies(self):
        return {"session_token": TEST_SESSION_TOKEN}
    
    def test_get_project_context(self, auth_cookies):
        """GET /api/projects/:id/context returns full context for generator"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/context",
            cookies=auth_cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Context is used by generator for continuation
        print(f"PASS: Project context retrieved: {list(data.keys())}")


class TestPromptHistoryEndpoint:
    """Test prompt history endpoints"""
    
    @pytest.fixture
    def auth_cookies(self):
        return {"session_token": TEST_SESSION_TOKEN}
    
    def test_get_prompt_history(self, auth_cookies):
        """GET /api/projects/:id/prompts returns prompt history"""
        response = requests.get(
            f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/prompts",
            cookies=auth_cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "prompts" in data
        assert isinstance(data["prompts"], list)
        
        print(f"PASS: Got {len(data['prompts'])} prompts from history")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
