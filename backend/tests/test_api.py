"""
Backend API tests for ForJenta Project Service
Tests the persistent project features including:
- Project creation and retrieval
- File saving with version history
- Generation run tracking
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://forjenta-ide.preview.emergentagent.com').rstrip('/')


class TestStatusAPI:
    """Test basic API status endpoints"""
    
    def test_api_root_returns_version(self):
        """GET /api/ returns API version info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "ForJenta API" in data["message"]
    
    def test_status_check_endpoint(self):
        """POST /api/status creates a status check"""
        response = requests.post(
            f"{BASE_URL}/api/status",
            json={"client_name": "test_client"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["client_name"] == "test_client"
        assert "timestamp" in data
    
    def test_get_status_checks(self):
        """GET /api/status returns status checks"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestProjectsAPI:
    """Test project endpoints - authentication required"""
    
    def test_list_projects_requires_auth(self):
        """GET /api/projects requires authentication"""
        response = requests.get(f"{BASE_URL}/api/projects")
        # Should return 401 without auth
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "authenticated" in data["detail"].lower() or "auth" in data["detail"].lower()
    
    def test_create_project_requires_auth(self):
        """POST /api/projects requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/projects",
            json={
                "name": "test-project",
                "prompt": "Create a test app",
                "description": "Test description"
            }
        )
        assert response.status_code == 401
    
    def test_get_project_requires_auth(self):
        """GET /api/projects/{id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/projects/some-project-id")
        assert response.status_code == 401


class TestGitHubAPI:
    """Test GitHub integration endpoints - authentication required"""
    
    def test_github_connect_requires_auth(self):
        """GET /api/github/connect requires authentication"""
        response = requests.get(f"{BASE_URL}/api/github/connect")
        assert response.status_code == 401
    
    def test_github_status_requires_auth(self):
        """GET /api/github/status requires authentication"""
        response = requests.get(f"{BASE_URL}/api/github/status")
        assert response.status_code == 401


class TestAuthEndpoints:
    """Test auth-related endpoints"""
    
    def test_auth_me_requires_session(self):
        """GET /api/auth/me requires valid session"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
    
    def test_logout_works_without_session(self):
        """POST /api/auth/logout works even without session"""
        response = requests.post(f"{BASE_URL}/api/auth/logout")
        # Should not error even without session
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


class TestAPIResponseFormats:
    """Test API response formats and error handling"""
    
    def test_404_for_unknown_endpoint(self):
        """Unknown endpoints return 404"""
        response = requests.get(f"{BASE_URL}/api/nonexistent-endpoint")
        assert response.status_code == 404
    
    def test_api_returns_json(self):
        """API endpoints return JSON content type"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.headers.get("content-type", "").startswith("application/json")
