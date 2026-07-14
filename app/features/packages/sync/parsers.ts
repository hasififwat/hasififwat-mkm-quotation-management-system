import type {
  FieldChange,
  FlightAddSpec,
  FlightDiffRow,
  FlightRemoveSpec,
  PackageCreateSpec,
  PackageMappingRow,
  PackageUpdateSpec,
  SyncHotel,
  SyncPlan,
  SyncRoom,
} from "./types";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parsePrice(val: string): number | null {
  const cleaned = val.replace(/,/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return isNaN(n) ? null : n;
}

function yearFromSeasonStart(dateStr: string): string {
  const year = parseInt(dateStr.substring(0, 4), 10);
  return `${year}/${year + 1}`;
}

export function mealShorthandToTypes(shorthand: string): string[] {
  const s = shorthand.trim().toUpperCase();
  switch (s) {
    case "FB":
      return ["BREAKFAST", "LUNCH", "DINNER"];
    case "HB":
      return ["BREAKFAST", "DINNER"];
    case "BB":
      return ["BREAKFAST"];
    case "":
      return [];
    default:
      // MATCHED rows store full meal types joined with "+" e.g. "BREAKFAST+LUNCH+DINNER"
      return s.split("+").map((m) => m.trim()).filter(Boolean);
  }
}

function buildHotels(row: PackageMappingRow): SyncHotel[] {
  const hotels: SyncHotel[] = [];
  const add = (type: string, name: string, meals: string) =>
    hotels.push({ hotel_type: type, name: name.trim(), meals: mealShorthandToTypes(meals) });
  add("MAKKAH", row.makkah_hotel, row.makkah_meals);
  add("MADINAH", row.madinah_hotel, row.madinah_meals);
  if (row.aziziah_hotel || row.aziziah_meals) add("AZIZIAH", row.aziziah_hotel, row.aziziah_meals);
  if (row.taif_hotel || row.taif_meals) add("TAIF", row.taif_hotel, row.taif_meals);
  return hotels;
}

function buildRooms(row: PackageMappingRow): SyncRoom[] {
  const rooms: SyncRoom[] = [];
  if (row.qdp_price != null) rooms.push({ room_type: "QDP", price: row.qdp_price, enabled: true });
  if (row.tpl_price != null) rooms.push({ room_type: "TPL", price: row.tpl_price, enabled: true });
  if (row.dbl_price != null) rooms.push({ room_type: "DBL", price: row.dbl_price, enabled: true });
  if (row.sgl_price != null) rooms.push({ room_type: "SGL", price: row.sgl_price, enabled: true });
  return rooms;
}

const MONTH_LABELS = ["JAN", "FEB", "MAC", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DIS"];

function deriveMonth(departureDate: string): string {
  const idx = parseInt(departureDate.substring(5, 7), 10) - 1;
  return MONTH_LABELS[idx] ?? "";
}

export function parsePackageMappingCsv(text: string): PackageMappingRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const col = (vals: string[], name: string) => (vals[headers.indexOf(name)] ?? "").trim();

  return lines
    .slice(1)
    .map((line) => {
      const v = parseCSVLine(line);
      return {
        season_code: col(v, "season_code"),
        season_raw: col(v, "season_raw"),
        season_start: col(v, "season_start"),
        season_end: col(v, "season_end"),
        canonical_name: col(v, "canonical_name"),
        price_list_segment: col(v, "price_list_segment"),
        qdp_price: parsePrice(col(v, "qdp_price")),
        tpl_price: parsePrice(col(v, "tpl_price")),
        dbl_price: parsePrice(col(v, "dbl_price")),
        sgl_price: parsePrice(col(v, "sgl_price")),
        duration: col(v, "duration"),
        flight: col(v, "flight"),
        match_status: col(v, "match_status") as PackageMappingRow["match_status"],
        db_id: col(v, "db_id"),
        db_name: col(v, "db_name"),
        db_season: col(v, "db_season"),
        db_status: col(v, "db_status"),
        transport: col(v, "transport"),
        makkah_hotel: col(v, "makkah_hotel"),
        makkah_meals: col(v, "makkah_meals"),
        madinah_hotel: col(v, "madinah_hotel"),
        madinah_meals: col(v, "madinah_meals"),
        aziziah_hotel: col(v, "aziziah_hotel"),
        aziziah_meals: col(v, "aziziah_meals"),
        taif_hotel: col(v, "taif_hotel"),
        taif_meals: col(v, "taif_meals"),
      } satisfies PackageMappingRow;
    })
    .filter((r) => r.season_code);
}

export function parseFlightDiffCsv(text: string): FlightDiffRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const col = (vals: string[], name: string) => (vals[headers.indexOf(name)] ?? "").trim();

  return lines
    .slice(1)
    .map((line) => {
      const v = parseCSVLine(line);
      return {
        status: col(v, "status") as FlightDiffRow["status"],
        package_name: col(v, "package_name"),
        season: col(v, "season"),
        departure_date: col(v, "departure_date"),
        departure_sector: col(v, "departure_sector"),
        return_date: col(v, "return_date"),
        return_sector: col(v, "return_sector"),
        airline: col(v, "airline"),
        dep_flight: col(v, "dep_flight"),
        ret_flight: col(v, "ret_flight"),
        db_package_id: col(v, "db_package_id"),
        db_flight_id: col(v, "db_flight_id"),
        notes: col(v, "notes"),
      } satisfies FlightDiffRow;
    })
    .filter((r) => r.package_name);
}

