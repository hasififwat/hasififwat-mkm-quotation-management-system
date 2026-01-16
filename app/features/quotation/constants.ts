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
  status: "published" | "unpublished";
}

export const MOCK_PACKAGES: PackageDetails[] = [
  {
    id: "umj-standard-2026",
    name: "UMJ STANDARD",
    flightType: "MALAYSIA AIRLINES",
    duration: "2H1M (TAIF) 6H5M (MEKAH) 5H4M (MADINAH) / 12 HARI 10 MALAM",
    hotelMakkah:
      "MOVENPICK HOTEL @ SETARAF (+-50 METER DARI DATARAN MASJIDIL HARAM)",
    hotelMadinah:
      "NOZOL ROYAL INN HOTEL @ SETARAF (+-200 METER DARI DATARAN MASJID NABAWI)",
    hotelTaif: "SWISS INTERNATIONAL HOTEL @ SETARAF",
    meals: "BREAKFAST (MAKKAH), FULLBOARD (MADINAH) & HALFBOARD (TAIF)",
    transport: "SPEED TRAIN & BAS",
    inclusions: [
      "TIKET PENERBANGAN ANTARABANGSA",
      "PENGINAPAN SEPANJANG PROGRAM",
      "MUTAWWIF DARI MALAYSIA & PETUGAS DI SAUDI",
      "KAD PERUBATAN",
      "VISA ZIARAH",
      "PERKARA LAIN YANG DISEBUTKAN DIDALAM SEBUTHARGA SAHAJA",
    ],
    exclusions: [
      "PERBELANJAAN HARIAN, DOBI",
      "PERKHIDMATAN TAMBAHAN PIHAK HOTEL",
      "PERKARA-PERKARA LAIN YANG TIDAK DISEBUT DALAM SEBUTHARGA",
      "LEBIHAN BAGASI (BERAT MELEBIHI HAD YANG TELAH DITETAPKAN OLEH PIHAK SYARIKAT PENERBANGAN)",
    ],
    priceDouble: 11890,
    priceTriple: 10590,
    priceQuad: 9790,
    // Fix: Added missing status property
    status: "published",
  },
  {
    id: "umj-premium-2026",
    name: "UMJ PREMIUM",
    flightType: "SAUDI ARABIAN AIRLINES",
    duration: "7H6M (MEKAH) 5H4M (MADINAH) / 13 HARI 11 MALAM",
    hotelMakkah: "FAIRMONT CLOCK TOWER @ SETARAF",
    hotelMadinah: "PULLMAN ZAMZAM @ SETARAF",
    hotelTaif: "N/A",
    meals: "FULLBOARD ALL THE WAY",
    transport: "PRIVATE GMC & SPEED TRAIN",
    inclusions: [
      "TIKET PENERBANGAN BUSINESS CLASS",
      "PENGINAPAN VIP",
      "MUTAWWIF PERSONAL",
    ],
    exclusions: ["PERSONAL EXPENSES"],
    priceDouble: 15500,
    priceTriple: 13200,
    priceQuad: 11800,
    // Fix: Added missing status property
    status: "published",
  },
];

export const TERMS_AND_CONDITIONS = [
  "SEBARANG PERUBAHAN TERTAKLUK KEPADA MASA PEMBAYARAN, PERUBAHAN HARGA SEMASA HOTEL, PENGANGKUTAN DAN VISA",
  "SEBUT HARGA DIATAS TERTAKLUK KEPADA TERMA MASA YANG DITETAPKAN. SEBARANG PERUBAHAN HARGA SELEPAS TAMAT TERMA MASA ADALAH ATAS TANGGUNGAN JEMAAH SENDIRI.",
  "BAYARAN DEPOSIT RM 500/PAX PERLU DIDEBITKAN KE AKAUN AMBANK 88840 0112 8417 , MKM UMRAH HQ",
  "SEBARANG PERTANYAAN DAN MAKLUMBALAS BOLEH HUBUNGI BAHAGIAN UMRAH DI TALIAN 03-7831 6740 / CIK UMU 011 - 021972006",
  "PEMBAYARAN PENUH PERLU DIJELASKAN 45 HARI SEBELUM TARIKH PENERBANGAN",
];
