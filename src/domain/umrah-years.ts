const CATALOG = {
  "2025/2026": { hijriYear: "1447H", selectable: true },
  "2026/2027": { hijriYear: "1448H", selectable: true },
  "2027/2028": { hijriYear: "1449H", selectable: false },
  "2028/2029": { hijriYear: "1450H", selectable: false },
  "2029/2030": { hijriYear: "1451H", selectable: false },
  "2030/2031": { hijriYear: "1452H", selectable: false },
  "2031/2032": { hijriYear: "1453H", selectable: false },
} as const;

export type SupportedUmrahYear = keyof typeof CATALOG;

export function isSupportedUmrahYear(value: unknown): value is SupportedUmrahYear {
  return typeof value === "string" && Object.hasOwn(CATALOG, value);
}

export const SELECTABLE_UMRAH_YEARS = Object.keys(CATALOG)
  .filter(isSupportedUmrahYear)
  .filter(year => CATALOG[year].selectable);

export function getMappedHijriYear(year: string) {
  if (!isSupportedUmrahYear(year)) {
    throw new Error(`No hijri year mapping for Gregorian range: ${year}`);
  }
  return CATALOG[year].hijriYear;
}
