"""Backend tests for AIRBCARS proxy API.

Covers:
- /api/cars listing (no filter and with filters)
- /api/cars/{id} details and 404 handling
- /api/car-price short-term supplement logic
- /api/bookings creation via the real CSRF+session flow (hits REAL upstream)
- /api/bookings validation (missing required fields -> 422)
"""
from datetime import date, timedelta

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
        car = data["cars"][0]
        for field in ["id", "name", "brand", "category", "transmission", "fuel_type", "price"]:
            assert field in car, f"missing {field} in car"
        assert "pagination" in data

    def test_cars_filter_category_economy(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"category": "economy", "limit": 10})
        assert r.status_code == 200
        for c in r.json().get("cars", []):
            assert c["category"].lower() == "economy"

    def test_cars_filter_transmission_manual(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"transmission": "manual", "limit": 10})
        assert r.status_code == 200
        for c in r.json().get("cars", []):
            assert c["transmission"].lower() == "manual"

    def test_cars_price_range(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"min_price": 30, "max_price": 60, "limit": 20})
        assert r.status_code == 200
        for c in r.json().get("cars", []):
            price = float(c["price"])
            assert 30 <= price <= 60


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
        assert r.status_code == 404

    # NEW: franchise_fee enrichment on /api/cars/{id}
    def test_get_car_details_has_franchise_fee(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars/313")
        assert r.status_code == 200
        car = r.json().get("car")
        assert car is not None
        assert "franchise_fee" in car, "franchise_fee missing from enriched details"
        assert isinstance(car["franchise_fee"], (int, float))
        assert car["franchise_fee"] > 0


# --- pagination on /api/cars ---
class TestCarsPagination:
    def test_pagination_page1(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/cars", params={"page": 1, "limit": 20})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        pag = data.get("pagination")
        assert pag is not None
        for f in ["total", "page", "has_more"]:
            assert f in pag, f"pagination missing {f}"
        assert int(pag["page"]) == 1
        assert len(data["cars"]) <= 20

    def test_pagination_page2_returns_different_cars(self, api_client, base_url):
        r1 = api_client.get(f"{base_url}/api/cars", params={"page": 1, "limit": 20})
        r2 = api_client.get(f"{base_url}/api/cars", params={"page": 2, "limit": 20})
        assert r1.status_code == 200 and r2.status_code == 200
        ids1 = {c["id"] for c in r1.json().get("cars", [])}
        ids2 = {c["id"] for c in r2.json().get("cars", [])}
        # If has_more on page1 was true we expect page2 to have new ids
        if r1.json()["pagination"].get("has_more") and ids2:
            assert ids2 - ids1, "page 2 returned no new car ids"


# --- /api/car-price ---
class TestCarPrice:
    def _dates(self, days_apart: int):
        pickup = date.today() + timedelta(days=10)
        ret = pickup + timedelta(days=days_apart)
        return pickup.isoformat(), ret.isoformat()

    def test_price_3_day_rental_has_short_term_supplement(self, api_client, base_url):
        pickup, ret = self._dates(3)
        r = api_client.get(
            f"{base_url}/api/car-price",
            params={"car_id": "313", "pickup_date": pickup, "return_date": ret},
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("success") is True
        # Response shape
        for field in [
            "total_price",
            "base_price_without_supplement",
            "average_daily_price",
            "total_days",
            "has_short_term_supplement",
            "supplement_percentage",
            "supplement_amount",
        ]:
            assert field in data, f"missing {field}"
        assert data["total_days"] == 3
        assert data["has_short_term_supplement"] is True
        assert data["supplement_percentage"] == 40
        # supplement_amount should equal ~40% of base
        expected_supp = round(data["base_price_without_supplement"] * 0.4, 2)
        assert abs(data["supplement_amount"] - expected_supp) < 1.0
        assert data["total_price"] > data["base_price_without_supplement"]

    def test_price_5_day_rental_no_supplement(self, api_client, base_url):
        pickup, ret = self._dates(5)
        r = api_client.get(
            f"{base_url}/api/car-price",
            params={"car_id": "313", "pickup_date": pickup, "return_date": ret},
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert data["total_days"] == 5
        assert data["has_short_term_supplement"] is False
        assert data["supplement_amount"] == 0
        assert data["total_price"] == data["base_price_without_supplement"]


# --- /api/bookings ---
# NOTE: this hits the REAL upstream booking endpoint via the CSRF+session flow.
class TestBookings:
    def test_create_booking_success(self, api_client, base_url):
        pickup = (date.today() + timedelta(days=14)).isoformat()
        ret = (date.today() + timedelta(days=17)).isoformat()
        payload = {
            "car_id": "313",
            "car_name": "TEST_Renault Clio5 2025",
            "first_name": "TEST",
            "last_name": "Autobot",
            "country_code": "+212",
            "whatsapp": "600000000",
            "pickup_date": pickup,
            "return_date": ret,
            "pickup_city": "Fes",
            "payment_method": "cash",
        }
        r = api_client.post(f"{base_url}/api/bookings", json=payload)
        assert r.status_code == 200, f"backend error: {r.status_code} {r.text[:400]}"
        data = r.json()
        assert data.get("success") is True, f"upstream failure: {data}"
        assert data.get("booking_number"), "booking_number missing"
        assert data.get("pin_code"), "pin_code missing"

    def test_create_booking_missing_required_field(self, api_client, base_url):
        payload = {
            "car_id": "313",
            "first_name": "TEST",
            # last_name missing
            "whatsapp": "600000000",
            "pickup_date": "2026-03-01",
            "return_date": "2026-03-04",
            # pickup_city missing
        }
        r = api_client.post(f"{base_url}/api/bookings", json=payload)
        assert r.status_code == 422
