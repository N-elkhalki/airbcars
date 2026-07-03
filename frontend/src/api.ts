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

export async function fetchCarDetails(id: string): Promise<CarDetails> {
  const res = await fetch(`${BASE}/api/cars/${id}`);
  if (!res.ok) throw new Error("Failed to load car details");
  const data = await res.json();
  return data.car;
}

export type BookingPayload = {
  car_id: string;
  car_name?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pickup_date: string;
  return_date: string;
  pickup_city?: string;
  notes?: string;
};

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