type DbHotel = { hotel_type: string; name: string; meals: string[] };
type ExistingPackage = {
  _id: string;
  name: string;
  season?: string | null;
  transport?: string;
  hotels?: DbHotel[];
};

function mealsLabel(meals: string[]): string {
  const sorted = [...meals].sort().join("+");
  if (sorted === "BREAKFAST+DINNER+LUNCH") return "FB";
  if (sorted === "BREAKFAST+DINNER") return "HB";
  if (sorted === "BREAKFAST") return "BB";
  return meals.join(", ") || "none";
}

function computeChanges(spec: Omit<PackageUpdateSpec, "changes">, dbPkg: ExistingPackage): FieldChange[] {
  const changes: FieldChange[] = [];

  const oldTransport = (dbPkg.transport ?? "").trim();
  const newTransport = spec.transport.trim();
  if (oldTransport !== newTransport) {
    changes.push({ field: "Transport", old: oldTransport || "—", new: newTransport || "—" });
  }

  const dbHotelsByType = new Map<string, DbHotel>(
    (dbPkg.hotels ?? []).map((h) => [h.hotel_type.toUpperCase(), h]),
  );

  const allTypes = new Set([
    ...spec.hotels.map((h) => h.hotel_type.toUpperCase()),
    ...(dbPkg.hotels ?? []).map((h) => h.hotel_type.toUpperCase()),
  ]);

  for (const type of allTypes) {
    const dbHotel = dbHotelsByType.get(type);
    const newHotel = spec.hotels.find((h) => h.hotel_type.toUpperCase() === type);
    const oldName = (dbHotel?.name ?? "").trim();
    const newName = (newHotel?.name ?? "").trim();
    if (oldName !== newName) {
      changes.push({ field: `${type} hotel`, old: oldName || "—", new: newName || "—" });
    }
    const oldMeals = mealsLabel(dbHotel?.meals ?? []);
    const newMeals = mealsLabel(newHotel?.meals ?? []);
    if (oldMeals !== newMeals) {
      changes.push({ field: `${type} meals`, old: oldMeals, new: newMeals });
    }
  }

  return changes;
}

// Packages permanently excluded from auto-creation during sync.
// These are either managed manually or use a different workflow.
const EXCLUDED_FROM_SYNC = new Set(["PLATINUM"]);

