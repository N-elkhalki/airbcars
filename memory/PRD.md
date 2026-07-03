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
- Home (hero, city chips, category cards, featured cars)
- Cars listing with sticky filter chip rows (city/category/transmission/fuel)
- Car details (image carousel, specs, available cities, Book Now + WhatsApp)
- Booking flow: first/last name, WhatsApp + country code, 3-day min rental, live price breakdown (daily/subtotal/short-term supplement/total), cash payment, real booking → reference + PIN, Finish-on-WhatsApp
- My Bookings (local AsyncStorage history w/ reference + PIN)
- Settings: FR/EN/AR language switch, contact rows (WhatsApp/call/email)
- Verified via testing agent (backend 11/11, frontend flows green)

## Backlog / Remaining
- P1: Country-code full searchable picker (currently common codes only)
- P1: Franchise/deposit line in summary (mobile API doesn't expose franchise_fee)
- P2: Pull-to-refresh on cars list, pagination/infinite scroll (currently limit 50)
- P2: Full RTL layout mirroring for Arabic (text alignment done; forceRTL needs app relaunch)
- P2: Reviews section on car details (website has reviews)

## Next Tasks
- Consider searchable country picker and deposit display; add pagination.
