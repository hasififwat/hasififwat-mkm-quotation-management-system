import { ConvexHttpClient } from "convex/browser";
import Papa from "papaparse";
import { useState } from "react";
import type { FlightData } from "@/features/flights/schema";

const SEASON_KEY = "2026/2027";

const MONTH_TO_CODE: Record<string, string> = {
	JANUARY: "JAN",
	JAN: "JAN",
	FEBRUARY: "FEB",
	FEB: "FEB",
	MARCH: "MAR",
	MAR: "MAR",
	MAC: "MAR",
	APRIL: "APR",
	APR: "APR",
	MAY: "MAY",
	JUNE: "JUN",
	JUN: "JUN",
	JULY: "JUL",
	JUL: "JUL",
	AUGUST: "AUG",
	AUG: "AUG",
	OGOS: "AUG",
	SEPTEMBER: "SEP",
	SEPT: "SEP",
	SEP: "SEP",
	OCTOBER: "OCT",
	OCT: "OCT",
	NOVEMBER: "NOV",
	NOV: "NOV",
	DECEMBER: "DEC",
	DEC: "DEC",
};

const PACKAGE_NAME_ALIASES: Record<string, string> = {
	"MANASIK HAJI": "MANASIK HAJI",
	"MENARA JAM": "MENARA JAM",
	UMJ: "MENARA JAM",
	"UMJ PREMIUM": "UMJ PREMIUM",
	"UMJ P": "UMJ PREMIUM",
	"UMJ PLUS": "UMJ PLUS",
	MAWADDAH: "MAWADDAH",
	"MAWADDAH LITE": "MAWADDAH LITE",
	MT: "MAKKAH TOWER",
	"MT P": "MAKKAH TOWER - PREMIUM",
};

const MONTHS_SHORT = [
	"JAN",
	"FEB",
	"MAR",
	"APR",
	"MAY",
	"JUN",
	"JUL",
	"AUG",
	"SEP",
	"OCT",
	"NOV",
	"DEC",
] as const;

const HEADER_ALIASES = {
	month: ["month"],
	season: ["season"],
	pakej: ["pakej", "package"],
	departure: ["departure", "depature", "depart", "departdate"],
	return: ["return", "returndate"],
	sector_departure: ["departuresector", "sectordeparture", "departsector"],
	sector_return: ["returnsector", "sectorreturn", "returnsector2"],
	code: ["code", "flight", "airline"],
} as const;

