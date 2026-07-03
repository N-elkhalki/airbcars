from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
import uuid
from datetime import datetime, timezone
import requests
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

AIRBCARS_API_URL = os.environ['AIRBCARS_API_URL']
AIRBCARS_BASE = AIRBCARS_API_URL.rsplit("/api/", 1)[0]  # https://airbcars.ma
AIRBCARS_PRICE_URL = f"{AIRBCARS_BASE}/api/get_car_price.php"
AIRBCARS_BOOKINGS_URL = f"{AIRBCARS_BASE}/api/bookings.php"
AIRBCARS_BOOKING_PAGE = f"{AIRBCARS_BASE}/booking.php"
CSRF_RE = re.compile(r'name="csrf_token"\s+value="([^"]+)"')
FRANCHISE_RE = re.compile(r'const franchiseFee\s*=\s*([0-9.]+)')

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ---------- Helpers to talk to the AIRBCARS upstream API ----------
def _upstream_get(params: dict) -> dict:
    r = requests.get(AIRBCARS_API_URL, params=params, timeout=20)
    # Allow 4xx JSON error responses (e.g. 404 car not found) to be handled by callers.
    if r.status_code >= 500:
        r.raise_for_status()
    try:
        return r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid upstream response")


def _upstream_post(action: str, payload: dict) -> dict:
    r = requests.post(f"{AIRBCARS_API_URL}?action={action}", json=payload, timeout=20)
    try:
        data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid upstream response")
    return data


# ---------- Models ----------
class BookingCreate(BaseModel):
    car_id: str
    car_name: Optional[str] = None
    first_name: str
    last_name: str
    country_code: str = "+212"
    whatsapp: str
    pickup_date: str  # YYYY-MM-DD
    return_date: str  # YYYY-MM-DD
    pickup_city: str
    payment_method: str = "cash"


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "AIRBCARS API proxy"}


@api_router.get("/cars")
async def get_cars(
    page: int = 1,
    limit: int = 20,
    category: Optional[str] = None,
    transmission: Optional[str] = None,
    fuel_type: Optional[str] = None,
    city: Optional[str] = None,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
):
    params = {"action": "get_cars", "page": page, "limit": limit}
    for k, v in {
        "category": category,
        "transmission": transmission,
        "fuel_type": fuel_type,
        "city": city,
        "min_price": min_price,
        "max_price": max_price,
    }.items():
        if v is not None and v != "":
            params[k] = v
    try:
        data = await run_in_threadpool(_upstream_get, params)
    except Exception as e:
        logger.error(f"get_cars upstream error: {e}")
        raise HTTPException(status_code=502, detail="Failed to load cars")
    return data


@api_router.get("/cars/{car_id}")
async def get_car_details(car_id: str):
    try:
        data = await run_in_threadpool(
            _upstream_get, {"action": "get_car_details", "id": car_id}
        )
    except Exception as e:
        logger.error(f"get_car_details upstream error: {e}")
        raise HTTPException(status_code=502, detail="Failed to load car details")
    if not data.get("success"):
        raise HTTPException(status_code=404, detail="Car not found")

    # Enrich with the franchise (security deposit) which the mobile API omits
    # but the website exposes on booking.php.
    def _franchise():
        try:
            page = requests.get(
                f"{AIRBCARS_BOOKING_PAGE}?id={car_id}", timeout=15
            )
            m = FRANCHISE_RE.search(page.text)
            return float(m.group(1)) if m else None
        except Exception:
            return None

    franchise = await run_in_threadpool(_franchise)
    if franchise is not None and isinstance(data.get("car"), dict):
        data["car"]["franchise_fee"] = franchise
    return data


@api_router.get("/car-price")
async def get_car_price(car_id: str, pickup_date: str, return_date: str):
    """Proxy the real pricing engine (temporary pricing + short-term supplement)."""
    def _call():
        r = requests.get(
            AIRBCARS_PRICE_URL,
            params={
                "car_id": car_id,
                "pickup_date": pickup_date,
                "return_date": return_date,
            },
            timeout=20,
        )
        r.raise_for_status()
        return r.json()

    try:
        data = await run_in_threadpool(_call)
    except Exception as e:
        logger.error(f"get_car_price upstream error: {e}")
        raise HTTPException(status_code=502, detail="Failed to compute price")
    return data


def _create_upstream_booking(booking: "BookingCreate") -> dict:
    """Replicates the website flow: fetch CSRF token + session cookie from
    booking.php, then POST the form to api/bookings.php."""
    session = requests.Session()
    page = session.get(f"{AIRBCARS_BOOKING_PAGE}?id={booking.car_id}", timeout=20)
    match = CSRF_RE.search(page.text)
    if not match:
        raise HTTPException(status_code=502, detail="Could not obtain booking token")
    csrf_token = match.group(1)

    form = {
        "csrf_token": csrf_token,
        "car_id": booking.car_id,
        "first_name": booking.first_name,
        "last_name": booking.last_name,
        "country_code": booking.country_code,
        "whatsapp": re.sub(r"[^0-9]", "", booking.whatsapp),
        "pickup_date": booking.pickup_date,
        "return_date": booking.return_date,
        "pickup_city": booking.pickup_city,
        "payment_method": booking.payment_method,
    }
    resp = session.post(AIRBCARS_BOOKINGS_URL, data=form, timeout=20)
    try:
        return resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="Invalid booking response")


@api_router.post("/bookings")
async def create_booking(booking: BookingCreate):
    try:
        data = await run_in_threadpool(_create_upstream_booking, booking)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_booking upstream error: {e}")
        raise HTTPException(status_code=502, detail="Failed to create booking")

    if not data.get("success"):
        raise HTTPException(
            status_code=422, detail=data.get("error", "Booking failed")
        )

    # Persist a local copy only on a real success.
    record = {
        "id": str(uuid.uuid4()),
        "car_id": booking.car_id,
        "car_name": booking.car_name,
        "first_name": booking.first_name,
        "last_name": booking.last_name,
        "country_code": booking.country_code,
        "whatsapp": booking.whatsapp,
        "pickup_date": booking.pickup_date,
        "return_date": booking.return_date,
        "pickup_city": booking.pickup_city,
        "booking_number": data.get("booking_number"),
        "pin_code": data.get("pin_code"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bookings.insert_one({**record})
    return data


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
