// AIRBCARS design tokens — "iOS-Native Clean" monochrome charcoal/white.
export const colors = {
  surface: "#FFFFFF",
  onSurface: "#1F2937",
  surfaceSecondary: "#F3F4F6",
  surfaceTertiary: "#E5E7EB",
  onSurfaceTertiary: "#4B5563",
  surfaceInverse: "#1E3A8A",
  onSurfaceInverse: "#FFFFFF",
  brand: "#2563EB",
  brandSecondary: "#1D4ED8",
  brandTertiary: "#DBEAFE",
  success: "#2D6A4F",
  onSuccess: "#FFFFFF",
  warning: "#B45309",
  error: "#DC2626",
  whatsapp: "#25D366",
  border: "#E5E7EB",
  borderStrong: "#CBD5E1",
  divider: "#F1F5F9",
  muted: "#6B7280",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const font = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
  arRegular: "NotoArabic-Regular",
  arMedium: "NotoArabic-Medium",
};

export const fontSize = {
  sm: 12,
  base: 14,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
};

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  float: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const CITIES = [
  "Agadir",
  "Casablanca",
  "Fes",
  "Marrakech",
  "Rabat",
  "Tangier",
];

// Representative city photos for the visual city selector.
export const CITY_IMAGES: Record<string, string> = {
  Agadir:
    "https://airbcars.ma/uploads/bibliotheques/68e437a12eea5_1759786913.webp",
  Casablanca:
    "https://customer-assets.emergentagent.com/job_carrent-mobile-1/artifacts/1ux337vs_casablanca.webp",
  Fes: "https://customer-assets.emergentagent.com/job_carrent-mobile-1/artifacts/uysspepq_fes.webp",
  Marrakech:
    "https://customer-assets.emergentagent.com/job_carrent-mobile-1/artifacts/8foz2zia_Marrakech.webp",
  Rabat:
    "https://customer-assets.emergentagent.com/job_carrent-mobile-1/artifacts/h9jdl00p_Rabat.webp",
  Tangier:
    "https://customer-assets.emergentagent.com/job_carrent-mobile-1/artifacts/0hsodb5e_Tangier.webp",
};

export const CATEGORIES = ["economy", "compact", "suv", "luxury", "van"];
export const TRANSMISSIONS = ["automatic", "manual"];
export const FUELS = ["essence", "diesel"];

export const WHATSAPP_PHONE = "212644466676"; // +212 644-466676
