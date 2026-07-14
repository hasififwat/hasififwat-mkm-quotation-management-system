export type MatchStatus = "MATCHED" | "NEW" | "ORPHAN";
export type FlightDiffStatus = "added" | "removed" | "unchanged" | "edited" | "no_db_package";

export type PackageMappingRow = {
  season_code: string;
  season_raw: string;
  season_start: string;
  season_end: string;
  canonical_name: string;
  price_list_segment: string;
  qdp_price: number | null;
  tpl_price: number | null;
  dbl_price: number | null;
  sgl_price: number | null;
  duration: string;
  flight: string;
  match_status: MatchStatus;
  db_id: string;
  db_name: string;
  db_season: string;
  db_status: string;
  transport: string;
  makkah_hotel: string;
  makkah_meals: string;
  madinah_hotel: string;
  madinah_meals: string;
  aziziah_hotel: string;
  aziziah_meals: string;
  taif_hotel: string;
  taif_meals: string;
};

export type FlightDiffRow = {
  status: FlightDiffStatus;
  package_name: string;
  season: string;
  departure_date: string;
  departure_sector: string;
  return_date: string;
  return_sector: string;
  airline: string;
  dep_flight: string;
  ret_flight: string;
  db_package_id: string;
  db_flight_id: string;
  notes: string;
  // populated for "edited" rows only
  db_airline?: string;
  db_dep_sector?: string;
  db_ret_sector?: string;
};

export type SyncHotel = {
  hotel_type: string;
  name: string;
  meals: string[];
};

export type SyncRoom = {
  room_type: string;
  price: number;
  enabled: boolean;
};

export type PackageCreateSpec = {
  kind: "create";
  name: string;
  season: string;
  year: string;
  duration: string;
  transport: string;
  hotels: SyncHotel[];
  rooms: SyncRoom[];
  clone_from_id: string | null;
  clone_from_label: string | null;
  row: PackageMappingRow;
};

export type FieldChange = {
  field: string;
  old: string;
  new: string;
};

export type PackageUpdateSpec = {
  kind: "update";
  db_id: string;
  db_name: string;
  current_transport: string;
  transport: string;
  current_hotels: SyncHotel[];
  hotels: SyncHotel[];
  rooms: SyncRoom[];
  changes: FieldChange[];
  row: PackageMappingRow;
};

export type FlightAddSpec = {
  kind: "add";
  db_package_id: string;
  package_name: string;
  season: string;
  departure_date: string;
  departure_sector: string;
  return_date: string;
  return_sector: string;
  month: string;
  needs_new_package: boolean;
  unresolvable: boolean;
  row: FlightDiffRow;
};

export type FlightRemoveSpec = {
  kind: "remove";
  db_flight_id: string;
  package_name: string;
  season: string;
  departure_date: string;
  return_date: string;
  row: FlightDiffRow;
};

export type DbFlight = {
  _id: string;
  package_id: string;
  package_name: string;
  package_season: string;
  month: string;
  flight: string;
  return_flight: string;
  departure_date: string;
  departure_sector: string;
  return_date: string;
  return_sector: string;
  source: "sync" | "manual";
};

export type SyncPlan = {
  packagesToCreate: PackageCreateSpec[];
  packagesToUpdate: PackageUpdateSpec[];
  flightsToAdd: FlightAddSpec[];
  flightsToRemove: FlightRemoveSpec[];
  flightsToPromote: string[]; // DB flight IDs to mark source: "sync"
};

export type ApplyProgress = {
  phase: "packages" | "flights" | "done";
  done: number;
  total: number;
  current: string;
};

export type ApplyResult = {
  created: number;
  updated: number;
  flightsAdded: number;
  flightsRemoved: number;
  errors: string[];
};
