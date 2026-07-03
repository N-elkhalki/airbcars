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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

AIRBCARS_API_URL = os.environ['AIRBCARS_API_URL']

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
    customer_name: str
    customer_email: str
    customer_phone: str
    pickup_date: str
    return_date: str
    pickup_city: Optional[str] = None
    notes: Optional[str] = None


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
    return data


@api_router.post("/bookings")
async def create_booking(booking: BookingCreate):
    payload = {
        "car_id": booking.car_id,
        "customer_name": booking.customer_name,
        "customer_email": booking.customer_email,
        "customer_phone": booking.customer_phone,
        "pickup_date": booking.pickup_date,
        "return_date": booking.return_date,
    }
    if booking.notes:
        payload["notes"] = booking.notes
    try:
        data = await run_in_threadpool(_upstream_post, "create_booking", payload)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_booking upstream error: {e}")
        raise HTTPException(status_code=502, detail="Failed to create booking")

    # Persist a local copy so we can serve reliable history / analytics.
    record = {
        "id": str(uuid.uuid4()),
        "car_id": booking.car_id,
        "car_name": booking.car_name,
        "customer_name": booking.customer_name,
        "customer_email": booking.customer_email,
        "customer_phone": booking.customer_phone,
        "pickup_date": booking.pickup_date,
        "return_date": booking.return_date,
        "pickup_city": booking.pickup_city,
        "upstream": data,
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
