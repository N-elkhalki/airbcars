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
import time
import smtplib
import ssl
from email.mime.text import MIMEText
from email.utils import formataddr

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
AIRBCARS_HOME_URL = f"{AIRBCARS_BASE}/"
AIRBCARS_EMAIL_URL = f"{AIRBCARS_BASE}/api/email_endpoint.php"
AIRBCARS_CONFIRM_URL = f"{AIRBCARS_BASE}/booking-confirmation.php"

SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER or "")
CONTACT_TO = os.environ.get("CONTACT_TO", SMTP_USER or "")
CSRF_RE = re.compile(r'name="csrf_token"\s+value="([^"]+)"')
FRANCHISE_RE = re.compile(r'const franchiseFee\s*=\s*([0-9.]+)')
FEATURED_ID_RE = re.compile(r'booking\.php\?id=(\d+)')
STATUS_RE = re.compile(r'info-label">Status:</span>\s*<span[^>]*>\s*([A-Za-z]+)\s*</span>', re.S)
INFO_PAIR_RE = re.compile(r'info-label">(.*?)</span>\s*<span[^>]*>(.*?)</span>', re.S)
TAG_RE = re.compile(r'<[^>]+>')

# Review parsing (Google reviews rendered on the homepage)
_REVIEW_NAME_RE = re.compile(r'reviewer-name">(.*?)</div>', re.S)
_REVIEW_AVATAR_RE = re.compile(r'avatar" src="(.*?)"')
_REVIEW_DATE_RE = re.compile(r'<span>•\s*(.*?)</span>', re.S)
_REVIEW_TEXT_RE = re.compile(r'review-text">\s*(.*?)\s*</div>', re.S)
_reviews_cache: dict = {"items": [], "ts": 0.0}

# Simple in-memory cache for featured car ids scraped from the homepage.
_featured_cache: dict = {"ids": [], "ts": 0.0}

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def send_email(subject: str, body: str, to: str = None, reply_to: str = None) -> bool:
    """Sends an email through the configured SMTP server. Returns True on
    success. Never raises — email failures must not break the request."""
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        return False
    recipient = to or CONTACT_TO
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = formataddr(("AIRBCARS App", SMTP_FROM))
        msg["To"] = recipient
        if reply_to:
            msg["Reply-To"] = reply_to
        ctx = ssl.create_default_context()
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20, context=ctx) as s:
                s.login(SMTP_USER, SMTP_PASSWORD)
                s.sendmail(SMTP_FROM, [recipient], msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
                s.starttls(context=ctx)
                s.login(SMTP_USER, SMTP_PASSWORD)
                s.sendmail(SMTP_FROM, [recipient], msg.as_string())
        return True
    except Exception as e:
        logger.error(f"send_email failed: {e}")
        return False



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


class ContactCreate(BaseModel):
    name: str
    email: str
    message: str


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "AIRBCARS API proxy"}


@api_router.get("/featured-cars")
async def get_featured_cars():
    """Returns the same featured selection shown on the airbcars.ma homepage,
    by scraping the featured car IDs from the homepage and enriching them with
    catalog data from the mobile API."""
    def _scrape_ids():
        now = time.time()
        if _featured_cache["ids"] and now - _featured_cache["ts"] < 600:
            return _featured_cache["ids"]
        html = requests.get(AIRBCARS_BASE + "/", timeout=20).text
        ids: list = []
        for m in FEATURED_ID_RE.finditer(html):
            if m.group(1) not in ids:
                ids.append(m.group(1))
        ids = ids[:12]
        if ids:
            _featured_cache["ids"] = ids
            _featured_cache["ts"] = now
        return ids

    try:
        ids = await run_in_threadpool(_scrape_ids)
        catalog = await run_in_threadpool(
            _upstream_get, {"action": "get_cars", "page": 1, "limit": 200}
        )
    except Exception as e:
        logger.error(f"featured-cars upstream error: {e}")
        raise HTTPException(status_code=502, detail="Failed to load featured cars")

    by_id = {c["id"]: c for c in catalog.get("cars", [])}
    featured = [by_id[i] for i in ids if i in by_id]
    if not featured:  # fallback to first catalog cars
        featured = catalog.get("cars", [])[:8]
    return {"success": True, "cars": featured}


@api_router.get("/reviews")
async def get_reviews():
    """Google reviews scraped from the airbcars.ma homepage (social proof)."""
    def _scrape():
        now = time.time()
        if _reviews_cache["items"] and now - _reviews_cache["ts"] < 1800:
            return _reviews_cache["items"]
        html = requests.get(AIRBCARS_HOME_URL, timeout=20).text
        blocks = html.split('<div class="review-card"')[1:]
        items = []
        for b in blocks:
            name = _REVIEW_NAME_RE.search(b)
            text = _REVIEW_TEXT_RE.search(b)
            if not name or not text:
                continue
            avatar = _REVIEW_AVATAR_RE.search(b)
            date = _REVIEW_DATE_RE.search(b)
            items.append({
                "name": name.group(1).strip(),
                "avatar": avatar.group(1) if avatar else "",
                "date": date.group(1).strip() if date else "",
                "rating": min(b.count("star-filled"), 5),
                "text": re.sub(r"\s+", " ", text.group(1)).strip(),
            })
        if items:
            _reviews_cache["items"] = items
            _reviews_cache["ts"] = now
        return items

    try:
        items = await run_in_threadpool(_scrape)
    except Exception as e:
        logger.error(f"reviews scrape error: {e}")
        items = []
    avg = round(sum(r["rating"] for r in items) / len(items), 1) if items else 5.0
    return {"success": True, "reviews": items, "average": avg, "count": len(items)}


