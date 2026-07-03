import { storage } from "@/src/utils/storage";

export type LocalBooking = {
  id: string;
  reference: string; // booking_number
  pin_code?: string;
  car_id: string;
  car_name: string;
  car_image?: string;
  customer_name?: string;
  customer_phone?: string;
  pickup_date: string;
  return_date: string;
  pickup_city?: string;
  total_price?: number;
  status: string;
  created_at: string;
};

const KEY = "airbcars_bookings";

export async function getBookings(): Promise<LocalBooking[]> {
  const raw = await storage.getItem<string>(KEY, "[]");
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

export async function addBooking(b: LocalBooking): Promise<void> {
  const list = await getBookings();
  list.unshift(b);
  await storage.setItem(KEY, JSON.stringify(list));
}

export async function updateBookingStatus(
  id: string,
  status: string,
): Promise<void> {
  const list = await getBookings();
  const next = list.map((b) => (b.id === id ? { ...b, status } : b));
  await storage.setItem(KEY, JSON.stringify(next));
}
