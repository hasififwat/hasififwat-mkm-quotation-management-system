export interface HotelDetails {
  name: string;
  enabled: boolean;
  meals: string[];
  placeholder: string;
}

export interface RoomType {
  label: string;
  value: number;
  enabled: boolean;
}

export interface PackageDetails {
  id?: string | undefined;
  name: string;
  duration: string;
  hotels: {
    makkah: HotelDetails;
    madinah: HotelDetails;
    taif: HotelDetails;
  };
  transport: string;
  inclusions: string[];
  exclusions: string[];
  rooms: RoomType[];

  status: "published" | "unpublished";
}

// Supabase API Response Types
export interface SupabaseHotelDetails {
  id: string;
  name: string;
  enabled: boolean;
  meals: string[];
  placeholder: string;
}

export interface SupabaseInclusionItem {
  id: string;
  sort_order: number;
  description: string;
}

export interface SupabaseExclusionItem {
  id: string;
  sort_order: number;
  description: string;
}

export interface SupabaseRoomType {
  id: string;
  room_type: string;
  price: number;
  enabled: boolean;
}

export interface SupabaseFlightDetails {
  id: string;
  month: string;
  return_date: string;
  return_sector: string;
  departure_date: string;
  departure_sector: string;
}

export interface SupabasePackageDetails {
  id: string;
  name: string;
  package_code: string;
  year: string;
  duration: string;
  transport: string | null;
  status: "published" | "unpublished";
  created_at: string;
  updated_at: string;
  flights: SupabaseFlightDetails[];
  hotels: {
    makkah?: SupabaseHotelDetails;
    madinah?: SupabaseHotelDetails;
    taif?: SupabaseHotelDetails;
  } | null;
  inclusions: SupabaseInclusionItem[];
  exclusions: SupabaseExclusionItem[];
  rooms: SupabaseRoomType[];
}

export interface QuotationData {
  referenceNumber: string;
  date: string;
  clientName: string;
  salesperson: string;
  office: string;
  packageId: string;
  flightType: string;
  roomType: "double" | "triple" | "quad";
  pax: number | "";
  startDate: string;
  endDate: string;
}

export interface SavedQuotation extends QuotationData {
  id: string;
  createdAt: string;
  totalPrice: number;
}
