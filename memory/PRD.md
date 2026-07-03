# AIRBCARS Mobile App — PRD

## Original Problem Statement
User owns airbcars.ma (Morocco car rental marketplace) and wants a mobile app for the website that displays listed cars and lets users book.

## Architecture
- **Frontend**: Expo Router (SDK 54), file-based routing, bottom tabs. Plus Jakarta Sans fonts. i18n FR/EN/AR context. Design: "iOS-Native Clean" monochrome charcoal/white (`/app/design_guidelines.json`).
- **Backend**: FastAPI proxy to the official AIRBCARS endpoints + MongoDB copy of successful bookings.
- **Data source**: Real airbcars.ma APIs (no mock).
  - `mobile_api.php?action=get_cars` / `get_car_details` — car catalog.
  - `api/get_car_price.php` — pricing engine (temporary pricing + short-term supplement).
  - `booking.php` (CSRF token + PHP session) → `api/bookings.php` — real booking creation (returns booking_number + pin_code).

## Backend endpoints (`/api` prefix)
- `GET /api/cars` (filters: page, limit, category, transmission, fuel_type, city, min_price, max_price)
- `GET /api/cars/{id}`
- `GET /api/car-price?car_id&pickup_date&return_date`
- `POST /api/bookings` (first_name, last_name, country_code, whatsapp, pickup_date, return_date, pickup_city, payment_method) → CSRF+session upstream flow

## User Personas
- Tourist/traveler renting a car in Morocco; browses by city/category, books with WhatsApp follow-up.

## Core Requirements (static)
- Browse cars, filter, view details, book (real booking), WhatsApp/phone contact, trilingual, no login.

## Implemented (2026-06)
- Home (hero with official logo, city chips, category cards, **featured cars matching website homepage**)
- Cars listing with sticky filter chip rows + pagination/infinite scroll
- Car details (image carousel, specs, available cities, franchise, Book Now + WhatsApp)
- Booking flow: first/last name, WhatsApp + searchable country picker (225 countries), custom cross-platform calendar (3-day min), live price breakdown (daily/subtotal/short-term supplement/franchise/total), cash payment, real booking → reference + PIN, Finish-on-WhatsApp
- My Bookings (local history w/ reference + PIN)
- Settings: FR/EN/AR language switch, contact rows, "Send a message" → Contact form
- **Contact form** (name/email/message → POST /api/contact, stored in Mongo)
- **Website blue theme (#2563EB) + official AIRBCARS logo** (react-native-svg) on Home & Settings
- **Booking Detail screen** (mirrors booking-confirmation.php): tap a reservation → car, reference, PIN, customer name/phone, dates, city, total, live status, Next Steps, WhatsApp CTA
- **Status-change alerts**: My Bookings refresh detects live status changes and fires a local notification (expo-notifications, native only) + updates the badge in place
- Verified via testing agent (backend 24/24, all frontend flows green)

## Notes
- Local status notifications work on native/dev build; web preview is guarded (no-op). True remote/background push would need a build + a server trigger.

## Backend endpoints (added)
- `GET /api/featured-cars` (scrapes homepage featured ids + enriches from catalog)
- `POST /api/contact` (forwards to airbcars email_endpoint.php type=contact + stores in Mongo)
- `GET /api/reviews` (scrapes Google reviews from homepage: name/avatar/date/rating/text + average)
- `GET /api/booking-status?booking_number&pin_code` (reads live reservation status from booking-confirmation.php)
- `GET /api/booking-lookup?booking_number&pin_code` (imports a full reservation made on website/WhatsApp: parses confirmation page + matches car image from catalog)

## Known external issue
- airbcars.ma `api/email_endpoint.php` currently returns HTTP 500 (their server-side mail config). Contact forwarding therefore returns `forwarded:false`; the app still stores every message in Mongo (`db.contacts`) so nothing is lost — deliveries will flow automatically once their mail server is fixed.

## Backlog / Remaining
- P1: Confirm/fix email_endpoint delivery (their side) or add Resend for guaranteed email
- P2: Full RTL layout mirroring for Arabic (text alignment done; forceRTL needs relaunch)
- P2: Admin view / notification for submitted contact messages
- P2: Per-car reviews (site table mostly empty; homepage Google reviews shown site-wide)

## Next Tasks
- Consider searchable country picker and deposit display; add pagination.