function normalizeHeader(header: string): string {
	return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeText(value: unknown): string {
	if (typeof value !== "string") {
		return "";
	}
	return value.trim();
}

function normalizeMonth(rawMonth: string): string {
	if (!rawMonth) {
		return "";
	}
	return (
		MONTH_TO_CODE[rawMonth.toUpperCase().trim()] ??
		rawMonth.toUpperCase().trim()
	);
}

function normalizePackageName(rawPackage: string): string {
	const cleaned = rawPackage.trim().replace(/\s+/g, " ");
	const normalizedKey = cleaned.toUpperCase();
	return PACKAGE_NAME_ALIASES[normalizedKey] ?? cleaned;
}

function parseDate(rawValue: string): string {
	const value = rawValue.trim();
	if (!value) {
		return "";
	}

	// dd-MMM-yy or d-MMM-yy
	const dashMatch = value.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
	if (dashMatch) {
		const [, dayRaw, monthRaw, yearRaw] = dashMatch;
		const monthCode = normalizeMonth(monthRaw);
		const monthIndex = MONTHS_SHORT.indexOf(
			monthCode as (typeof MONTHS_SHORT)[number],
		);
		if (monthIndex >= 0) {
			const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
			const day = dayRaw.padStart(2, "0");
			const month = String(monthIndex + 1).padStart(2, "0");
			return `${year}-${month}-${day}`;
		}
	}

	// dd/mm/yyyy OR mm/dd/yyyy
	const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
	if (slashMatch) {
		let [, first, second, year] = slashMatch;
		if (year.length === 2) {
			year = `20${year}`;
		}

		const a = Number(first);
		const b = Number(second);

		let day = a;
		let month = b;

		if (a <= 12 && b > 12) {
			month = a;
			day = b;
		} else if (a > 12 && b <= 12) {
			day = a;
			month = b;
		}

		return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
	}

	return value;
}

function getByAlias(
	row: Record<string, string>,
	aliases: readonly string[],
): string {
	for (const alias of aliases) {
		const value = row[alias];
		if (typeof value === "string" && value.trim().length > 0) {
			return value.trim();
		}
	}
	return "";
}

function extractYearFromFileName(fileName: string): string {
	const match = fileName.match(/(20\d{2})[/_-](20\d{2})/);
	if (!match) {
		return SEASON_KEY;
	}

	const [, startYear, endYear] = match;
	return `${startYear}/${endYear}`;
}

export interface IPackageData {
	season: string;
	name: string;
	flights: FlightData[];
	already_exists?: boolean;
}

interface IuseExtractPackage {
	handleFileUpload: (e: React.ChangeEvent<HTMLInputElement> | File) => void;
	flight: FlightData[];
	fileName: string | null;
	packageData: IPackageData[] | null;
}

export const useExtractPackage = (): IuseExtractPackage => {
	const [flight, setFlights] = useState<FlightData[]>([]);
	const [fileName, setFileName] = useState<string | null>(null);
	const [_packageData, _setPackageData] = useState<IPackageData[] | null>(null);

	const getFlightKey = (flight: FlightData): string => {
		return [
			flight.pakej,
			flight.code,
			flight.month,
			flight.departure,
			flight.return,
			flight.sector_departure,
			flight.sector_return,
		].join("|");
	};

	const handleFormatFlightsToPackage = (
		flights: FlightData[],
		seasonByFlightKey: Map<string, string>,
	): IPackageData[] => {
		const monthOrder: Record<string, number> = {
			JAN: 1,
			FEB: 2,
			MAR: 3,
			APR: 4,
			MAY: 5,
			JUN: 6,
			JUL: 7,
			AUG: 8,
			SEP: 9,
			OCT: 10,
			NOV: 11,
			DEC: 12,
		};

		const grouped = flights.reduce(
			(acc, current) => {
				const season =
					seasonByFlightKey.get(getFlightKey(current)) || "UNSPECIFIED";
				const groupKey = `${season}::${current.package_name}`;
				if (!acc[groupKey]) {
					acc[groupKey] = [];
				}
				acc[groupKey].push(current);
				return acc;
			},
			{} as Record<string, FlightData[]>,
		);

		const packages = Object.entries(grouped).map(([groupKey, flights]) => {
			const [season, name] = groupKey.split("::");
			const sortedFlights = flights.sort((a, b) => {
				const monthA = normalizeMonth(a.month);
				const monthB = normalizeMonth(b.month);

				const orderA = monthOrder[monthA] || 99;
				const orderB = monthOrder[monthB] || 99;

				if (orderA !== orderB) {
					return orderA - orderB;
				}

				return a.departure.localeCompare(b.departure);
			});

			return {
				season,
				name,
				flights: sortedFlights,
			};
		});

		return packages;
	};

	const markExistingPackages = async (
		packages: IPackageData[],
		year: string,
	): Promise<IPackageData[]> => {
		const convexUrl = import.meta.env.VITE_CONVEX_URL;
		if (!convexUrl || packages.length === 0) {
			return packages;
		}

		try {
			const client = new ConvexHttpClient(convexUrl);
			const existing = (await client.query(
				"packages:checkExistingPackagesForYear" as never,
				{
					year,
					packages: packages.map((pkg) => ({
						name: pkg.name,
						season: pkg.season,
					})),
				} as never,
			)) as Array<{ name: string; season?: string | null }>;

			const existingKeys = new Set(
				existing.map((pkg) => `${pkg.name}::${pkg.season || ""}`),
			);

			return packages.map((pkg) => ({
				...pkg,
				already_exists: existingKeys.has(`${pkg.name}::${pkg.season || ""}`),
			}));
		} catch (error) {
			console.error("Failed to validate existing packages", error);
			return packages;
		}
	};

	const _handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File) => {
		let file: File | undefined;
		if (e instanceof File) {
			file = e;
		} else {
			file = e.target.files?.[0];
		}
		if (!file) return;

		setFileName(file.name);
		const yearKey = extractYearFromFileName(file.name);

		Papa.parse<Record<string, string>>(file, {
			header: true,
			skipEmptyLines: "greedy",
			transformHeader: (header) => normalizeHeader(header),
			complete: async (results) => {
				const rows = (results.data ?? []).map((row) => {
					const normalizedRow: Record<string, string> = {};
					for (const [key, value] of Object.entries(row ?? {})) {
						normalizedRow[normalizeHeader(key)] = normalizeText(value);
					}
					return normalizedRow;
				});

				const parsedFlights: FlightData[] = [];
				const seasonByFlightKey = new Map<string, string>();

				for (const row of rows) {
					const rawMonth = getByAlias(row, HEADER_ALIASES.month);
					const rawSeason = getByAlias(row, HEADER_ALIASES.season);
					const rawPakej = getByAlias(row, HEADER_ALIASES.pakej);
					const rawDeparture = getByAlias(row, HEADER_ALIASES.departure);
					const rawReturn = getByAlias(row, HEADER_ALIASES.return);
					const rawSectorDeparture = getByAlias(
						row,
						HEADER_ALIASES.sector_departure,
					);
					const rawSectorReturn = getByAlias(row, HEADER_ALIASES.sector_return);
					const rawCode = getByAlias(row, HEADER_ALIASES.code);

					if (
						!rawPakej ||
						!rawMonth ||
						!rawSeason ||
						(!rawDeparture && !rawReturn)
					) {
						continue;
					}

					const month = normalizeMonth(rawMonth);
					const departure = parseDate(rawDeparture);
					const returnDate = parseDate(rawReturn);

					if (!departure || !returnDate) {
						continue;
					}

					if (rawPakej.toUpperCase() === "JUALAN AGENT") {
						continue;
					}

					const splitPackages = rawPakej.includes("/")
						? rawPakej
								.split("/")
								.map((value) => value.trim())
								.filter(Boolean)
						: [rawPakej];

					for (const pakej of splitPackages) {
						const flight: FlightData = {
							year_key: yearKey,
							pakej,
							code: rawCode,
							month,
							departure,
							return: returnDate,
							package_name: normalizePackageName(pakej),
							sector_departure: rawSectorDeparture,
							sector_return: rawSectorReturn,
						};

						parsedFlights.push(flight);
						seasonByFlightKey.set(getFlightKey(flight), rawSeason.trim());
					}
				}

				setFlights(parsedFlights);
				const parsedPackages = handleFormatFlightsToPackage(
					parsedFlights,
					seasonByFlightKey,
				);
				const packagesWithExistenceStatus = await markExistingPackages(
					parsedPackages,
					yearKey,
				);
				_setPackageData(packagesWithExistenceStatus);
			},
		});
	};

	return {
		handleFileUpload: _handleFileUpload,
		flight,
		fileName,
		packageData: _packageData,
	};
};
