const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Car = {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: string;
  category: string;
  seats: string;
  transmission: string;
  fuel_type: string;
  price: string;
  partner_name?: string;
  city?: string;
  available: boolean;
  image_url?: string;
};

export type CarDetails = Car & {
  available_cities: string[];
  description: string;
  images: string[];
  franchise_fee?: number;
};

export type CarFilters = {
  page?: number;
  limit?: number;
  category?: string;
  transmission?: string;
  fuel_type?: string;
  city?: string;
  min_price?: number;
  max_price?: number;
};

function qs(params: Record<string, any>) {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      parts.push(`${k}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function fetchCars(filters: CarFilters = {}): Promise<{
  cars: Car[];
  pagination: { page: number; total: number; has_more: boolean };
}> {
  const res = await fetch(`${BASE}/api/cars${qs(filters)}`);
  if (!res.ok) throw new Error("Failed to load cars");
  const data = await res.json();
  return {
    cars: data.cars || [],
    pagination: data.pagination || { page: 1, total: 0, has_more: false },
  };
}

export async function fetchFeaturedCars(): Promise<Car[]> {
  const res = await fetch(`${BASE}/api/featured-cars`);
  if (!res.ok) throw new Error("Failed to load featured cars");
  const data = await res.json();
  return data.cars || [];
}

export type Review = {
  name: string;
  avatar: string;
  date: string;
  rating: number;
  text: string;
};

export async function fetchReviews(): Promise<{
  reviews: Review[];
  average: number;
  count: number;
}> {
  const res = await fetch(`${BASE}/api/reviews`);
  if (!res.ok) throw new Error("Failed to load reviews");
  const data = await res.json();
  return { reviews: data.reviews || [], average: data.average || 5, count: data.count || 0 };
}

export async function submitContact(payload: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const res = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to send message");
}

export async function fetchCarDetails(id: string): Promise<CarDetails> {
  const res = await fetch(`${BASE}/api/cars/${id}`);
  if (!res.ok) throw new Error("Failed to load car details");
  const data = await res.json();
  return data.car;
}

export type BookingPayload = {
  car_id: string;
  car_name?: string;
  first_name: string;
  last_name: string;
  country_code: string;
  whatsapp: string;
  pickup_date: string; // YYYY-MM-DD
  return_date: string; // YYYY-MM-DD
  pickup_city: string;
  payment_method?: string;
};

export type PriceBreakdown = {
  success: boolean;
  total_price: number;
  base_price_without_supplement: number;
  average_daily_price: number;
  total_days: number;
  has_short_term_supplement: boolean;
  supplement_percentage: number;
  supplement_amount: number;
};

export async function fetchCarPrice(
  carId: string,
  pickup: string,
  ret: string,
): Promise<PriceBreakdown> {
  const res = await fetch(
    `${BASE}/api/car-price?car_id=${carId}&pickup_date=${pickup}&return_date=${ret}`,
  );
  if (!res.ok) throw new Error("Failed to compute price");
  return res.json();
}

export async function createBooking(payload: BookingPayload): Promise<any> {
  const res = await fetch(`${BASE}/api/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.error || data.detail || "Booking failed");
  }
  return data;
}
