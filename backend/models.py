"""
ForJenta Persistent Project Models
Database schema for project-based AI builder with history and continuation support.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime, timezone
import uuid


def generate_id(prefix: str = "") -> str:
    """Generate a unique ID with optional prefix."""
    return f"{prefix}{uuid.uuid4().hex[:12]}"


def now_utc() -> datetime:
    """Get current UTC timestamp."""
    return datetime.now(timezone.utc)


# ═══════════════════════════════════════════════════════════════════
# ENUMS / TYPES
# ═══════════════════════════════════════════════════════════════════

PromptType = Literal[
    "create_initial",      # First prompt - create new project
    "add_feature",         # Add new feature to existing project
    "refine_feature",      # Modify/improve existing feature
    "redesign_ui",         # UI/UX changes
    "repair_bug",          # Fix a bug or error
    "refactor_code",       # Code cleanup/optimization
    "connect_backend",     # Add/modify backend/data connections
    "replace_file",        # Replace specific file(s)
    "full_rebuild",        # Explicit full rebuild request
    "other"                # Other/unclassified
]

GenerationStatus = Literal[
    "pending",
    "analyzing",
    "generating",
    "validating", 
    "complete",
    "failed",
    "cancelled"
]

FileChangeType = Literal[
    "created",
    "updated",
    "deleted",
    "renamed",
    "unchanged"
]

ProjectStatus = Literal[
    "active",
    "archived",
    "deleted"
]


# ═══════════════════════════════════════════════════════════════════
# PROJECT
# ═══════════════════════════════════════════════════════════════════

class Project(BaseModel):
    """Main project entity - persists across sessions."""
    project_id: str = Field(default_factory=lambda: generate_id("proj_"))
    user_id: str
    name: str
    description: Optional[str] = None
    
    # Initial prompt that created the project
    initial_prompt: str
    
    # Current state
    status: ProjectStatus = "active"
    current_file_count: int = 0
    current_route_count: int = 0
    
    # Architecture context (updated after each generation)
    architecture_summary: Optional[str] = None
    tech_stack: List[str] = Field(default_factory=list)
    main_features: List[str] = Field(default_factory=list)
    
    # Preview state
    last_preview_status: Optional[str] = None
    last_preview_error: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)
    last_generation_at: Optional[datetime] = None
    
    # Statistics
    total_prompts: int = 0
    total_generations: int = 0
    total_repairs: int = 0


# ═══════════════════════════════════════════════════════════════════
# PROJECT PROMPT (Conversation History)
# ═══════════════════════════════════════════════════════════════════

class ProjectPrompt(BaseModel):
    """Each prompt in a project's history."""
    prompt_id: str = Field(default_factory=lambda: generate_id("prompt_"))
    project_id: str
    user_id: str
    
    # Prompt content
    content: str
    prompt_type: PromptType = "other"
    
    # Classification metadata
    is_continuation: bool = True  # True = continue project, False = full rebuild
    targets_specific_files: bool = False
    targeted_files: List[str] = Field(default_factory=list)
    
    # Result reference
    generation_run_id: Optional[str] = None
    
    # Summary of what changed (filled after generation)
    change_summary: Optional[str] = None
    files_created: int = 0
    files_updated: int = 0
    files_deleted: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=now_utc)
    completed_at: Optional[datetime] = None
    
    # Sequence number in project
    sequence_number: int = 1


# ═══════════════════════════════════════════════════════════════════
# GENERATION RUN
# ═══════════════════════════════════════════════════════════════════

class GenerationRun(BaseModel):
    """A single generation execution."""
    run_id: str = Field(default_factory=lambda: generate_id("run_"))
    project_id: str
    user_id: str
    prompt_id: str
    
    # Run configuration
    is_full_rebuild: bool = False
    is_repair: bool = False
    
    # Context loaded before generation
    loaded_file_count: int = 0
    loaded_context_summary: Optional[str] = None
    
    # AI analysis
    prompt_classification: PromptType = "other"
    ai_plan_summary: Optional[str] = None
    impacted_files: List[str] = Field(default_factory=list)
    preserved_files: List[str] = Field(default_factory=list)
    
    # Status
    status: GenerationStatus = "pending"
    error_message: Optional[str] = None
    
    # Results
    files_created: List[str] = Field(default_factory=list)
    files_updated: List[str] = Field(default_factory=list)
    files_deleted: List[str] = Field(default_factory=list)
    
    # Validation
    preview_passed: Optional[bool] = None
    validation_errors: List[str] = Field(default_factory=list)
    
    # Timing
    started_at: datetime = Field(default_factory=now_utc)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    
    # Token usage
    tokens_used: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════
# GENERATION STEP
# ═══════════════════════════════════════════════════════════════════

