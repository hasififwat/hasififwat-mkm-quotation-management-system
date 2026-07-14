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

const AIRLINE_NAMES: Record<string, string> = {
  SV: "Saudi Airlines",
  MH: "Malaysia Airlines",
};

export function airlineName(code: string): string {
  return AIRLINE_NAMES[code.toUpperCase()] ?? code;
}

export function detectAirlineCode(flightNumber: string): string {
  if (!flightNumber) return "";
  if (/^SV/i.test(flightNumber))                              return "SV";
  if (/^MH/i.test(flightNumber) || /^\d{4}[A-Z]?$/.test(flightNumber)) return "MH";
  if (/^WY/i.test(flightNumber))                              return "OMAN";
  if (/^EK/i.test(flightNumber))                              return "EK";
  return "";
}

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
  status?: string;
  source?: string;
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
  const packagesToPromote: string[] = [];

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
      // Promote manual/unset packages matched by the price list to source "sync"
      if (dbPkg && dbPkg.source !== "sync") {
        packagesToPromote.push(row.db_id);
      }
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
  const flightsToPromote: string[] = [];

  const newPackageKeys = new Set(
    packagesToCreate.map((s) => `${s.name.trim().toUpperCase()}|${s.season.trim().toUpperCase()}`),
  );

  for (const row of flightRows) {
    if (row.status === "added" || row.status === "edited") {
      if (row.status === "edited" && row.db_flight_id) {
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
    } else if (row.status === "unchanged" && row.notes === "promote" && row.db_flight_id) {
      // MFF-matched manual flight — promote to source: "sync" on apply
      flightsToPromote.push(row.db_flight_id);
    }
  }

  return { packagesToCreate, packagesToUpdate, packagesToPromote, flightsToAdd, flightsToRemove, flightsToPromote };
}

// ─── Price list parser ────────────────────────────────────────────────────────
// Ports scripts/extract-price-list.js to run in-browser without Node.js.

import type { DbFlight } from "./types";

const SEASON_CODE_MAP = [
  { match: /SUPER LOW SEASON/i,                code: "SLS - JUN",        start: "2026-06-18", end: "2026-06-30" },
  { match: /LOW SEASON.*(JULY|JUL)/i,          code: "LS - JULY TO SEP", start: "2026-07-01", end: "2026-09-30" },
  { match: /LOW SEASON.*OCT/i,                 code: "LS - OCT",         start: "2026-10-01", end: "2026-10-31" },
  { match: /MID SEASON/i,                      code: "MS - NOV",         start: "2026-11-01", end: "2026-11-24" },
  { match: /PRE PEAK SEASON.*(25 NOV|25-30)/i, code: "PPS - NOV",        start: "2026-11-25", end: "2026-11-30" },
  { match: /SUPER PEAK SEASON/i,               code: "PS - DEC",         start: "2026-12-01", end: "2027-01-15" },
  { match: /PRE PEAK SEASON.*(JAN|16)/i,       code: "LS - JAN",         start: "2027-01-16", end: "2027-01-30" },
  { match: /RAMADHAN SEASON/i,                 code: "RS - FEB",         start: "2027-02-01", end: "2027-03-13" },
  { match: /SYAWAL SEASON/i,                   code: "SS - MAC",         start: "2027-03-14", end: "2027-03-24" },
];

function findSeasonEntry(header: string) {
  for (const e of SEASON_CODE_MAP) {
    if (e.match.test(header)) return e;
  }
  return null;
}

