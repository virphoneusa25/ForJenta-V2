"""
Backend API tests for ForJenta - testing with authentication
Tests critical flows fixed in this iteration:
- /api/generate-code endpoint (no auth required)
- /api/projects with auth token
- /api/projects/{id}/prompts continuation
- Status endpoints
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://prompt-persist-fix.preview.emergentagent.com').rstrip('/')
AUTH_TOKEN = "test-session-8ee31486befa493f"

class TestStatusEndpoints:
    """Test /api/status endpoints - no auth required"""
    
    def test_get_status_returns_200(self):
        """GET /api/status returns 200 OK"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Status should return a list"
        print(f"PASS: GET /api/status returned {len(data)} records")
    
    def test_api_root(self):
        """GET /api/ returns version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASS: GET /api/ returned: {data['message']}")


class TestGenerateCodeEndpoint:
    """Test /api/generate-code - the critical fixed endpoint (no auth required)"""
    
    def test_generate_code_simple_prompt(self):
        """POST /api/generate-code generates valid code files"""
        response = requests.post(
            f"{BASE_URL}/api/generate-code",
            json={
                "prompt": "Create a hello world page with a heading and paragraph",
                "categories": ["Web"],
                "context": "",
                "mode": "full"
            },
            timeout=60  # Generation can take 10-30 seconds
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text[:500]}"
        data = response.json()
        
        # Validate response structure
        assert data.get("success") == True, f"Generation failed: {data.get('error')}"
        assert "files" in data, "Response missing 'files' array"
        assert isinstance(data["files"], list), "Files should be an array"
        assert len(data["files"]) > 0, "Should have at least one file"
        
        # Validate file structure
        for f in data["files"]:
            assert "path" in f, f"File missing 'path': {f}"
            assert "content" in f, f"File missing 'content': {f}"
            assert "language" in f, f"File missing 'language': {f}"
            assert len(f["content"]) > 0, f"File content is empty: {f['path']}"
        
        print(f"PASS: /api/generate-code generated {len(data['files'])} files: {[f['path'] for f in data['files']]}")
    
    def test_generate_code_continuation_mode(self):
        """POST /api/generate-code works with continuation mode"""
        context = """
=== EXISTING PROJECT CONTEXT ===
Project: my-app
Files:
- index.html
- styles.css

