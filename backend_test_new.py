import requests
import sys
from datetime import datetime
import json
import uuid

class PersistentProjectAPITester:
    def __init__(self, base_url="https://forjenta-builder.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = "test_session_1773890049829"  # Using created test session
        self.user_id = "test-user-1773890049829"
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []
        self.test_project_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        req_headers = {'Content-Type': 'application/json'}
        
        if headers:
            req_headers.update(headers)
        if self.token:
            req_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=req_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=req_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=req_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                details = f"Status: {response.status_code}"
                if response.headers.get('content-type', '').startswith('application/json'):
                    try:
                        json_data = response.json()
                        if isinstance(json_data, dict) and len(str(json_data)) < 200:
                            details += f", Response: {json_data}"
                    except:
                        pass
                self.log_result(name, True, details)
            else:
                details = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_text = response.text[:200] if response.text else ""
                    if error_text:
                        details += f", Error: {error_text}"
                except:
                    pass
                self.log_result(name, False, details)

            return success, response.json() if response.headers.get('content-type', '').startswith('application/json') else {}

        except Exception as e:
            error_msg = f"Request error: {str(e)}"
            self.log_result(name, False, error_msg)
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        return self.run_test(
            "API Root",
            "GET", 
            "api/",
            200
        )

    def test_auth_me_with_auth(self):
        """Test /me endpoint with authentication"""
        return self.run_test(
            "Auth Me (With Auth)",
            "GET",
            "api/auth/me", 
            200
        )

    def test_projects_list(self):
        """Test list projects endpoint"""
        return self.run_test(
            "Projects List",
            "GET",
            "api/projects",
            200
        )

    def test_create_project(self):
        """Test create project endpoint"""
        project_data = {
            "name": f"Test Project {datetime.now().strftime('%H%M%S')}",
            "prompt": "Create a simple React todo app with task management features",
            "description": "A test project for API testing"
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "api/projects",
            200,
            data=project_data
        )
        
        if success and response.get("project", {}).get("project_id"):
            self.test_project_id = response["project"]["project_id"]
            print(f"   Created project ID: {self.test_project_id}")
        
        return success, response

    def test_project_context(self):
        """Test get project context endpoint"""
        if not self.test_project_id:
            self.log_result("Project Context", False, "No test project ID available")
            self.tests_run += 1
            return False, {}
        
        return self.run_test(
            "Project Context",
            "GET",
            f"api/projects/{self.test_project_id}/context",
            200
        )

    def test_continue_project(self):
        """Test continue project with prompt classification"""
        if not self.test_project_id:
            self.log_result("Continue Project", False, "No test project ID available")
            self.tests_run += 1
            return False, {}
        
        continue_data = {
            "prompt": "Add a dark mode toggle to the app",
            "force_rebuild": False
        }
        
        return self.run_test(
            "Continue Project",
            "POST",
            f"api/projects/{self.test_project_id}/prompts",
            200,
            data=continue_data
        )

    def test_save_project_files(self):
        """Test save project files endpoint"""
        if not self.test_project_id:
            self.log_result("Save Project Files", False, "No test project ID available")
            self.tests_run += 1
            return False, {}
        
        # Generate test files
        test_files = [
            {
                "path": "src/App.tsx",
                "content": "import React from 'react';\n\nfunction App() {\n  return <div>Hello World</div>;\n}\n\nexport default App;",
                "language": "typescript"
            },
            {
                "path": "src/components/TodoList.tsx", 
                "content": "import React from 'react';\n\ninterface Todo {\n  id: string;\n  text: string;\n  completed: boolean;\n}\n\nexport default function TodoList() {\n  return <div>Todo List Component</div>;\n}",
                "language": "typescript"
            }
        ]
        
        files_data = {
            "files": test_files,
            "run_id": f"test_run_{uuid.uuid4().hex[:12]}",
            "prompt_id": f"test_prompt_{uuid.uuid4().hex[:12]}",
            "change_reason": "Initial file creation for testing"
        }
        
        return self.run_test(
            "Save Project Files",
            "POST",
            f"api/projects/{self.test_project_id}/files",
            200,
            data=files_data
        )

    def test_get_project_files(self):
        """Test get project files endpoint"""
        if not self.test_project_id:
            self.log_result("Get Project Files", False, "No test project ID available")
            self.tests_run += 1
            return False, {}
        
        return self.run_test(
            "Get Project Files",
            "GET",
            f"api/projects/{self.test_project_id}/files",
            200
        )

    def test_get_project_detail(self):
        """Test get project detail endpoint"""
        if not self.test_project_id:
            self.log_result("Get Project Detail", False, "No test project ID available")
            self.tests_run += 1
            return False, {}
        
        return self.run_test(
            "Get Project Detail",
            "GET",
            f"api/projects/{self.test_project_id}",
            200
        )

    def test_github_repos_no_connection(self):
        """Test GitHub repos endpoint with auth but no connection"""
        return self.run_test(
            "GitHub Repos (No Connection)", 
            "GET",
            "api/github/repos",
            404  # Should return 404 since GitHub not connected for test user
        )

    def test_cors_headers(self):
        """Test CORS configuration"""
        print(f"\n🔍 Testing CORS Headers...")
        try:
            response = requests.options(f"{self.base_url}/api/", 
                                      headers={'Origin': 'https://example.com'},
                                      timeout=10)
            
            cors_headers = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
            }
            
            has_cors = any(cors_headers.values())
            self.log_result("CORS Headers", has_cors, f"Headers: {cors_headers}")
            
            if has_cors:
                self.tests_passed += 1
            self.tests_run += 1
            
            return has_cors
            
        except Exception as e:
            self.log_result("CORS Headers", False, f"Error: {str(e)}")
            self.tests_run += 1
            return False

    def generate_report(self):
        """Generate test report"""
        passed_tests = [r["test"] for r in self.results if r["success"]]
        failed_tests = [r for r in self.results if not r["success"]]
        
        report = {
            "summary": f"Backend Persistent Project API Testing - {self.tests_passed}/{self.tests_run} tests passed",
            "total_tests": self.tests_run,
            "passed": self.tests_passed,
            "failed": len(failed_tests),
            "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%",
            "passed_tests": passed_tests,
            "failed_tests": failed_tests,
            "timestamp": datetime.now().isoformat()
        }
        
        return report

