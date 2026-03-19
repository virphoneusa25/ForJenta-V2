import requests
import sys
from datetime import datetime
import json

class OAuth_API_Tester:
    def __init__(self, base_url="https://jenta-preview.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

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

    def test_auth_session_no_token(self):
        """Test auth session endpoint without token (should fail)"""
        return self.run_test(
            "Auth Session (No Token)",
            "POST",
            "api/auth/session",
            422,  # Missing session_id should return 422
            data={}
        )

    def test_auth_me_no_auth(self):
        """Test /me endpoint without authentication"""
        return self.run_test(
            "Auth Me (No Auth)",
            "GET",
            "api/auth/me", 
            401
        )

    def test_github_connect_no_auth(self):
        """Test GitHub connect endpoint without authentication"""
        return self.run_test(
            "GitHub Connect (No Auth)",
            "GET",
            "api/github/connect",
            401
        )

    def test_github_repos_no_auth(self):
        """Test GitHub repos endpoint without authentication"""
        return self.run_test(
            "GitHub Repos (No Auth)", 
            "GET",
            "api/github/repos",
            401
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
            "summary": f"Backend OAuth API Testing - {self.tests_passed}/{self.tests_run} tests passed",
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
    print("🚀 Starting ForJenta OAuth API Backend Testing")
    print("=" * 60)
    
    tester = OAuth_API_Tester()
    
    # Test basic API endpoints
    print("\n📋 Testing Basic API Endpoints...")
    tester.test_api_root()
    
    # Test auth endpoints without authentication  
    print("\n🔐 Testing Auth Endpoints (No Auth)...")
    tester.test_auth_session_no_token()
    tester.test_auth_me_no_auth()
    
    # Test GitHub endpoints without authentication
    print("\n🐙 Testing GitHub Endpoints (No Auth)...")  
    tester.test_github_connect_no_auth()
    tester.test_github_repos_no_auth()
    
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
        if 'API Root' in t['test'] or 'CORS' in t['test']
    ]
    
    if critical_failures:
        print(f"\n🚨 Critical failures detected: {len(critical_failures)}")
        return 1
    
    print(f"\n✅ Backend API endpoints are responding correctly!")
    return 0

if __name__ == "__main__":
    sys.exit(main())