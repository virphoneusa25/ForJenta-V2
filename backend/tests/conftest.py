"""
Pytest fixtures for ForJenta backend tests
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ai-ide-preview-1.preview.emergentagent.com').rstrip('/')


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def base_url():
    """Base URL for API requests"""
    return BASE_URL