export function buildSyncPlan(
  mappingRows: PackageMappingRow[],
  flightRows: FlightDiffRow[],
  existingPackages: ExistingPackage[],
): SyncPlan {
  const packagesToCreate: PackageCreateSpec[] = [];
  const packagesToUpdate: PackageUpdateSpec[] = [];

  // Clone source: prefer same-name package with most data (any season)
  const cloneSourceByName = new Map<string, ExistingPackage>();
  for (const pkg of existingPackages) {
    const key = pkg.name.trim().toUpperCase();
    if (!cloneSourceByName.has(key)) cloneSourceByName.set(key, pkg);
  }

  for (const row of mappingRows) {
    if (row.match_status === "ORPHAN") continue;
    if (EXCLUDED_FROM_SYNC.has(row.canonical_name.trim().toUpperCase())) continue;

    const hotels = buildHotels(row);
    const rooms = buildRooms(row);

    if (row.match_status === "NEW") {
      const src = cloneSourceByName.get(row.canonical_name.trim().toUpperCase()) ?? null;
      packagesToCreate.push({
        kind: "create",
        name: row.canonical_name,
        season: row.season_code,
        year: yearFromSeasonStart(row.season_start),
        duration: row.duration,
        transport: row.transport,
        hotels,
        rooms,
        clone_from_id: src?._id ?? null,
        clone_from_label: src ? `${src.name} (${src.season ?? ""})` : null,
        row,
      });
    } else if (row.match_status === "MATCHED" && row.db_id) {
      const dbPkg = existingPackages.find((p) => p._id === row.db_id) ?? null;
      const current_hotels: SyncHotel[] = (dbPkg?.hotels ?? []).map((h) => ({
        hotel_type: h.hotel_type.toUpperCase(),
        name: (h.name ?? "").trim(),
        meals: h.meals ?? [],
      }));
      const spec = {
        kind: "update" as const,
        db_id: row.db_id,
        db_name: row.db_name || row.canonical_name,
        current_transport: (dbPkg?.transport ?? "").trim(),
        transport: row.transport,
        current_hotels,
        hotels,
        rooms,
        row,
      };
      const changes = dbPkg ? computeChanges(spec, dbPkg) : [];
      if (changes.length > 0) {
        packagesToUpdate.push({ ...spec, changes });
      }
    }
  }

  const flightsToAdd: FlightAddSpec[] = [];
  const flightsToRemove: FlightRemoveSpec[] = [];

  const newPackageKeys = new Set(
    packagesToCreate.map((s) => `${s.name.trim().toUpperCase()}|${s.season.trim().toUpperCase()}`),
  );

  for (const row of flightRows) {
    if (row.status === "added") {
      flightsToAdd.push({
        kind: "add",
        db_package_id: row.db_package_id,
        package_name: row.package_name,
        season: row.season,
        departure_date: row.departure_date,
        departure_sector: row.departure_sector,
        return_date: row.return_date,
        return_sector: row.return_sector,
        month: deriveMonth(row.departure_date),
        needs_new_package: false,
        unresolvable: false,
        row,
      });
    } else if (row.status === "no_db_package") {
      const key = `${row.package_name.trim().toUpperCase()}|${row.season.trim().toUpperCase()}`;
      flightsToAdd.push({
        kind: "add",
        db_package_id: "",
        package_name: row.package_name,
        season: row.season,
        departure_date: row.departure_date,
        departure_sector: row.departure_sector,
        return_date: row.return_date,
        return_sector: row.return_sector,
        month: deriveMonth(row.departure_date),
        needs_new_package: true,
        unresolvable: !newPackageKeys.has(key),
        row,
      });
    } else if (row.status === "removed" && row.season !== "2026/2027") {
      // Skip 2026/2027 legacy flights — those packages are intentionally kept untouched
      flightsToRemove.push({
        kind: "remove",
        db_flight_id: row.db_flight_id,
        package_name: row.package_name,
        season: row.season,
        departure_date: row.departure_date,
        return_date: row.return_date,
        row,
      });
    }
  }

  return { packagesToCreate, packagesToUpdate, flightsToAdd, flightsToRemove };
}
