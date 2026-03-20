"""
ForJenta IDE Generation API Tests
Tests the new Inworld AI generation endpoints:
- /api/provider/status - Provider configuration status
- /api/generate - Full generation endpoint (new contract)
- /api/generate-code - Legacy generation endpoint

All generation endpoints work WITHOUT user auth - server-side Inworld credentials are used.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001').rstrip('/')


class TestProviderStatus:
    """Test /api/provider/status endpoint - No auth required"""
    
    def test_provider_status_returns_available(self):
        """GET /api/provider/status returns available:true with provider details"""
        response = requests.get(f"{BASE_URL}/api/provider/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("available") == True
        assert data.get("provider") == "inworld"
        assert data.get("providerLabel") == "Inworld"
        assert "inworld" in data.get("modelId", "")
        assert data.get("modelLabel") is not None
        assert data.get("apiBaseUrl") == "https://api.inworld.ai/v1/chat/completions"
        assert data.get("authType") == "basic"
        
    def test_provider_status_has_checks_object(self):
        """GET /api/provider/status includes checks object"""
        response = requests.get(f"{BASE_URL}/api/provider/status")
        assert response.status_code == 200
        data = response.json()
        
        checks = data.get("checks", {})
        assert checks.get("api_key_present") == True
        assert checks.get("primary_model") is not None
        assert checks.get("backup_model") is not None
        assert checks.get("api_base_url") is not None


class TestGenerateEndpoint:
    """Test /api/generate endpoint - Full contract - No auth required"""
    
    def test_generate_with_root_prompt_only(self):
        """POST /api/generate with just rootPrompt generates files"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={
                "rootPrompt": "Create simple html with text TEST_GENERATE_ROOT",
                "selectedProvider": "inworld",
                "selectedModel": "inworld/default-forjenta-model"
            },
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert isinstance(data.get("files"), list)
        assert len(data.get("files", [])) > 0
        assert data.get("provider") == "inworld"
        assert "inworld" in data.get("model", "")
        
        # Verify files have proper structure
        first_file = data["files"][0]
        assert "path" in first_file
        assert "content" in first_file
        assert "language" in first_file
        
        # Verify logs show proper stages
        logs = data.get("logs", [])
        assert any("Provider mode selected" in log for log in logs)
        assert any("credentials" in log.lower() for log in logs)
        assert any("response received" in log.lower() for log in logs)
    
    def test_generate_with_continuation(self):
        """POST /api/generate with rootPrompt + followUpPrompt + fileTree does continuation"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={
                "rootPrompt": "Create a webpage",
                "followUpPrompt": "Add a red background to the page",
                "fileTree": [
                    {
                        "path": "index.html",
                        "content": "<html><body><h1>Hello</h1></body></html>",
                        "language": "html"
                    }
                ],
                "selectedProvider": "inworld",
                "selectedModel": "inworld/default-forjenta-model"
            },
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert isinstance(data.get("files"), list)
        
        # In continuation mode, should only return modified files
        assert len(data.get("files", [])) >= 1
        
    def test_generate_returns_structured_response(self):
        """POST /api/generate returns proper structure (actions, todos, logs)"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={
                "rootPrompt": "Create TEST_STRUCT html",
                "selectedProvider": "inworld"
            },
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "success" in data
        assert "files" in data
        assert "actions" in data
        assert "todos" in data
        assert "logs" in data
        
        # Actions should match files
        if data.get("files"):
            actions = data.get("actions", [])
            assert len(actions) == len(data["files"])
            for action in actions:
                assert action.get("type") == "write_file"
                assert "path" in action
                
    def test_generate_no_auth_required(self):
        """POST /api/generate works without any cookies or auth headers"""
        session = requests.Session()
        # Ensure no cookies
        session.cookies.clear()
        
        response = session.post(
            f"{BASE_URL}/api/generate",
            json={
                "rootPrompt": "Create TEST_NOAUTH html",
            },
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True


class TestGenerateCodeLegacy:
    """Test /api/generate-code legacy endpoint - No auth required"""
    
    def test_legacy_endpoint_works(self):
        """POST /api/generate-code still functions for backward compatibility"""
        response = requests.post(
            f"{BASE_URL}/api/generate-code",
            json={
                "prompt": "Create TEST_LEGACY html",
                "categories": ["Web"],
                "context": "",
                "mode": "full"
            },
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert isinstance(data.get("files"), list)
        assert len(data.get("files", [])) > 0
        
    def test_legacy_continuation_mode(self):
        """POST /api/generate-code works with context for continuation"""
        response = requests.post(
            f"{BASE_URL}/api/generate-code",
            json={
                "prompt": "Add footer",
                "categories": ["Web"],
                "context": "--- index.html ---\n<html><body><h1>Test</h1></body></html>",
                "mode": "continuation"
            },
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True


class TestErrorHandling:
    """Test structured error codes and messages"""
    
    def test_generate_returns_logs_on_success(self):
        """Successful generation includes logs array with stages"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={"rootPrompt": "Create TEST_LOGS html"},
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        
        logs = data.get("logs", [])
        assert len(logs) > 0
        
        # Should have multiple stages logged
        stages = ["Provider mode selected", "credentials", "response"]
        for stage in stages:
            assert any(stage.lower() in log.lower() for log in logs), f"Missing log stage: {stage}"
            
    def test_generate_returns_summary(self):
        """Successful generation includes summary string"""
        response = requests.post(
            f"{BASE_URL}/api/generate",
            json={"rootPrompt": "Create TEST_SUMMARY html"},
            timeout=180
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "summary" in data
        assert isinstance(data["summary"], str)
        assert len(data["summary"]) > 0


class TestStartupValidation:
    """Test that startup validation happens (checked via /api/provider/status)"""
    
    def test_provider_config_validated(self):
        """Provider configuration should be validated and available"""
        response = requests.get(f"{BASE_URL}/api/provider/status")
        assert response.status_code == 200
        data = response.json()
        
        # If available is true, config was validated
        assert data.get("available") == True
        assert data.get("checks", {}).get("api_key_present") == True
