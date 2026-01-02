import requests
import sys
import json
from datetime import datetime

class LeadQualityEngineAPITester:
    def __init__(self, base_url="https://leadwizard.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def test_dashboard_endpoint(self):
        """Test dashboard stats endpoint"""
        try:
            response = requests.get(f"{self.api_url}/dashboard", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_leads', 'hot_count', 'warm_count', 'cold_count', 'source_distribution', 'best_time_of_day']
                
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_test("Dashboard API Structure", False, f"Missing fields: {missing_fields}")
                    return False
                
                self.log_test("Dashboard API", True, f"Total leads: {data['total_leads']}")
                return True
            else:
                self.log_test("Dashboard API", False, f"Status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Dashboard API", False, f"Exception: {str(e)}")
            return False

    def test_leads_endpoint(self):
        """Test get all leads endpoint"""
        try:
            response = requests.get(f"{self.api_url}/leads", timeout=10)
            
            if response.status_code == 200:
                leads = response.json()
                
                if isinstance(leads, list):
                    self.log_test("Get Leads API", True, f"Retrieved {len(leads)} leads")
                    
                    # Test lead structure if leads exist
                    if leads:
                        lead = leads[0]
                        required_fields = ['id', 'name', 'phone', 'source', 'service_interest', 'location', 'score', 'category']
                        missing_fields = [field for field in required_fields if field not in lead]
                        
                        if missing_fields:
                            self.log_test("Lead Structure", False, f"Missing fields: {missing_fields}")
                            return False
                        
                        # Test lead scoring logic
                        if lead['score'] >= 70 and lead['category'] != 'Hot':
                            self.log_test("Lead Scoring Logic", False, f"Score {lead['score']} should be Hot, got {lead['category']}")
                            return False
                        elif 40 <= lead['score'] < 70 and lead['category'] != 'Warm':
                            self.log_test("Lead Scoring Logic", False, f"Score {lead['score']} should be Warm, got {lead['category']}")
                            return False
                        elif lead['score'] < 40 and lead['category'] != 'Cold':
                            self.log_test("Lead Scoring Logic", False, f"Score {lead['score']} should be Cold, got {lead['category']}")
                            return False
                        
                        self.log_test("Lead Scoring Logic", True, f"Score {lead['score']} correctly categorized as {lead['category']}")
                        
                        # Test if leads are sorted by score (descending)
                        if len(leads) > 1:
                            is_sorted = all(leads[i]['score'] >= leads[i+1]['score'] for i in range(len(leads)-1))
                            if is_sorted:
                                self.log_test("Lead Sorting", True, "Leads sorted by score descending")
                            else:
                                self.log_test("Lead Sorting", False, "Leads not sorted by score")
                    
                    return True
                else:
                    self.log_test("Get Leads API", False, "Response is not a list")
                    return False
            else:
                self.log_test("Get Leads API", False, f"Status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Leads API", False, f"Exception: {str(e)}")
            return False

    def test_lead_details_endpoint(self):
        """Test get lead with AI messages endpoint"""
        try:
            # First get a lead ID
            response = requests.get(f"{self.api_url}/leads", timeout=10)
            if response.status_code != 200:
                self.log_test("Lead Details API", False, "Could not get leads to test details")
                return False
            
            leads = response.json()
            if not leads:
                self.log_test("Lead Details API", False, "No leads available to test details")
                return False
            
            lead_id = leads[0]['id']
            
            # Test lead details endpoint
            response = requests.get(f"{self.api_url}/leads/{lead_id}", timeout=30)  # Longer timeout for AI generation
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if AI messages are present
                if 'ai_messages' in data:
                    ai_messages = data['ai_messages']
                    required_message_types = ['whatsapp', 'email', 'call_script']
                    
                    missing_types = [msg_type for msg_type in required_message_types if msg_type not in ai_messages]
                    if missing_types:
                        self.log_test("AI Messages Structure", False, f"Missing message types: {missing_types}")
                        return False
                    
                    # Check if messages are not empty
                    empty_messages = [msg_type for msg_type in required_message_types if not ai_messages[msg_type].strip()]
                    if empty_messages:
                        self.log_test("AI Messages Content", False, f"Empty messages: {empty_messages}")
                        return False
                    
                    self.log_test("Lead Details API with AI Messages", True, f"Generated AI messages for lead {lead_id}")
                    return True
                else:
                    self.log_test("Lead Details API", False, "AI messages not found in response")
                    return False
            else:
                self.log_test("Lead Details API", False, f"Status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Lead Details API", False, f"Exception: {str(e)}")
            return False

    def test_csv_upload_endpoint(self):
        """Test CSV upload endpoint"""
        try:
            # Create test CSV content
            csv_content = """name,phone,email,source,service_interest,location,timestamp
Test User,+91-9999999999,test@email.com,Google Ads,SEO,Hyderabad,2024-12-15T10:30:00"""
            
            files = {'file': ('test_leads.csv', csv_content, 'text/csv')}
            
            response = requests.post(f"{self.api_url}/leads/upload", files=files, timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success') and data.get('count', 0) > 0:
                    self.log_test("CSV Upload API", True, f"Uploaded {data['count']} leads")
                    return True
                else:
                    self.log_test("CSV Upload API", False, f"Upload failed: {data}")
                    return False
            else:
                self.log_test("CSV Upload API", False, f"Status code: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("CSV Upload API", False, f"Exception: {str(e)}")
            return False

    def test_delete_leads_endpoint(self):
        """Test delete all leads endpoint (cleanup)"""
        try:
            response = requests.delete(f"{self.api_url}/leads", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Delete Leads API", True, f"Deleted {data.get('deleted_count', 0)} leads")
                return True
            else:
                self.log_test("Delete Leads API", False, f"Status code: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Delete Leads API", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting API tests for Lead Quality Engine")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test basic endpoints first
        self.test_dashboard_endpoint()
        self.test_leads_endpoint()
        
        # Test CSV upload
        self.test_csv_upload_endpoint()
        
        # Test lead details with AI messages (after upload)
        self.test_lead_details_endpoint()
        
        # Cleanup
        self.test_delete_leads_endpoint()
        
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

def main():
    tester = LeadQualityEngineAPITester()
    success = tester.run_all_tests()
    
    # Save test results
    with open('/app/test_reports/backend_api_results.json', 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_tests': tester.tests_run,
            'passed_tests': tester.tests_passed,
            'success_rate': f"{(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "0%",
            'test_results': tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())