
export interface PackageDetails {
  id: string;
  name: string;
  flightType: string;
  duration: string;
  hotelMakkah: string;
  hotelMadinah: string;
  hotelTaif: string;
  meals: string;
  transport: string;
  inclusions: string[];
  exclusions: string[];
  priceDouble: number;
  priceTriple: number;
  priceQuad: number;
}

export interface QuotationData {
  referenceNumber: string;
  date: string;
  clientName: string;
  salesperson: string;
  office: string;
  packageId: string;
  roomType: 'double' | 'triple' | 'quad';
  pax: number | '';
  startDate: string;
  endDate: string;
}

export interface UserProfile {
  name: string;
  email: string;
  office: string;
}