function priceListCanonicalName(pkg: string, segment: string): string | null {
  const p = pkg.trim().toUpperCase();
  const s = (segment ?? "").trim().toUpperCase();
  if (p === "MENARA JAM") {
    if (s.includes("PREMIUM"))      return "MENARA JAM PREMIUM";
    if (s.includes("UMJ PLUS"))     return "UMJ PLUS";
    if (s.includes("LITE"))         return "MENARA JAM LITE";
    if (s.includes("SENAI"))        return "MENARA JAM SENAI";
    return "MENARA JAM";
  }
  if (p === "MAWADDAH") {
    if (s.includes("LITE"))         return "MAWADDAH LITE";
    if (s.includes("MANASIK HAJI")) return "MANASIK HAJI";
    if (s.includes("PLUS"))         return "MAWADDAH PLUS";
    return "MAWADDAH";
  }
  if (p === "PLATINUM")             return "PLATINUM";
  if (p === "SEASONAL")             return "MUSIM HAJI";
  if (p === "HAJI FADHIL - EJEN")   return "HAJI FADHIL - EJEN";
  if (p === "UNIMAP")               return "UNIMAP";
  if (p === "LEISURE PACKAGE")      return null;
  if (p === "SAMBUT")               return `SAMBUT RAMADHAN - ${s}`;
  if (p === "AWAL")                 return `AWAL RAMADHAN - ${s}`;
  if (p === "PERTENGAHAN")          return `PERTENGAHAN RAMADHAN - ${s}`;
  if (p === "AKHIR")                return `AKHIR RAMADHAN - ${s}`;
  return pkg.trim();
}

export function parsePriceListCsv(
  text: string,
  dbPackages: ExistingPackage[],
): PackageMappingRow[] {
  const rows = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(parseCSVLine);

  const dbLookup = new Map<string, ExistingPackage>();
  for (const pkg of dbPackages) {
    const key = `${(pkg.name ?? "").trim().toUpperCase()}|${(pkg.season ?? "").trim()}`;
    if (!dbLookup.has(key)) dbLookup.set(key, pkg);
  }

  const results: PackageMappingRow[] = [];
  let currentSeason: { code: string; start: string; end: string; raw: string } | null = null;
  let lastPackage = "";

  const g = (row: string[], i: number) => (row[i] ?? "").trim();
  const price = (s: string): number | null => {
    if (!s || s === "-" || s === "TBA") return null;
    const n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? null : n;
  };

  for (const row of rows) {
    const col1 = g(row, 1);
    const col2 = g(row, 2);
    const col3 = g(row, 3);

    if ((col1 === "FINAL" || col1 === "WILL BE UPDATE") && col2.length > 0) {
      const entry = findSeasonEntry(col2);
      if (entry) { currentSeason = { ...entry, raw: col2 }; lastPackage = ""; }
      continue;
    }
    if (!currentSeason) continue;

    if (["UMRAH PACKAGE", "LEISURE PACKAGE", "UMRAH PACKAGE (CUSTOM)", "PACKAGE"].includes(col2)) continue;
    if (col3 === "SEGMENT" || ["QDP", "DBL", "PRICE PER PAX (RM)"].includes(g(row, 5))) continue;
    if (!col2 && !col3) continue;

    if (col2) lastPackage = col2;
    const pkg = lastPackage;
    if (!pkg || pkg === "LEISURE PACKAGE") continue;

    const canon = priceListCanonicalName(pkg, col3);
    if (!canon) continue;

    const qdp_price = price(g(row, 5));
    const tpl_price = price(g(row, 6));
    const dbl_price = price(g(row, 7));
    const sgl_price = price(g(row, 9));
    if (!(qdp_price || tpl_price || dbl_price || sgl_price)) continue;

    const bus = g(row, 30);
    const speedTrain = g(row, 31);
    let plTransport = "";
    if (bus === "YES") {
      if (/BC/i.test(speedTrain))      plTransport = "BAS & SPEED TRAIN (BC)";
      else if (/EY/i.test(speedTrain)) plTransport = "BAS & PERCUMA SPEED TRAIN";
      else if (speedTrain === "YES")   plTransport = "BAS & SPEED TRAIN";
      else                             plTransport = "BAS";
    }

    const dbPkg = dbLookup.get(`${canon.trim().toUpperCase()}|${currentSeason.code}`);
    const isMatched = !!dbPkg;

    let transport = plTransport;
    let makkah_hotel = "", makkah_meals = "";
    let madinah_hotel = "", madinah_meals = "";
    let aziziah_hotel = "", aziziah_meals = "";
    let taif_hotel = "", taif_meals = "";

    if (isMatched && dbPkg) {
      transport = dbPkg.transport ?? plTransport;
      const getH = (type: string) =>
        (dbPkg.hotels ?? []).find(h => h.hotel_type.toUpperCase() === type);
      const mk = getH("MAKKAH");
      const md = getH("MADINAH");
      const az = getH("AZIZIAH");
      const tf = getH("TAIF");
      makkah_hotel  = mk?.name ?? ""; makkah_meals  = mk?.meals.join("+") ?? "";
      madinah_hotel = md?.name ?? ""; madinah_meals = md?.meals.join("+") ?? "";
      aziziah_hotel = az?.name ?? ""; aziziah_meals = az?.meals.join("+") ?? "";
      taif_hotel    = tf?.name ?? ""; taif_meals    = tf?.meals.join("+") ?? "";
    } else {
      madinah_hotel = g(row, 18).replace(/^-$/, "");
      makkah_hotel  = g(row, 19).replace(/^-$/, "");
      madinah_meals = g(row, 22).replace(/^-$/, "");
      makkah_meals  = g(row, 23).replace(/^-$/, "");
      aziziah_hotel = g(row, 20).replace(/^-$/, "");
      aziziah_meals = g(row, 24).replace(/^-$/, "");
      taif_hotel    = g(row, 21).replace(/^-$/, "");
      taif_meals    = g(row, 25).replace(/^-$/, "");
    }

    results.push({
      season_code:        currentSeason.code,
      season_raw:         currentSeason.raw,
      season_start:       currentSeason.start,
      season_end:         currentSeason.end,
      canonical_name:     canon,
      price_list_segment: col3,
      qdp_price, tpl_price, dbl_price, sgl_price,
      duration:           g(row, 13),
      flight:             g(row, 32),
      match_status:       isMatched ? "MATCHED" : "NEW",
      db_id:              dbPkg?._id ?? "",
      db_name:            dbPkg?.name ?? "",
      db_season:          dbPkg?.season ?? "",
      db_status:          dbPkg?.status ?? "",
      transport,
      makkah_hotel,  makkah_meals,
      madinah_hotel, madinah_meals,
      aziziah_hotel, aziziah_meals,
      taif_hotel,    taif_meals,
    });
  }

  return results;
}

