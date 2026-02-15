import Papa from "papaparse";
import { useState } from "react";
import type { FlightData } from "@/features/flights/schema";

const SEASON_KEY = "2026/2027";

export interface IPackageData {
	name: string;
	flights: FlightData[];
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

	const handleFormatFlightsToPackage = (flights: FlightData[]) => {
		const grouped = flights.reduce(
			(acc, current) => {
				const { package_name } = current;
				if (!acc[package_name]) {
					acc[package_name] = [];
				}
				acc[package_name].push(current);
				return acc;
			},
			{} as Record<string, FlightData[]>,
		);

		const packages = Object.entries(grouped).map(([name, flights]) => {
			const sortedFlights = flights.sort((a, b) => {
				const monthOrder: { [key: string]: number } = {
					JANUARY: 1,
					FEBRUARY: 2,
					MARCH: 3,
					APRIL: 4,
					MAY: 5,
					JUNE: 6,
					JULY: 7,
					AUGUST: 8,
					SEPTEMBER: 9,
					OCTOBER: 10,
					NOVEMBER: 11,
					DECEMBER: 12,
					JAN: 1,
					FEB: 2,
					MAR: 3,
					APR: 4,
					JUN: 6,
					JUL: 7,
					AUG: 8,
					SEP: 9,
					OCT: 10,
					NOV: 11,
					DEC: 12,
				};

				const monthA = a.month.toUpperCase().trim();
				const monthB = b.month.toUpperCase().trim();

				const orderA = monthOrder[monthA] || 99;
				const orderB = monthOrder[monthB] || 99;

				return orderA - orderB;
			});

			return {
				name,
				flights: sortedFlights,
			};
		});

		_setPackageData(packages);
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
		const _tableData: FlightData[] = [];

		Papa.parse(file, {
			complete: (results) => {
				const columns = results.data[5] as string[];
				console.log("Columns:", columns);
				const filteredColumns = columns.filter(
					(col, index) =>
						col === "MONTH" ||
						col === "CODE" ||
						col === "DEPARTURE" ||
						(col === "SECTOR" && index === 6) ||
						col === "RETURN" ||
						(col === "SECTOR" && index === 12) ||
						col === "PAKEJ",
				);
				console.log("Filtered Columns:", filteredColumns);

				const filteredColumnsIndx = columns
					.map((col, index) => {
						if (col === "MONTH") return index;
						if (col === "CODE") return index;
						if (col === "DEPARTURE") return index;
						if (col === "SECTOR" && index === 6) return index;
						if (col === "RETURN") return index;
						if (col === "SECTOR" && index === 12) return index;
						if (col === "PAKEJ") return index;
						return -1;
					})
					.filter((index) => index !== -1);

				const formattedColumns = filteredColumns.map((col, index) => {
					if (col === "SECTOR" && filteredColumnsIndx[index] === 6) {
						return {
							header: "SECTOR",
							key: "sector_departure",
							cvs_index: filteredColumnsIndx[index],
						};
					}
					if (col === "SECTOR" && filteredColumnsIndx[index] === 12) {
						return {
							header: "SECTOR",
							key: "sector_return",
							cvs_index: filteredColumnsIndx[index],
						};
					}

					return {
						header: col,
						key: col.toLowerCase(),
						cvs_index: filteredColumnsIndx[index],
					};
				});

				const map = new Map<number, { key: string; cvs_index: number }>();
				formattedColumns.forEach((col) => {
					map.set(col.cvs_index, { key: col.key, cvs_index: col.cvs_index });
				});

				console.log("Columns Map:", map);

				// console.log("Filtered Columns:", filteredColumns);
				// console.log("Filtered Columns Indexes:", filteredColumnsIndx);
				// console.log("Formatted Columns:", formattedColumns);
				// console.log("Result:", results.data);

				let tableData: any[] = [];

				for (let rowIndex = 6; rowIndex < results.data.length; rowIndex++) {
					let data = {};
					for (let colIndex = 0; colIndex < columns.length; colIndex++) {
						const colData = results.data[rowIndex][colIndex];

						if (
							map.has(colIndex) &&
							colIndex === map.get(colIndex)?.cvs_index
						) {
							const { key } = map.get(colIndex)!;
							data = {
								...data,
								season_key: SEASON_KEY,

								[key]: colData,
							};
						}

						if (colIndex === columns.length - 1) {
							tableData.push(data);
							data = {};
						}
					}
					//convert row to array
				}

				console.log("Table Data:", tableData);
				//filter out pakej === "JUALAN AGENT"
				tableData = tableData.filter((row) => row.pakej !== "JUALAN AGENT");

				//if pakej is MT / UMJ P means it has two pakej, so split it into two rows
				let finalTableData: FlightData[] = [];
				tableData.forEach((row) => {
					if (row?.pakej?.includes("/")) {
						const pakejs = row.pakej.split("/");
						pakejs.forEach((pakej: string) => {
							finalTableData.push({ ...row, pakej: pakej.trim() });
						});
					} else {
						finalTableData.push(row);
					}
				});

				//format pakej to package_name
				//         UMJ - UMRAH MENARA JAM
				// MANASIK HAJI
				// MT - MAKKAH TOWER
				// MT P - MAKKAH TOWER - PREMIUM
				// UMJ P - UMRAH MENARA JAM - PREMIUM

				finalTableData = finalTableData.map((row) => {
					let package_name = "";
					switch (row.pakej) {
						case "UMJ":
							package_name = "UMRAH MENARA JAM";
							break;
						case "MANASIK HAJI":
							package_name = "MANASIK HAJI";
							break;
						case "MT":
							package_name = "MAKKAH TOWER";
							break;
						case "MT P":
							package_name = "MAKKAH TOWER - PREMIUM";
							break;
						case "UMJ P":
							package_name = "UMRAH MENARA JAM - PREMIUM";
							break;
						default:
							package_name = row.pakej;
					}
					return { ...row, package_name };
				});

				//filter row undefined values

				finalTableData = finalTableData.filter(
					(row) => row.departure && row.return,
				);

				//add incremental no. to each row
				setFlights(finalTableData as FlightData[]);
				handleFormatFlightsToPackage(finalTableData);
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
