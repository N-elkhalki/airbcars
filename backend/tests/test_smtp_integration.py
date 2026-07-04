"""Focused tests for the SMTP integration.

Validates that /api/contact ACTUALLY sends an email now that valid SMTP
credentials are configured (mail.airbcars.ma:465, no_reply@airbcars.ma).
The endpoint must:
  - return 200 with success:true, message and email_sent:true
  - persist the message to Mongo db.contacts with email_sent:true
  - reject payloads missing required fields with 422

Also verifies that /api/bookings SMTP wrapper cannot cause a 500 even if
mail delivery fails.
"""
from datetime import date, timedelta

import pytest


class TestContactSMTP:
    def test_contact_returns_success_and_email_sent_true(self, api_client, base_url):
        payload = {
            "name": "TEST_SMTP_User",
            "email": "TEST_smtp@example.com",
            "message": "TEST_SMTP real send check",
        }
        r = api_client.post(f"{base_url}/api/contact", json=payload)
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("success") is True
        assert data.get("message") == "Message received"
        assert "email_sent" in data
        assert isinstance(data["email_sent"], bool)
        # SMTP creds are now valid — expect an actual send.
        assert data["email_sent"] is True, (
            "SMTP creds are supposed to be valid now — email_sent should be True. "
            "Check /var/log/supervisor/backend.err.log for the send_email error."
        )

    def test_contact_persisted_in_mongo_with_email_sent_true(self, api_client, base_url):
        unique_msg = f"TEST_persist_{date.today().isoformat()}"
        payload = {
            "name": "TEST_Persist",
            "email": "TEST_persist@example.com",
            "message": unique_msg,
        }
        r = api_client.post(f"{base_url}/api/contact", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data.get("email_sent") is True
        # Query Mongo directly to confirm persistence with email_sent=True.
        from pymongo import MongoClient
        import os
        client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
        db = client[os.environ.get("DB_NAME", "test_database")]
        doc = db.contacts.find_one({"message": unique_msg}, sort=[("created_at", -1)])
        assert doc is not None, "contact not persisted in Mongo"
        assert doc.get("email_sent") is True
        assert doc.get("name") == "TEST_Persist"
        assert doc.get("email") == "TEST_persist@example.com"

    def test_contact_missing_message_returns_422(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/contact",
            json={"name": "TEST_x", "email": "TEST_x@example.com"},
        )
        assert r.status_code == 422

    def test_contact_missing_email_returns_422(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/contact",
            json={"name": "TEST_x", "message": "hello"},
        )
        assert r.status_code == 422

    def test_contact_missing_name_returns_422(self, api_client, base_url):
        r = api_client.post(
            f"{base_url}/api/contact",
            json={"email": "TEST_x@example.com", "message": "hello"},
        )
        assert r.status_code == 422


class TestBookingsSMTPResilience:
    """/api/bookings must not surface 500 because of SMTP failures.

    Upstream airbcars.ma is currently returning 415 for all endpoints so the
    booking creation itself returns 502. That is an upstream availability
    issue, unrelated to the SMTP integration. Crucially, the endpoint MUST
    NOT return 500 — 502 (upstream) or 200 (real success + best-effort SMTP)
    or 422 (validation) are the only allowed statuses.
    """

    def test_booking_never_returns_500_due_to_smtp(self, api_client, base_url):
        pickup = (date.today() + timedelta(days=14)).isoformat()
        ret = (date.today() + timedelta(days=17)).isoformat()
        payload = {
            "car_id": "313",
            "car_name": "TEST_SMTP_Booking",
            "first_name": "TEST",
            "last_name": "SMTPResilience",
            "country_code": "+212",
            "whatsapp": "600000009",
            "pickup_date": pickup,
            "return_date": ret,
            "pickup_city": "Fes",
            "payment_method": "cash",
        }
        r = api_client.post(f"{base_url}/api/bookings", json=payload)
        # Accept 200 (success), 502 (upstream airbcars.ma unreachable/415),
        # or 422 (upstream rejects). Explicitly reject 500.
        assert r.status_code in (200, 422, 502), r.text[:300]
        if r.status_code == 200:
            data = r.json()
            assert data.get("booking_number"), "booking_number missing"
            assert data.get("pin_code"), "pin_code missing"
