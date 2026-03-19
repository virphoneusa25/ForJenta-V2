"""
ForJenta Project Service
Handles all project persistence, history, and continuation logic.
"""

from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from models import (
    Project, ProjectPrompt, GenerationRun, GenerationStep,
    ProjectFile, FileVersion, ProjectActivity, PreviewCheck, RepairRecord,
    PromptType, GenerationStatus, FileChangeType, ProjectStatus,
    generate_id, now_utc
)

logger = logging.getLogger(__name__)


class ProjectService:
    """Service for managing persistent projects."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    # ═══════════════════════════════════════════════════════════════
    # PROJECT CRUD
    # ═══════════════════════════════════════════════════════════════
    
    async def create_project(
        self,
        user_id: str,
        name: str,
        initial_prompt: str,
        description: Optional[str] = None
    ) -> Project:
        """Create a new project from initial prompt."""
        project = Project(
            user_id=user_id,
            name=name,
            description=description or initial_prompt[:200],
            initial_prompt=initial_prompt,
            total_prompts=1
        )
        
        doc = project.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        doc['updated_at'] = doc['updated_at'].isoformat()
        
        await self.db.projects.insert_one(doc)
        
        # Create initial prompt record
        await self.add_prompt(
            project_id=project.project_id,
            user_id=user_id,
            content=initial_prompt,
            prompt_type="create_initial",
            is_continuation=False,
            sequence_number=1
        )
        
        # Log activity
        await self.log_activity(
            project_id=project.project_id,
            user_id=user_id,
            activity_type="prompt",
            title="Project Created",
            description=f"Initial prompt: {initial_prompt[:100]}..."
        )
        
        logger.info(f"Created project {project.project_id} for user {user_id}")
        return project
    
    async def get_project(self, project_id: str, user_id: str) -> Optional[Project]:
        """Get a project by ID."""
        doc = await self.db.projects.find_one(
            {"project_id": project_id, "user_id": user_id, "status": {"$ne": "deleted"}},
            {"_id": 0}
        )
        if doc:
            return Project(**doc)
        return None
    
    async def get_user_projects(
        self,
        user_id: str,
        status: Optional[ProjectStatus] = None,
        limit: int = 50
    ) -> List[Project]:
        """Get all projects for a user."""
        query = {"user_id": user_id, "status": {"$ne": "deleted"}}
        if status:
            query["status"] = status
        
        cursor = self.db.projects.find(query, {"_id": 0}).sort("updated_at", -1).limit(limit)
        docs = await cursor.to_list(limit)
        return [Project(**doc) for doc in docs]
    
    async def update_project(
        self,
        project_id: str,
        user_id: str,
        **updates
    ) -> Optional[Project]:
        """Update project fields."""
        updates["updated_at"] = now_utc().isoformat()
        
        result = await self.db.projects.update_one(
            {"project_id": project_id, "user_id": user_id},
            {"$set": updates}
        )
        
        if result.modified_count > 0:
            return await self.get_project(project_id, user_id)
        return None
    
    async def delete_project(self, project_id: str, user_id: str) -> bool:
        """Soft delete a project."""
        result = await self.db.projects.update_one(
            {"project_id": project_id, "user_id": user_id},
            {"$set": {"status": "deleted", "updated_at": now_utc().isoformat()}}
        )
        return result.modified_count > 0
    
    # ═══════════════════════════════════════════════════════════════
    # PROMPT HISTORY
    # ═══════════════════════════════════════════════════════════════
    
    async def add_prompt(
        self,
        project_id: str,
        user_id: str,
        content: str,
        prompt_type: PromptType = "other",
        is_continuation: bool = True,
        sequence_number: int = 1,
        targeted_files: Optional[List[str]] = None
    ) -> ProjectPrompt:
        """Add a prompt to project history."""
        prompt = ProjectPrompt(
            project_id=project_id,
            user_id=user_id,
            content=content,
            prompt_type=prompt_type,
            is_continuation=is_continuation,
            targets_specific_files=bool(targeted_files),
            targeted_files=targeted_files or [],
            sequence_number=sequence_number
        )
        
        doc = prompt.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        if doc.get('completed_at'):
            doc['completed_at'] = doc['completed_at'].isoformat()
        
        await self.db.project_prompts.insert_one(doc)
        
        # Update project prompt count
        await self.db.projects.update_one(
            {"project_id": project_id},
            {"$inc": {"total_prompts": 1}, "$set": {"updated_at": now_utc().isoformat()}}
        )
        
        return prompt
    
    async def get_prompt_history(
        self,
        project_id: str,
        limit: int = 50
    ) -> List[ProjectPrompt]:
        """Get prompt history for a project."""
        cursor = self.db.project_prompts.find(
            {"project_id": project_id},
            {"_id": 0}
        ).sort("sequence_number", 1).limit(limit)
        
        docs = await cursor.to_list(limit)
        return [ProjectPrompt(**doc) for doc in docs]
    
    async def get_last_prompt(self, project_id: str) -> Optional[ProjectPrompt]:
        """Get the most recent prompt for a project."""
        doc = await self.db.project_prompts.find_one(
            {"project_id": project_id},
            {"_id": 0},
            sort=[("sequence_number", -1)]
        )
        if doc:
            return ProjectPrompt(**doc)
        return None
    
    async def update_prompt_result(
        self,
        prompt_id: str,
        run_id: str,
        change_summary: str,
        files_created: int = 0,
        files_updated: int = 0,
        files_deleted: int = 0
    ):
        """Update prompt with generation result."""
        await self.db.project_prompts.update_one(
            {"prompt_id": prompt_id},
            {"$set": {
                "generation_run_id": run_id,
                "change_summary": change_summary,
                "files_created": files_created,
                "files_updated": files_updated,
                "files_deleted": files_deleted,
                "completed_at": now_utc().isoformat()
            }}
        )
    
    # ═══════════════════════════════════════════════════════════════
    # GENERATION RUNS
    # ═══════════════════════════════════════════════════════════════
    
    async def create_generation_run(
        self,
        project_id: str,
        user_id: str,
        prompt_id: str,
        prompt_type: PromptType,
        is_full_rebuild: bool = False,
        is_repair: bool = False
    ) -> GenerationRun:
        """Create a new generation run."""
        run = GenerationRun(
            project_id=project_id,
            user_id=user_id,
            prompt_id=prompt_id,
            prompt_classification=prompt_type,
            is_full_rebuild=is_full_rebuild,
            is_repair=is_repair
        )
        
        doc = run.model_dump()
        doc['started_at'] = doc['started_at'].isoformat()
        
        await self.db.generation_runs.insert_one(doc)
        
        # Update project
        await self.db.projects.update_one(
            {"project_id": project_id},
            {
                "$inc": {"total_generations": 1},
                "$set": {"last_generation_at": now_utc().isoformat()}
            }
        )
        
        return run
    
    async def update_generation_run(
        self,
        run_id: str,
        **updates
    ):
        """Update generation run status and results."""
        if 'completed_at' in updates and updates['completed_at']:
            updates['completed_at'] = updates['completed_at'].isoformat()
        
        await self.db.generation_runs.update_one(
            {"run_id": run_id},
            {"$set": updates}
        )
    
    async def get_generation_run(self, run_id: str) -> Optional[GenerationRun]:
        """Get a generation run."""
        doc = await self.db.generation_runs.find_one({"run_id": run_id}, {"_id": 0})
        if doc:
            return GenerationRun(**doc)
        return None
    
    async def get_generation_history(
        self,
        project_id: str,
        limit: int = 20
    ) -> List[GenerationRun]:
        """Get generation history for a project."""
        cursor = self.db.generation_runs.find(
            {"project_id": project_id},
            {"_id": 0}
        ).sort("started_at", -1).limit(limit)
        
        docs = await cursor.to_list(limit)
        return [GenerationRun(**doc) for doc in docs]
    
    # ═══════════════════════════════════════════════════════════════
    # PROJECT FILES
    # ═══════════════════════════════════════════════════════════════
    
    async def save_file(
        self,
        project_id: str,
        path: str,
        content: str,
        language: str,
        run_id: str,
        prompt_id: str,
        change_reason: Optional[str] = None
    ) -> Tuple[ProjectFile, FileChangeType]:
        """Save or update a project file, creating version history."""
        
        # Check if file exists
        existing = await self.db.project_files.find_one(
            {"project_id": project_id, "path": path},
            {"_id": 0}
        )
        
        change_type: FileChangeType = "created"
        version_number = 1
        
        if existing:
            # File exists - update it
            change_type = "updated"
            version_number = existing.get("version_number", 1) + 1
            
            # Save old version to history
            await self.save_file_version(
                file_id=existing["file_id"],
                project_id=project_id,
                path=path,
                content=existing["content"],
                version_number=existing.get("version_number", 1),
                change_type="updated",
                run_id=run_id,
                prompt_id=prompt_id,
                change_reason=change_reason
            )
            
            # Update current file
            await self.db.project_files.update_one(
                {"project_id": project_id, "path": path},
                {"$set": {
                    "content": content,
                    "language": language,
                    "size_bytes": len(content.encode('utf-8')),
                    "line_count": content.count('\n') + 1,
                    "last_updated_by_run_id": run_id,
                    "version_number": version_number,
                    "updated_at": now_utc().isoformat()
                }}
            )
            
            file = ProjectFile(
                file_id=existing["file_id"],
                project_id=project_id,
                path=path,
                content=content,
                language=language,
                size_bytes=len(content.encode('utf-8')),
                line_count=content.count('\n') + 1,
                created_by_run_id=existing["created_by_run_id"],
                last_updated_by_run_id=run_id,
                version_number=version_number
            )
        else:
            # New file
            file = ProjectFile(
                project_id=project_id,
                path=path,
                content=content,
                language=language,
                size_bytes=len(content.encode('utf-8')),
                line_count=content.count('\n') + 1,
                created_by_run_id=run_id,
                last_updated_by_run_id=run_id,
                version_number=1
            )
            
            doc = file.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            doc['updated_at'] = doc['updated_at'].isoformat()
            
            await self.db.project_files.insert_one(doc)
            
            # Save initial version
            await self.save_file_version(
                file_id=file.file_id,
                project_id=project_id,
                path=path,
                content=content,
                version_number=1,
                change_type="created",
                run_id=run_id,
                prompt_id=prompt_id,
                change_reason=change_reason or "Initial creation"
            )
        
        # Update project file count
        file_count = await self.db.project_files.count_documents({"project_id": project_id})
        await self.db.projects.update_one(
            {"project_id": project_id},
            {"$set": {"current_file_count": file_count}}
        )
        
        return file, change_type
    
    async def get_project_files(
        self,
        project_id: str,
        paths: Optional[List[str]] = None
    ) -> List[ProjectFile]:
        """Get current files for a project."""
        query = {"project_id": project_id}
        if paths:
            query["path"] = {"$in": paths}
        
        cursor = self.db.project_files.find(query, {"_id": 0})
        docs = await cursor.to_list(1000)
        return [ProjectFile(**doc) for doc in docs]
    
    async def delete_file(
        self,
        project_id: str,
        path: str,
        run_id: str,
        prompt_id: str
    ) -> bool:
        """Delete a file (with version history)."""
        existing = await self.db.project_files.find_one(
            {"project_id": project_id, "path": path},
            {"_id": 0}
        )
        
        if existing:
            # Save deletion to history
            await self.save_file_version(
                file_id=existing["file_id"],
                project_id=project_id,
                path=path,
                content=existing["content"],
                version_number=existing.get("version_number", 1) + 1,
                change_type="deleted",
                run_id=run_id,
                prompt_id=prompt_id,
                change_reason="File deleted"
            )
            
            await self.db.project_files.delete_one(
                {"project_id": project_id, "path": path}
            )
            return True
        return False
    
    # ═══════════════════════════════════════════════════════════════
    # FILE VERSIONS
    # ═══════════════════════════════════════════════════════════════
    
    async def save_file_version(
        self,
        file_id: str,
        project_id: str,
        path: str,
        content: str,
        version_number: int,
        change_type: FileChangeType,
        run_id: str,
        prompt_id: str,
        change_reason: Optional[str] = None,
        is_repair: bool = False
    ) -> FileVersion:
        """Save a file version to history."""
        version = FileVersion(
            file_id=file_id,
            project_id=project_id,
            path=path,
            content=content,
            version_number=version_number,
            change_type=change_type,
            run_id=run_id,
            prompt_id=prompt_id,
            change_reason=change_reason,
            is_repair=is_repair
        )
        
        doc = version.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await self.db.file_versions.insert_one(doc)
        return version
    
    async def get_file_versions(
        self,
        project_id: str,
        path: str,
        limit: int = 20
    ) -> List[FileVersion]:
        """Get version history for a file."""
        cursor = self.db.file_versions.find(
            {"project_id": project_id, "path": path},
            {"_id": 0}
        ).sort("version_number", -1).limit(limit)
        
        docs = await cursor.to_list(limit)
        return [FileVersion(**doc) for doc in docs]
    
    # ═══════════════════════════════════════════════════════════════
    # PROJECT CONTEXT (for continuation)
    # ═══════════════════════════════════════════════════════════════
    
    async def load_project_context(self, project_id: str, user_id: str) -> Dict[str, Any]:
        """
        Load full project context for continuation.
        This is what the generator needs before processing a new prompt.
        """
        project = await self.get_project(project_id, user_id)
        if not project:
            return None
        
        # Get current files
        files = await self.get_project_files(project_id)
        
        # Get prompt history
        prompts = await self.get_prompt_history(project_id, limit=20)
        
        # Get last generation
        generations = await self.get_generation_history(project_id, limit=5)
        
        # Build file tree structure
        file_tree = {}
        for f in files:
            parts = f.path.split('/')
            current = file_tree
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]
            current[parts[-1]] = {"type": "file", "language": f.language}
        
        # Extract routes/pages from files
        routes = []
        components = []
        for f in files:
            if '/pages/' in f.path or f.path.startswith('pages/'):
                routes.append(f.path)
            elif '/components/' in f.path or f.path.startswith('components/'):
                components.append(f.path)
        
        return {
            "project": project.model_dump(),
            "files": [f.model_dump() for f in files],
            "file_tree": file_tree,
            "file_paths": [f.path for f in files],
            "routes": routes,
            "components": components,
            "prompt_history": [p.model_dump() for p in prompts],
            "last_prompt": prompts[-1].model_dump() if prompts else None,
            "generation_history": [g.model_dump() for g in generations],
            "last_generation": generations[0].model_dump() if generations else None,
            "architecture_summary": project.architecture_summary,
            "tech_stack": project.tech_stack,
            "main_features": project.main_features
        }
    
    # ═══════════════════════════════════════════════════════════════
    # ACTIVITY LOG
    # ═══════════════════════════════════════════════════════════════
    
    async def log_activity(
        self,
        project_id: str,
        user_id: str,
        activity_type: str,
        title: str,
        description: Optional[str] = None,
        prompt_id: Optional[str] = None,
        run_id: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ) -> ProjectActivity:
        """Log activity to project timeline."""
        activity = ProjectActivity(
            project_id=project_id,
            user_id=user_id,
            activity_type=activity_type,
            title=title,
            description=description,
            prompt_id=prompt_id,
            run_id=run_id,
            success=success,
            error_message=error_message
        )
        
        doc = activity.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await self.db.project_activity.insert_one(doc)
        return activity
    
    async def get_activity_timeline(
        self,
        project_id: str,
        limit: int = 50
    ) -> List[ProjectActivity]:
        """Get activity timeline for a project."""
        cursor = self.db.project_activity.find(
            {"project_id": project_id},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        docs = await cursor.to_list(limit)
        return [ProjectActivity(**doc) for doc in docs]
    
    # ═══════════════════════════════════════════════════════════════
    # PROMPT CLASSIFICATION
    # ═══════════════════════════════════════════════════════════════
    
    def classify_prompt(
        self,
        prompt: str,
        has_existing_files: bool,
        existing_file_paths: List[str]
    ) -> Tuple[PromptType, bool, List[str]]:
        """
        Classify a prompt to determine how to handle it.
        Returns: (prompt_type, is_full_rebuild, targeted_files)
        """
        prompt_lower = prompt.lower()
        
        # Check for explicit rebuild requests
        rebuild_keywords = [
            "rebuild from scratch",
            "start over",
            "replace the project",
            "create a new project",
            "regenerate everything",
            "full rebuild",
            "completely redo"
        ]
        
        for keyword in rebuild_keywords:
            if keyword in prompt_lower:
                return ("full_rebuild", True, [])
        
        # If no existing files, this is initial creation
        if not has_existing_files:
            return ("create_initial", False, [])
        
        # Check for specific file targeting
        targeted_files = []
        for path in existing_file_paths:
            filename = path.split('/')[-1]
            if filename.lower() in prompt_lower or path.lower() in prompt_lower:
                targeted_files.append(path)
        
        # Classify by intent
        if any(kw in prompt_lower for kw in ["fix", "repair", "bug", "error", "broken", "not working"]):
            return ("repair_bug", False, targeted_files)
        
        if any(kw in prompt_lower for kw in ["add", "new feature", "implement", "create a", "add a"]):
            return ("add_feature", False, targeted_files)
        
        if any(kw in prompt_lower for kw in ["change", "modify", "update", "improve", "enhance", "refine"]):
            return ("refine_feature", False, targeted_files)
        
        if any(kw in prompt_lower for kw in ["redesign", "restyle", "ui", "ux", "look", "appearance", "theme"]):
            return ("redesign_ui", False, targeted_files)
        
        if any(kw in prompt_lower for kw in ["refactor", "clean up", "optimize", "reorganize"]):
            return ("refactor_code", False, targeted_files)
        
        if any(kw in prompt_lower for kw in ["backend", "api", "database", "connect", "integrate"]):
            return ("connect_backend", False, targeted_files)
        
        if any(kw in prompt_lower for kw in ["replace", "rewrite"]) and targeted_files:
            return ("replace_file", False, targeted_files)
        
        # Default to refine feature for continuation
        return ("refine_feature", False, targeted_files)
