import Papa from "papaparse";
import type React from "react";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import FlightListings from "./FlightListings";
import type { FlightData } from "./schema";

export default function FlightMaster() {
	const YEAR_KEY = "2026/2027";

	const [_flights, setFlights] = useState<FlightData[]>([]);
	const [_searchTerm, _setSearchTerm] = useState("");
	// Fix: Added useRef to handle hidden file input trigger as Button does not support asChild
	const _fileInputRef = useRef<HTMLInputElement>(null);

	const _handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		Papa.parse(file, {
			// This function runs on every header name found

			complete: (results) => {
				const columns = results.data[5] as string[];
				console.log("Columns:", columns);
				const filteredColumns = columns.filter(
					(col, index) =>
						col === "MONTH" ||
						col === "CODE" ||
						col === "DEPARTURE" ||
						(col === "SECTOR" && index === 7) ||
						col === "RETURN" ||
						(col === "SECTOR" && index === 13) ||
						col === "PAKEJ",
				);
				console.log("Filtered Columns:", filteredColumns);

				const filteredColumnsIndx = columns
					.map((col, index) => {
						if (col === "MONTH") return index;
						if (col === "CODE") return index;
						if (col === "DEPARTURE") return index;
						if (col === "SECTOR" && index === 7) return index;
						if (col === "RETURN") return index;
						if (col === "SECTOR" && index === 13) return index;
						if (col === "PAKEJ") return index;
						return -1;
					})
					.filter((index) => index !== -1);

				const formattedColumns = filteredColumns.map((col, index) => {
					if (col === "SECTOR" && filteredColumnsIndx[index] === 7) {
						return {
							header: "SECTOR",
							key: "sector_departure",
							cvs_index: filteredColumnsIndx[index],
						};
					}
					if (col === "SECTOR" && filteredColumnsIndx[index] === 13) {
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

				let tableData: Record<string, string>[] = [];

				for (let rowIndex = 6; rowIndex < results.data.length; rowIndex++) {
					let data = {};
					for (let colIndex = 0; colIndex < columns.length; colIndex++) {
						const colData = results.data[rowIndex][colIndex];

						const mappedCol = map.get(colIndex);
						if (mappedCol && colIndex === mappedCol.cvs_index) {
							const { key } = mappedCol;
							data = {
								...data,
								year_key: YEAR_KEY,
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

				const filteredFinalTableData = finalTableData.filter(
					(row) =>
						row.month &&
						row.code &&
						row.departure &&
						row.sector_departure &&
						row.return &&
						row.sector_return &&
						row.pakej,
				);

				console.log(
					"Final Table Data with Package Names:",
					filteredFinalTableData,
				);

				//add incremental no. to each row

				console.log("Final Table Data:", finalTableData);

				// setFlights(tableData as FlightRecord[]);
				// uploadFlightSchedule(tableData);
				// tableData = tableData.filter((row) => Object.keys(row).length > 0);
				// setFlights(tableData as FlightRecord[]);
				setFlights(filteredFinalTableData);
			},
		});
	};

	const _handleClear = () => {
		if (confirm("Clear all master flight records?")) {
			setFlights([]);
		}
	};

	return (
		<div>
			<input
				ref={_fileInputRef}
				onChange={_handleFileUpload}
				type="file"
				accept=".csv"
				hidden
			/>
			<Button onClick={() => _fileInputRef.current?.click()}>
				Import Schedule
			</Button>
			<div>
				<FlightListings data={_flights} />
			</div>
		</div>
	);
}