class GenerationStep(BaseModel):
    """Individual step within a generation run."""
    step_id: str = Field(default_factory=lambda: generate_id("step_"))
    run_id: str
    project_id: str
    
    # Step info
    step_number: int
    step_type: str  # "analyze", "plan", "generate_file", "validate", "repair"
    step_name: str
    
    # Status
    status: GenerationStatus = "pending"
    error_message: Optional[str] = None
    
    # Details
    input_summary: Optional[str] = None
    output_summary: Optional[str] = None
    affected_files: List[str] = Field(default_factory=list)
    
    # Timing
    started_at: datetime = Field(default_factory=now_utc)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None


# ═══════════════════════════════════════════════════════════════════
# PROJECT FILE (Current State)
# ═══════════════════════════════════════════════════════════════════

class ProjectFile(BaseModel):
    """Current state of a file in the project."""
    file_id: str = Field(default_factory=lambda: generate_id("file_"))
    project_id: str
    
    # File info
    path: str
    content: str
    language: str = "text"
    
    # Metadata
    size_bytes: int = 0
    line_count: int = 0
    
    # History
    created_by_run_id: str
    last_updated_by_run_id: str
    version_number: int = 1
    
    # Timestamps
    created_at: datetime = Field(default_factory=now_utc)
    updated_at: datetime = Field(default_factory=now_utc)


# ═══════════════════════════════════════════════════════════════════
# FILE VERSION (History)
# ═══════════════════════════════════════════════════════════════════

class FileVersion(BaseModel):
    """Historical version of a file."""
    version_id: str = Field(default_factory=lambda: generate_id("ver_"))
    file_id: str
    project_id: str
    
    # File info
    path: str
    content: str
    
    # Version info
    version_number: int
    change_type: FileChangeType
    
    # What caused this version
    run_id: str
    prompt_id: str
    change_reason: Optional[str] = None
    
    # Diff info
    lines_added: int = 0
    lines_removed: int = 0
    
    # Flags
    is_repair: bool = False
    is_rollback: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=now_utc)


# ═══════════════════════════════════════════════════════════════════
# PROJECT ACTIVITY (Timeline)
# ═══════════════════════════════════════════════════════════════════

class ProjectActivity(BaseModel):
    """Activity log entry for project timeline."""
    activity_id: str = Field(default_factory=lambda: generate_id("act_"))
    project_id: str
    user_id: str
    
    # Activity info
    activity_type: str  # "prompt", "generation", "repair", "preview", "file_edit", "rollback"
    title: str
    description: Optional[str] = None
    
    # References
    prompt_id: Optional[str] = None
    run_id: Optional[str] = None
    file_id: Optional[str] = None
    
    # Result
    success: bool = True
    error_message: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=now_utc)


# ═══════════════════════════════════════════════════════════════════
# PREVIEW CHECK
# ═══════════════════════════════════════════════════════════════════

class PreviewCheck(BaseModel):
    """Preview/validation check result."""
    check_id: str = Field(default_factory=lambda: generate_id("check_"))
    project_id: str
    run_id: str
    
    # Check info
    check_type: str  # "syntax", "preview_render", "console_errors", "visual"
    
    # Result
    passed: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    
    # Details
    affected_files: List[str] = Field(default_factory=list)
    screenshot_url: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=now_utc)


# ═══════════════════════════════════════════════════════════════════
# REPAIR RECORD
# ═══════════════════════════════════════════════════════════════════

class RepairRecord(BaseModel):
    """Record of an automatic or manual repair."""
    repair_id: str = Field(default_factory=lambda: generate_id("repair_"))
    project_id: str
    run_id: str
    
    # Repair info
    repair_type: str  # "auto_fix", "manual_fix", "rollback", "regenerate"
    trigger: str  # "preview_error", "validation_error", "user_request"
    
    # What was repaired
    error_description: str
    affected_files: List[str] = Field(default_factory=list)
    
    # Result
    success: bool
    fix_description: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=now_utc)


# ═══════════════════════════════════════════════════════════════════
# REQUEST/RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════

class CreateProjectRequest(BaseModel):
    """Request to create a new project."""
    name: str
    prompt: str
    description: Optional[str] = None


class ContinueProjectRequest(BaseModel):
    """Request to continue an existing project."""
    project_id: str
    prompt: str
    force_rebuild: bool = False


class ProjectSummary(BaseModel):
    """Summary of a project for listing."""
    project_id: str
    name: str
    description: Optional[str]
    status: ProjectStatus
    current_file_count: int
    total_prompts: int
    last_generation_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    tech_stack: List[str]
    main_features: List[str]


class ProjectDetailResponse(BaseModel):
    """Full project details including history."""
    project: Project
    files: List[ProjectFile]
    prompts: List[ProjectPrompt]
    recent_activity: List[ProjectActivity]


class GenerationStatusResponse(BaseModel):
    """Real-time generation status."""
    run_id: str
    status: GenerationStatus
    current_step: Optional[str]
    progress_percent: int
    files_processed: int
    files_total: int
    error_message: Optional[str]
