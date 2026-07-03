"""Backend tests for AIRBCARS proxy API.

Covers:
- /api/cars listing (no filter and with filters)
- /api/cars/{id} details and 404 handling
- /api/bookings creation (hits REAL upstream - marked)
"""
import pytest


# --- /api/cars ---
class TestCarsList:
    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/")
        assert r.status_code == 200
        assert "message" in r.json()

    def test_cars_default(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars?limit=5")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert isinstance(data.get("cars"), list)
        assert len(data["cars"]) > 0
        # Validate car shape
        car = data["cars"][0]
        for field in ["id", "name", "brand", "category", "transmission", "fuel_type", "price"]:
            assert field in car, f"missing {field} in car"
        # Pagination
        assert "pagination" in data

    def test_cars_filter_category_economy(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"category": "economy", "limit": 10})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        for c in data.get("cars", []):
            assert c["category"].lower() == "economy"

    def test_cars_filter_transmission_manual(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"transmission": "manual", "limit": 10})
        assert r.status_code == 200
        data = r.json()
        for c in data.get("cars", []):
            assert c["transmission"].lower() == "manual"

    def test_cars_filter_fuel_essence(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"fuel_type": "essence", "limit": 10})
        assert r.status_code == 200
        for c in r.json().get("cars", []):
            assert c["fuel_type"].lower() == "essence"

    def test_cars_filter_city(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"city": "Casablanca", "limit": 10})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        # city may not be returned on every car, so just ensure it succeeded

    def test_cars_price_range(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"min_price": 30, "max_price": 60, "limit": 20})
        assert r.status_code == 200
        for c in r.json().get("cars", []):
            price = float(c["price"])
            assert 30 <= price <= 60, f"price {price} outside range"

    def test_cars_pagination(self, api_client, base_url):
        r1 = api_client.get(f"{base_url}/api/cars", params={"page": 1, "limit": 2})
        r2 = api_client.get(f"{base_url}/api/cars", params={"page": 2, "limit": 2})
        assert r1.status_code == 200 and r2.status_code == 200
        ids1 = {c["id"] for c in r1.json().get("cars", [])}
        ids2 = {c["id"] for c in r2.json().get("cars", [])}
        # Different pages should give different cars
        assert ids1 != ids2 or len(ids1) < 2


# --- /api/cars/{id} ---
class TestCarDetails:
    def test_get_car_details_success(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars/313")
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        car = data.get("car")
        assert car is not None
        assert car["id"] == "313"
        assert isinstance(car.get("images"), list)
        assert isinstance(car.get("available_cities"), list)

    def test_get_car_details_invalid_id_returns_404(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars/99999999")
        assert r.status_code == 404, f"expected 404 got {r.status_code}: {r.text[:200]}"


# --- /api/bookings ---
# NOTE: this hits the REAL upstream booking endpoint.
class TestBookings:
    def test_create_booking(self, api_client, base_url):
        payload = {
            "car_id": "313",
            "car_name": "TEST_Renault Clio5 2025",
            "customer_name": "TEST_Autobot",
            "customer_email": "test_autobot@example.com",
            "customer_phone": "+212600000000",
            "pickup_date": "2026-03-01",
            "return_date": "2026-03-03",
            "pickup_city": "Fes",
            "notes": "TEST_automated regression test - please ignore",
        }
        r = api_client.post(f"{base_url}/api/bookings", json=payload)
        # Backend must not blow up (500/502); upstream may still reject the booking
        # with {success: false} which the frontend surfaces as an error.
        assert r.status_code == 200, f"backend error: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert "success" in data, f"unexpected response shape: {data}"
        if data.get("success") is not True:
            pytest.skip(
                f"UPSTREAM booking rejected (out of our control): {data.get('error')}"
            )
        assert "booking" in data or "reference" in str(data)

    def test_create_booking_missing_required_field(self, api_client, base_url):
        # customer_name missing -> should fail Pydantic validation with 422
        payload = {
            "car_id": "313",
            "customer_email": "x@example.com",
            "customer_phone": "+212600000000",
            "pickup_date": "2026-03-01",
            "return_date": "2026-03-03",
        }
        r = api_client.post(f"{base_url}/api/bookings", json=payload)
        assert r.status_code == 422