@api_router.get("/booking-lookup")
async def booking_lookup(booking_number: str, pin_code: str):
    """Imports a reservation made elsewhere (website/WhatsApp) by reading the
    full confirmation page (validated by booking_number + pin_code)."""
    def _fetch():
        r = requests.get(
            AIRBCARS_CONFIRM_URL,
            params={"booking_number": booking_number, "pin_code": pin_code},
            timeout=20,
            allow_redirects=False,
        )
        if r.status_code != 200:
            return None
        info = {}
        for label, val in INFO_PAIR_RE.findall(r.text):
            key = TAG_RE.sub("", label).strip().rstrip(":").lower()
            value = re.sub(r"\s+", " ", TAG_RE.sub("", val)).strip()
            info[key] = value
        return info or None

    try:
        info = await run_in_threadpool(_fetch)
    except Exception as e:
        logger.error(f"booking-lookup error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch booking")
    if not info or not info.get("booking number"):
        raise HTTPException(status_code=404, detail="Booking not found")

    car_name = info.get("car", "")
    total_raw = info.get("total amount", "").replace("€", "").replace(",", "").strip()
    try:
        total = float(total_raw) if total_raw else None
    except ValueError:
        total = None

    # Best-effort: match the car in the catalog to get an image + car_id.
    car_id = ""
    car_image = ""
    try:
        catalog = await run_in_threadpool(
            _upstream_get, {"action": "get_cars", "page": 1, "limit": 200}
        )
        norm = car_name.replace(" ", "").lower()
        for c in catalog.get("cars", []):
            cn = c.get("name", "").replace(" ", "").lower()
            if norm and (cn == norm or norm in cn or cn.startswith(norm)):
                car_id = c.get("id", "")
                car_image = c.get("image_url", "")
                break
    except Exception:
        pass

    return {
        "success": True,
        "booking": {
            "reference": info.get("booking number", ""),
            "pin_code": info.get("pin code", ""),
            "customer_name": info.get("customer name", ""),
            "customer_phone": info.get("phone number", ""),
            "car_name": car_name,
            "car_id": car_id,
            "car_image": car_image,
            "pickup_date": info.get("pickup date", ""),
            "return_date": info.get("return date", ""),
            "pickup_city": info.get("pickup city", ""),
            "total_price": total,
            "status": info.get("status", "pending").lower(),
        },
    }


@api_router.get("/booking-status")
async def booking_status(booking_number: str, pin_code: str):
    """Reads the live reservation status from the website's confirmation page
    (validated by booking_number + pin_code)."""
    def _fetch():
        r = requests.get(
            AIRBCARS_CONFIRM_URL,
            params={"booking_number": booking_number, "pin_code": pin_code},
            timeout=20,
            allow_redirects=False,
        )
        if r.status_code != 200:
            return None
        m = STATUS_RE.search(r.text)
        return m.group(1).strip().lower() if m else None

    try:
        status = await run_in_threadpool(_fetch)
    except Exception as e:
        logger.error(f"booking-status error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch status")
    if status is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"success": True, "status": status}


@api_router.post("/contact")
async def create_contact(contact: ContactCreate):
    record = {
        "id": str(uuid.uuid4()),
        "name": contact.name,
        "email": contact.email,
        "message": contact.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    # Deliver the message to the business inbox via SMTP.
    subject = f"[App] Nouveau message de {contact.name}"
    body = (
        f"Nom: {contact.name}\n"
        f"Email: {contact.email}\n\n"
        f"Message:\n{contact.message}\n"
    )
    sent = await run_in_threadpool(
        send_email, subject, body, CONTACT_TO, contact.email
    )
    record["email_sent"] = sent
    await db.contacts.insert_one({**record})
    return {"success": True, "message": "Message received", "email_sent": sent}


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

    # Notify the business of the new reservation.
    subject = f"[App] Nouvelle réservation {data.get('booking_number', '')}"
    body = (
        f"Réservation: {data.get('booking_number', '')}\n"
        f"Client: {booking.first_name} {booking.last_name}\n"
        f"WhatsApp: {booking.country_code} {booking.whatsapp}\n"
        f"Voiture: {booking.car_name} (id {booking.car_id})\n"
        f"Du {booking.pickup_date} au {booking.return_date}\n"
        f"Ville: {booking.pickup_city}\n"
    )
    await run_in_threadpool(send_email, subject, body, CONTACT_TO, None)
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
