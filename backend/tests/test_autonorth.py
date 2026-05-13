"""AutoNorth Motors Backend API Tests"""
import pytest
import requests
import os

# Set BASE_URL from environment variable for Vercel deployment, fallback to localhost for local testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8000').rstrip('/')

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@autonorth.ca')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'AdminPassword123!')

@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s

@pytest.fixture(scope="module")
def auth_session(session):
    resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    # Try Bearer token fallback
    token = resp.cookies.get("access_token") or resp.json().get("token")
    if token:
        session.headers.update({"Authorization": f"Bearer {token}"})
    return session

# --- Auth Tests ---
class TestAuth:
    def test_login_success(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert resp.status_code == 200
        data = resp.json()
        assert data["email"] == ADMIN_EMAIL
        print("PASS: Admin login success")

    def test_login_invalid(self, session):
        resp = session.post(f"{BASE_URL}/api/auth/login", json={"email": "bad@email.com", "password": "wrongpass"})
        assert resp.status_code == 401
        print("PASS: Invalid login returns 401")

    def test_me_authenticated(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert resp.status_code == 200
        assert resp.json()["email"] == ADMIN_EMAIL
        print("PASS: /me returns current user")

# --- Vehicle Tests ---
class TestVehicles:
    def test_list_vehicles_public(self, session):
        resp = session.get(f"{BASE_URL}/api/vehicles")
        assert resp.status_code == 200
        data = resp.json()
        assert "vehicles" in data
        assert data["total"] >= 0
        print(f"PASS: Vehicles list returned {data['total']} vehicles")

    def test_list_vehicles_filter_condition(self, session):
        resp = session.get(f"{BASE_URL}/api/vehicles?condition=new")
        assert resp.status_code == 200
        data = resp.json()
        for v in data["vehicles"]:
            assert v["condition"] == "new"
        print(f"PASS: Filter by condition=new works, got {data['total']}")

    def test_list_vehicles_filter_body_type(self, session):
        resp = session.get(f"{BASE_URL}/api/vehicles?body_type=Truck")
        assert resp.status_code == 200
        data = resp.json()
        for v in data["vehicles"]:
            assert v["body_type"] == "Truck"
        print(f"PASS: Filter by body_type=Truck works")

    def test_get_vehicle_by_id(self, session):
        list_resp = session.get(f"{BASE_URL}/api/vehicles")
        if list_resp.json()["total"] > 0:
            vid = list_resp.json()["vehicles"][0]["id"]
            resp = session.get(f"{BASE_URL}/api/vehicles/{vid}")
            assert resp.status_code == 200
            assert resp.json()["id"] == vid
            print(f"PASS: Get vehicle by id works")
        else:
            print("SKIP: No vehicles to test")

    def test_get_vehicle_invalid_id(self, session):
        resp = session.get(f"{BASE_URL}/api/vehicles/invalid_id_here")
        assert resp.status_code == 400 or resp.status_code == 404
        print("PASS: Invalid vehicle id returns 400/404")

    def test_create_vehicle(self, auth_session):
        payload = {
            "title": "TEST_2024 Test Car", "make": "TEST_Make", "model": "TestModel",
            "year": 2024, "price": 30000, "mileage": 0, "condition": "new",
            "body_type": "Sedan", "fuel_type": "Gas", "transmission": "Automatic"
        }
        resp = auth_session.post(f"{BASE_URL}/api/vehicles", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == payload["title"]
        TestVehicles.created_id = data["id"]
        print(f"PASS: Vehicle created with id {data['id']}")

    def test_update_vehicle(self, auth_session):
        vid = TestVehicles.created_id
        payload = {"title": "UPDATED_TEST_2024 Test Car"}
        resp = auth_session.put(f"{BASE_URL}/api/vehicles/{vid}", json=payload)
        assert resp.status_code == 200
        assert resp.json()["message"] == "Vehicle updated"
        print(f"PASS: Vehicle {vid} updated")

    def test_delete_vehicle(self, auth_session):
        vid = TestVehicles.created_id
        resp = auth_session.delete(f"{BASE_URL}/api/vehicles/{vid}")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Vehicle deleted"
        print(f"PASS: Vehicle {vid} deleted")

# --- Lead Tests ---
class TestLeads:
    def test_create_lead(self, session):
        payload = {
            "lead_type": "contact",
            "name": "TEST_John Doe",
            "email": "test_john@example.com",
            "phone": "780-555-0001",
            "message": "Interested in a vehicle"
        }
        resp = session.post(f"{BASE_URL}/api/leads", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] is not None
        print(f"PASS: Lead created with id {data['id']}")

    def test_list_leads_requires_auth(self, session):
        # Anonymous should fail
        anon = requests.Session()
        resp = anon.get(f"{BASE_URL}/api/leads")
        assert resp.status_code == 401 or resp.status_code == 403
        print("PASS: Anonymous lead access blocked")

    def test_list_leads_authenticated(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/leads")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: Leads list returned {len(data)} leads")

    def test_update_lead_status(self, auth_session):
        # First create a lead
        payload = {
            "lead_type": "test_drive",
            "name": "TEST_Jane Smith",
            "email": "test_jane@example.com",
            "phone": "780-555-0002",
            "message": "Want to test drive a truck"
        }
        create_resp = auth_session.post(f"{BASE_URL}/api/leads", json=payload)
        assert create_resp.status_code == 200
        lid = create_resp.json()["id"]
        
        # Then update its status
        update_payload = {"status": "contacted"}
        resp = auth_session.put(f"{BASE_URL}/api/leads/{lid}", json=update_payload)
        assert resp.status_code == 200
        assert resp.json()["message"] == "Lead updated"
        print(f"PASS: Lead {lid} status updated")

    def test_delete_lead(self, auth_session):
        # First create a lead
        payload = {
            "lead_type": "financing",
            "name": "TEST_Bob Wilson",
            "email": "test_bob@example.com",
            "phone": "780-555-0003",
            "message": "Need financing help"
        }
        create_resp = auth_session.post(f"{BASE_URL}/api/leads", json=payload)
        assert create_resp.status_code == 200
        lid = create_resp.json()["id"]
        
        # Then delete it
        resp = auth_session.delete(f"{BASE_URL}/api/leads/{lid}")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Lead deleted"
        print(f"PASS: Lead {lid} deleted")

# --- Stats Tests ---
class TestStats:
    def test_stats_requires_auth(self, session):
        anon = requests.Session()
        resp = anon.get(f"{BASE_URL}/api/stats")
        assert resp.status_code == 401 or resp.status_code == 403
        print("PASS: Anonymous stats access blocked")

    def test_stats_authenticated(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/stats")
        assert resp.status_code == 200
        data = resp.json()
        # Check for expected keys
        expected_keys = ["total_vehicles", "available", "available_vehicles", "total_leads", "new_leads"]
        for key in expected_keys:
            assert key in data
        print(f"PASS: Stats returned with keys: {list(data.keys())}")

# --- Scraper Tests ---
class TestScraper:
    def test_scraper_settings_get(self, auth_session):
        resp = auth_session.get(f"{BASE_URL}/api/scraper/settings")
        assert resp.status_code == 200
        data = resp.json()
        assert "auto_sync" in data
        print(f"PASS: Scraper settings retrieved: {data}")

    def test_scraper_settings_update(self, auth_session):
        payload = {"auto_sync": True}
        resp = auth_session.post(f"{BASE_URL}/api/scraper/settings", json=payload)
        assert resp.status_code == 200
        assert resp.json()["message"] == "Scraper settings updated"
        print("PASS: Scraper settings updated")