// ─── MFF parser ───────────────────────────────────────────────────────────────
// Ports scripts/compare-mff-flights.js to run in-browser without Node.js.

const MFF_NAME_MAP: Record<string, string> = {
  "UMJ":                                  "MENARA JAM",
  "UMJ SV":                               "MENARA JAM",
  "UMJ P":                                "MENARA JAM PREMIUM",
  "UMJ PREMIUM":                          "MENARA JAM PREMIUM",
  "UMJ PLUS":                             "UMJ PLUS",
  "MAWADDAH":                             "MAWADDAH",
  "MAWADDAH SV":                          "MAWADDAH",
  "MAWADDAH - SV (BRANCH SABAH GROUP)":   "MAWADDAH",
  "MAWADDAH LITE":                        "MAWADDAH LITE",
  "MANASIK":                              "MANASIK HAJI",
  "MANASIK HAJI":                         "MANASIK HAJI",
  "UMJ (TRIP HJ FADHIL PENANG)":          "HAJI FADHIL - EJEN",
};

const MFF_SKIP_PATTERNS = [/^JUALAN TIKET/i, /^LEISURE /i, /^AMANI TRAVEL/i, /UMJ P --> UMJ/i];

function normalizeSector(s: string): string {
  s = s.trim().toUpperCase().replace(/\s+(SV|MH|EK|QR|TK|EY|GA|KL|CX)$/i, "").trim().replace(/\s+/g, "");
  if (s.length === 6 && !s.includes("-")) s = s.slice(0, 3) + "-" + s.slice(3);
  return s;
}