def main():
    print("🚀 Starting ForJenta Persistent Project API Backend Testing")
    print("=" * 60)
    
    tester = PersistentProjectAPITester()
    
    # Test basic API endpoints
    print("\n📋 Testing Basic API Endpoints...")
    tester.test_api_root()
    
    # Test auth endpoints with authentication  
    print("\n🔐 Testing Auth Endpoints (With Auth)...")
    tester.test_auth_me_with_auth()
    
    # Test GitHub endpoints without GitHub connection (expecting 404)
    print("\n🐙 Testing GitHub Endpoints (With Auth but No Connection)...")  
    tester.test_github_repos_no_connection()
    
    # Test Project Management endpoints
    print("\n📁 Testing Project Management Endpoints...")
    tester.test_projects_list()
    tester.test_create_project()
    tester.test_project_context()
    tester.test_continue_project()
    tester.test_save_project_files()
    tester.test_get_project_files()
    tester.test_get_project_detail()
    
    # Test CORS configuration
    print("\n🌐 Testing CORS Configuration...")
    tester.test_cors_headers()
    
    # Generate and print report
    print("\n" + "=" * 60)
    report = tester.generate_report()
    print(f"📊 {report['summary']}")
    print(f"✅ Success Rate: {report['success_rate']}")
    
    if report['failed_tests']:
        print(f"\n❌ Failed Tests ({len(report['failed_tests'])}):")
        for test in report['failed_tests']:
            print(f"   • {test['test']}: {test['details']}")
    
    # Return exit code based on results
    critical_failures = [
        t for t in report['failed_tests'] 
        if any(kw in t['test'] for kw in ['API Root', 'CORS', 'Auth Me', 'Projects List', 'Create Project'])
    ]
    
    if critical_failures:
        print(f"\n🚨 Critical failures detected: {len(critical_failures)}")
        return 1
    
    print(f"\n✅ Backend API endpoints are responding correctly!")
    return 0

if __name__ == "__main__":
    sys.exit(main())