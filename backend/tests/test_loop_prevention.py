"""
Test suite for loop prevention and generation state management.
Tests backend APIs used by the frontend for generation workflow.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://prompt-persist-fix.preview.emergentagent.com').rstrip('/')

# Use localhost for direct backend access
BACKEND_URL = "http://localhost:8001"


class TestProviderStatus:
    """Test /api/provider/status endpoint - should return provider config once"""
    
    def test_provider_status_returns_200(self):
        """Provider status endpoint returns successful response"""
        response = requests.get(f"{BACKEND_URL}/api/provider/status")
        assert response.status_code == 200
        print(f"Provider status: {response.status_code}")
    
    def test_provider_status_structure(self):
        """Provider status returns expected structure"""
        response = requests.get(f"{BACKEND_URL}/api/provider/status")
        data = response.json()
        
        # Verify expected fields
        assert "available" in data
        assert "provider" in data
        assert "modelId" in data
        assert data["available"] == True
        assert data["provider"] == "inworld"
        print(f"Provider: {data['provider']}, Model: {data['modelId']}, Available: {data['available']}")
    
    def test_provider_status_idempotent(self):
        """Multiple calls to provider status return same result (idempotent)"""
        responses = []
        for i in range(3):
            response = requests.get(f"{BACKEND_URL}/api/provider/status")
            responses.append(response.json())
        
        # All responses should be identical
        assert all(r["available"] == responses[0]["available"] for r in responses)
        assert all(r["modelId"] == responses[0]["modelId"] for r in responses)
        print(f"Provider status is idempotent across {len(responses)} calls")


class TestGenerateEndpoint:
    """Test /api/generate endpoint - main generation API"""
    
    def test_generate_requires_prompt(self):
        """Generate endpoint requires rootPrompt"""
        response = requests.post(
            f"{BACKEND_URL}/api/generate",
            json={"projectId": "test_proj", "fileTree": [], "openFiles": [], "buildHistory": []}
        )
        # Should return 422 for missing required field or 400 for bad request
        assert response.status_code in [400, 422]
        print(f"Missing prompt returns: {response.status_code}")
    
    def test_generate_basic_request(self):
        """Generate endpoint accepts valid request and returns files"""
        response = requests.post(
            f"{BACKEND_URL}/api/generate",
            json={
                "projectId": "test_proj_loop",
                "rootPrompt": "Create a simple HTML page with text TEST_BACKEND_LOOP_CHECK",
                "fileTree": [],
                "openFiles": [],
                "buildHistory": []
            },
            timeout=120  # Generation can take up to 2 minutes
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "success" in data
        assert data["success"] == True
        assert "files" in data
        assert len(data["files"]) > 0
        
        # Verify file structure
        file = data["files"][0]
        assert "path" in file
        assert "content" in file
        print(f"Generated {len(data['files'])} files successfully")
    
    def test_generate_with_continuation(self):
        """Generate endpoint handles continuation with existing fileTree"""
        # First generate initial file
        initial_response = requests.post(
            f"{BACKEND_URL}/api/generate",
            json={
                "projectId": "test_proj_continuation",
                "rootPrompt": "Create index.html with hello world",
                "fileTree": [],
                "openFiles": [],
                "buildHistory": []
            },
            timeout=120
        )
        
        assert initial_response.status_code == 200
        initial_data = initial_response.json()
        
        # Now do continuation with existing file
        continuation_response = requests.post(
            f"{BACKEND_URL}/api/generate",
            json={
                "projectId": "test_proj_continuation",
                "rootPrompt": "Create index.html with hello world",
                "followUpPrompt": "Add a red background",
                "fileTree": [{"path": "index.html", "content": "<html><body>Hello</body></html>", "language": "html"}],
                "openFiles": ["index.html"],
                "buildHistory": ["Create index.html with hello world"]
            },
            timeout=120
        )
        
        assert continuation_response.status_code == 200
        continuation_data = continuation_response.json()
        assert continuation_data["success"] == True
        print("Continuation request succeeded")


class TestProjectEndpoint:
    """Test /api/projects/:id endpoint - project data loading"""
    
    def test_project_returns_data_with_session(self):
        """Project endpoint returns data with valid session"""
        # Use test session token
        cookies = {"session_token": "test-session-8ee31486befa493f"}
        response = requests.get(
            f"{BACKEND_URL}/api/projects/proj_c427dc85e06a",
            cookies=cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "project" in data
        assert "files" in data
        assert "prompts" in data
        
        # Verify project data
        project = data["project"]
        assert "project_id" in project
        assert project["project_id"] == "proj_c427dc85e06a"
        
        print(f"Project loaded: {project.get('name', 'Unknown')} with {len(data['files'])} files")
    
    def test_project_returns_401_without_session(self):
        """Project endpoint returns 401 without session"""
        response = requests.get(f"{BACKEND_URL}/api/projects/proj_c427dc85e06a")
        assert response.status_code == 401
        print("Project endpoint correctly requires authentication")


class TestConcurrencyPrevention:
    """Test that backend handles rapid requests gracefully"""
    
    def test_rapid_provider_status_calls(self):
        """Rapid provider status calls don't cause issues"""
        import concurrent.futures
        
        def make_request():
            return requests.get(f"{BACKEND_URL}/api/provider/status")
        
        # Make 5 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(5)]
            responses = [f.result() for f in concurrent.futures.as_completed(futures)]
        
        # All should succeed
        assert all(r.status_code == 200 for r in responses)
        print(f"All {len(responses)} concurrent requests succeeded")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