=== index.html ===
<!DOCTYPE html><html><body><h1>Hello</h1></body></html>
"""
        response = requests.post(
            f"{BASE_URL}/api/generate-code",
            json={
                "prompt": "Add a button that says Click Me",
                "categories": ["Web"],
                "context": context,
                "mode": "continuation"
            },
            timeout=60
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True, f"Generation failed: {data.get('error')}"
        print(f"PASS: /api/generate-code continuation mode generated {len(data.get('files', []))} files")


class TestAuthenticatedProjectsAPI:
    """Test project endpoints WITH authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Setup session with auth header"""
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {AUTH_TOKEN}",
            "Content-Type": "application/json"
        })
    
    def test_auth_me_with_token(self):
        """GET /api/auth/me returns user info with valid token"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"Auth failed: {response.text}"
        data = response.json()
        
        assert "user_id" in data, "Missing user_id"
        assert "email" in data, "Missing email"
        assert data["email"] == "rmcknight@virphoneusa.com"
        print(f"PASS: GET /api/auth/me returned user: {data['email']}")
    
    def test_list_projects_with_auth(self):
        """GET /api/projects returns projects for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Projects fetch failed: {response.text}"
        data = response.json()
        
        assert "projects" in data, "Missing 'projects' key"
        assert isinstance(data["projects"], list)
        
        if len(data["projects"]) > 0:
            project = data["projects"][0]
            assert "project_id" in project
            assert "name" in project
            assert "status" in project
        
        print(f"PASS: GET /api/projects returned {len(data['projects'])} projects")
        return data["projects"]
    
    def test_create_project_with_auth(self):
        """POST /api/projects creates a new project"""
        project_name = f"TEST_test-project-{int(time.time())}"
        response = self.session.post(
            f"{BASE_URL}/api/projects",
            json={
                "name": project_name,
                "prompt": "Test project creation",
                "description": "Testing project creation API"
            }
        )
        assert response.status_code == 200, f"Project creation failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "project" in data
        assert data["project"]["name"] == project_name
        
        project_id = data["project"]["project_id"]
        print(f"PASS: POST /api/projects created project: {project_id}")
        return project_id
    
    def test_get_project_by_id(self):
        """GET /api/projects/{id} returns full project details"""
        # First get list of projects
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        projects = projects_response.json().get("projects", [])
        
        if len(projects) == 0:
            pytest.skip("No projects available to test")
        
        project_id = projects[0]["project_id"]
        response = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
        assert response.status_code == 200, f"Get project failed: {response.text}"
        data = response.json()
        
        assert "project" in data
        assert "files" in data
        assert "prompts" in data
        assert data["project"]["project_id"] == project_id
        
        print(f"PASS: GET /api/projects/{project_id} returned {len(data['files'])} files, {len(data['prompts'])} prompts")
    
    def test_add_prompt_to_project(self):
        """POST /api/projects/{id}/prompts adds continuation prompt"""
        # Get existing projects
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        projects = projects_response.json().get("projects", [])
        
        if len(projects) == 0:
            pytest.skip("No projects available to test")
        
        project_id = projects[0]["project_id"]
        response = self.session.post(
            f"{BASE_URL}/api/projects/{project_id}/prompts",
            json={
                "prompt": "Add a footer to the page",
                "force_rebuild": False
            }
        )
        assert response.status_code == 200, f"Add prompt failed: {response.text}"
        data = response.json()
        
        assert data.get("success") == True
        assert "prompt" in data
        assert "run" in data
        assert "classification" in data
        
        print(f"PASS: POST /api/projects/{project_id}/prompts created prompt and run")
        print(f"  Classification: {data['classification']}")
    
    def test_get_project_files(self):
        """GET /api/projects/{id}/files returns project files"""
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        projects = projects_response.json().get("projects", [])
        
        if len(projects) == 0:
            pytest.skip("No projects available to test")
        
        # Find project with files
        project_with_files = None
        for p in projects:
            if p.get("current_file_count", 0) > 0:
                project_with_files = p
                break
        
        if not project_with_files:
            pytest.skip("No project with files available")
        
        project_id = project_with_files["project_id"]
        response = self.session.get(f"{BASE_URL}/api/projects/{project_id}/files")
        assert response.status_code == 200
        data = response.json()
        
        assert "files" in data
        assert len(data["files"]) > 0
        
        for f in data["files"]:
            assert "path" in f
            assert "content" in f
        
        print(f"PASS: GET /api/projects/{project_id}/files returned {len(data['files'])} files")


class TestProjectWorkflow:
    """Test complete project workflow: create -> generate -> save -> continue"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {AUTH_TOKEN}",
            "Content-Type": "application/json"
        })
    
    def test_complete_workflow(self):
        """Test: Create project -> Add prompt -> Generate code -> Verify files exist"""
        # Step 1: Create project
        project_name = f"TEST_workflow-{int(time.time())}"
        create_resp = self.session.post(
            f"{BASE_URL}/api/projects",
            json={
                "name": project_name,
                "prompt": "Create a counter app",
                "description": "A simple counter app"
            }
        )
        assert create_resp.status_code == 200
        project_id = create_resp.json()["project"]["project_id"]
        print(f"Step 1: Created project {project_id}")
        
        # Step 2: Add continuation prompt
        prompt_resp = self.session.post(
            f"{BASE_URL}/api/projects/{project_id}/prompts",
            json={"prompt": "Add dark mode support", "force_rebuild": False}
        )
        assert prompt_resp.status_code == 200
        run_id = prompt_resp.json()["run"]["run_id"]
        prompt_id = prompt_resp.json()["prompt"]["prompt_id"]
        print(f"Step 2: Added prompt, got run_id: {run_id}")
        
        # Step 3: Generate code (separate endpoint, no auth)
        gen_resp = requests.post(
            f"{BASE_URL}/api/generate-code",
            json={
                "prompt": "Create a simple counter with increment/decrement buttons",
                "categories": ["Web"],
                "context": "",
                "mode": "full"
            },
            timeout=60
        )
        assert gen_resp.status_code == 200
        files = gen_resp.json().get("files", [])
        assert len(files) > 0, "No files generated"
        print(f"Step 3: Generated {len(files)} files")
        
        # Step 4: Save files to project
        save_resp = self.session.post(
            f"{BASE_URL}/api/projects/{project_id}/files",
            json={
                "files": files,
                "run_id": run_id,
                "prompt_id": prompt_id,
                "change_reason": "Initial generation"
            }
        )
        assert save_resp.status_code == 200
        save_data = save_resp.json()
        assert save_data.get("success") == True
        print(f"Step 4: Saved files - created: {len(save_data['results']['created'])}, updated: {len(save_data['results']['updated'])}")
        
        # Step 5: Verify files exist
        files_resp = self.session.get(f"{BASE_URL}/api/projects/{project_id}/files")
        assert files_resp.status_code == 200
        saved_files = files_resp.json().get("files", [])
        assert len(saved_files) > 0, "No files found after saving"
        print(f"Step 5: Verified {len(saved_files)} files in project")
        
        print(f"\nPASS: Complete workflow test succeeded for project {project_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