const MFF_MONTH_MAP: Record<string, string> = {
  JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
  JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12",
};

function parseMffDate(s: string): string | null {
  if (!s) return null;
  const parts = s.trim().split("-");
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const month = MFF_MONTH_MAP[m.slice(0, 3).toUpperCase()];
  if (!month) return null;
  return `${y}-${month}-${d.padStart(2, "0")}`;
}

export function parseMffCsv(
  text: string,
  mappingRows: PackageMappingRow[],
  dbPackages: ExistingPackage[],
  dbFlights: DbFlight[],
): FlightDiffRow[] {
  // Build season ranges from mapping rows
  const seasonRanges: Array<{ code: string; start: string; end: string }> = [];
  const seenCodes = new Set<string>();
  for (const r of mappingRows) {
    if (r.season_code && r.season_start && r.season_end && !seenCodes.has(r.season_code)) {
      seenCodes.add(r.season_code);
      seasonRanges.push({ code: r.season_code, start: r.season_start, end: r.season_end });
    }
  }
  seasonRanges.sort((a, b) => a.start.localeCompare(b.start));

  const getSeasonCode = (isoDate: string): string | null => {
    for (const r of seasonRanges) {
      if (isoDate >= r.start && isoDate <= r.end) return r.code;
    }
    return null;
  };

  const pkgLookup = new Map<string, ExistingPackage>();
  for (const p of dbPackages) {
    const key = `${(p.name ?? "").trim().toUpperCase()}|${(p.season ?? "").trim()}`;
    if (!pkgLookup.has(key)) pkgLookup.set(key, p);
  }

  // Mutable copy — entries are deleted as they're matched so remainder = removed
  const dbFlightMap = new Map<string, DbFlight>();
  for (const f of dbFlights) {
    dbFlightMap.set(`${f.package_id}|${f.departure_date}|${f.return_date}`, f);
  }

  // Parse MFF rows
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  type MffRow = {
    mff_package: string; canonical_name: string | null;
    departure_date: string; return_date: string;
    departure_sector: string; return_sector: string;
    dep_flight: string; ret_flight: string; airline: string;
    dep_sector_norm: string; ret_sector_norm: string;
  };
  const mffRows: MffRow[] = [];
  let currentCode = "";

  for (let i = 0; i < lines.length; i++) {
    if (i < 10) continue;
    const row = parseCSVLine(lines[i]);
    const get = (idx: number) => (row[idx] ?? "").trim();

    if (get(1)) currentCode = get(1);
    const depFlt = get(8);
    if (!get(1) && depFlt) {
      const detected = detectAirlineCode(depFlt);
      if (detected) currentCode = detected;
    }

    const pkg     = get(35);
    const depDate = parseMffDate(get(9));
    const retDate = parseMffDate(get(15));
    if (!depDate || !retDate) continue;
    if (!pkg || MFF_SKIP_PATTERNS.some(p => p.test(pkg))) continue;

    mffRows.push({
      mff_package:      pkg,
      canonical_name:   MFF_NAME_MAP[pkg.toUpperCase()] ?? MFF_NAME_MAP[pkg] ?? null,
      departure_date:   depDate,
      return_date:      retDate,
      departure_sector: get(11),
      return_sector:    get(17),
      dep_flight:       depFlt,
      ret_flight:       get(14),
      airline:          currentCode,
      dep_sector_norm:  normalizeSector(get(11)),
      ret_sector_norm:  normalizeSector(get(17)),
    });
  }

  const results: FlightDiffRow[] = [];

  for (const row of mffRows) {
    if (!row.canonical_name) continue;
    const season = getSeasonCode(row.departure_date);
    if (!season) continue;

    const dbPkg = pkgLookup.get(`${row.canonical_name.trim().toUpperCase()}|${season}`);
    if (!dbPkg) {
      results.push({
        status: "no_db_package",
        package_name: row.canonical_name,
        season,
        departure_date: row.departure_date, departure_sector: row.departure_sector,
        return_date: row.return_date,       return_sector: row.return_sector,
        airline: row.airline, dep_flight: row.dep_flight, ret_flight: row.ret_flight,
        db_package_id: "", db_flight_id: "", notes: row.mff_package,
      });
      continue;
    }

    const flightKey = `${dbPkg._id}|${row.departure_date}|${row.return_date}`;
    const dbFlight = dbFlightMap.get(flightKey);

    if (!dbFlight) {
      results.push({
        status: "added",
        package_name: dbPkg.name, season,
        departure_date: row.departure_date, departure_sector: row.departure_sector,
        return_date: row.return_date,       return_sector: row.return_sector,
        airline: row.airline, dep_flight: row.dep_flight, ret_flight: row.ret_flight,
        db_package_id: dbPkg._id, db_flight_id: "", notes: "",
      });
    } else if (dbFlight.source === "manual") {
      // Manual flights matched by the MFF are promoted to "sync" on apply, but data is never modified.
      results.push({
        status: "unchanged",
        package_name: dbPkg.name, season,
        departure_date: row.departure_date, departure_sector: row.departure_sector,
        return_date: row.return_date,       return_sector: row.return_sector,
        airline: row.airline, dep_flight: row.dep_flight, ret_flight: row.ret_flight,
        db_package_id: dbPkg._id, db_flight_id: dbFlight._id, notes: "promote",
      });
      dbFlightMap.delete(flightKey);
    } else {
      const depChanged     = normalizeSector(dbFlight.departure_sector) !== row.dep_sector_norm;
      const retChanged     = normalizeSector(dbFlight.return_sector) !== row.ret_sector_norm;
      // DB stores airline name; compare airline name → airline name
      const mffAirlineName = airlineName(row.airline);
      const dbAirlineName  = dbFlight.flight ?? "";
      const airlineChanged = mffAirlineName !== "" && dbAirlineName !== mffAirlineName;
      const notes = [
        depChanged     && "dep sector changed",
        retChanged     && "ret sector changed",
        airlineChanged && "airline changed",
      ].filter(Boolean).join("; ");
      const isEdited = depChanged || retChanged || airlineChanged;
      results.push({
        status: isEdited ? "edited" : "unchanged",
        package_name: dbPkg.name, season,
        departure_date: row.departure_date, departure_sector: row.departure_sector,
        return_date: row.return_date,       return_sector: row.return_sector,
        airline: row.airline, dep_flight: row.dep_flight, ret_flight: row.ret_flight,
        db_package_id: dbPkg._id,
        db_flight_id: isEdited ? (dbFlight._id ?? "") : "",
        notes,
        ...(isEdited && {
          db_airline: dbAirlineName,
          db_dep_sector: dbFlight.departure_sector,
          db_ret_sector: dbFlight.return_sector,
        }),
      });
      dbFlightMap.delete(flightKey);
    }
  }

  // Remaining DB flights not matched by MFF = removed,
  // but ONLY if they were originally created by the sync. Manual flights are never auto-removed.
  for (const f of dbFlightMap.values()) {
    if (f.source !== "sync") continue;
    results.push({
      status: "removed",
      package_name: f.package_name, season: f.package_season,
      departure_date: f.departure_date, departure_sector: f.departure_sector,
      return_date: f.return_date,       return_sector: f.return_sector,
      airline: "", dep_flight: f.flight ?? "", ret_flight: f.return_flight ?? "",
      db_package_id: f.package_id, db_flight_id: f._id, notes: "",
    });
  }

  return results;
}
