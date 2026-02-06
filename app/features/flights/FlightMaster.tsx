// import React, { useState, useEffect, useRef } from "react";
// import Papa from "papaparse";

// import type { FlightRecord } from "./types";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { Upload, Trash2, FileSpreadsheet, Search } from "lucide-react";
// import { useUmrahPackageService } from "~/services/supabase-api/umrah-packages";

// const FlightMaster: React.FC = () => {
//   const SEASON_KEY = "2026/2027";
//   const { uploadFlightSchedule } = useUmrahPackageService();

//   const [flights, setFlights] = useState<FlightRecord[]>([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   // Fix: Added useRef to handle hidden file input trigger as Button does not support asChild
//   const fileInputRef = useRef<HTMLInputElement>(null);

//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     Papa.parse(file, {
//       // This function runs on every header name found

//       complete: (results) => {
//         const columns = results.data[5] as string[];
//         console.log("Columns:", columns);
//         const filteredColumns = columns.filter(
//           (col, index) =>
//             col === "MONTH" ||
//             col === "DEPARTURE" ||
//             (col === "SECTOR" && index === 7) ||
//             col === "RETURN" ||
//             (col === "SECTOR" && index === 13) ||
//             col === "PAKEJ"
//         );
//         console.log("Filtered Columns:", filteredColumns);

//         const filteredColumnsIndx = columns
//           .map((col, index) => {
//             if (col === "MONTH") return index;
//             if (col === "DEPARTURE") return index;
//             if (col === "SECTOR" && index === 7) return index;
//             if (col === "RETURN") return index;
//             if (col === "SECTOR" && index === 13) return index;
//             if (col === "PAKEJ") return index;
//             return -1;
//           })
//           .filter((index) => index !== -1);

//         const formattedColumns = filteredColumns.map((col, index) => {
//           if (col === "SECTOR" && filteredColumnsIndx[index] === 7) {
//             return {
//               header: "SECTOR",
//               key: "sector_departure",
//               cvs_index: filteredColumnsIndx[index],
//             };
//           }
//           if (col === "SECTOR" && filteredColumnsIndx[index] === 13) {
//             return {
//               header: "SECTOR",
//               key: "sector_return",
//               cvs_index: filteredColumnsIndx[index],
//             };
//           }

//           return {
//             header: col,
//             key: col.toLowerCase(),
//             cvs_index: filteredColumnsIndx[index],
//           };
//         });

//         const map = new Map<number, { key: string; cvs_index: number }>();
//         formattedColumns.forEach((col) => {
//           map.set(col.cvs_index, { key: col.key, cvs_index: col.cvs_index });
//         });

//         console.log("Columns Map:", map);

//         // console.log("Filtered Columns:", filteredColumns);
//         // console.log("Filtered Columns Indexes:", filteredColumnsIndx);
//         // console.log("Formatted Columns:", formattedColumns);
//         // console.log("Result:", results.data);

//         let tableData: any[] = [];

//         for (let rowIndex = 6; rowIndex < results.data.length; rowIndex++) {
//           let data = {};
//           for (let colIndex = 0; colIndex < columns.length; colIndex++) {
//             const colData = results.data[rowIndex][colIndex];

//             if (
//               map.has(colIndex) &&
//               colIndex === map.get(colIndex)?.cvs_index
//             ) {
//               const { key } = map.get(colIndex)!;
//               data = {
//                 ...data,
//                 season_key: SEASON_KEY,
//                 [key]: colData,
//               };
//             }

//             if (colIndex === columns.length - 1) {
//               tableData.push(data);
//               data = {};
//             }
//           }

//           //convert row to array
//         }

//         console.log("Table Data:", tableData);
//         //filter out pakej === "JUALAN AGENT"
//         tableData = tableData.filter((row) => row["pakej"] !== "JUALAN AGENT");

//         //if pakej is MT / UMJ P means it has two pakej, so split it into two rows
//         let finalTableData: any[] = [];
//         tableData.forEach((row) => {
//           if (row["pakej"].includes("/")) {
//             const pakejs = row["pakej"].split("/");
//             pakejs.forEach((pakej: string) => {
//               finalTableData.push({ ...row, pakej: pakej.trim() });
//             });
//           } else {
//             finalTableData.push(row);
//           }
//         });

//         //format pakej to package_name
//         //         UMJ - UMRAH MENARA JAM
//         // MANASIK HAJI
//         // MT - MAKKAH TOWER
//         // MT P - MAKKAH TOWER - PREMIUM
//         // UMJ P - UMRAH MENARA JAM - PREMIUM

//         finalTableData = finalTableData.map((row) => {
//           let package_name = "";
//           switch (row["pakej"]) {
//             case "UMJ":
//               package_name = "UMRAH MENARA JAM";
//               break;
//             case "MANASIK HAJI":
//               package_name = "MANASIK HAJI";
//               break;
//             case "MT":
//               package_name = "MAKKAH TOWER";
//               break;
//             case "MT P":
//               package_name = "MAKKAH TOWER - PREMIUM";
//               break;
//             case "UMJ P":
//               package_name = "UMRAH MENARA JAM - PREMIUM";
//               break;
//             default:
//               package_name = row["pakej"];
//           }
//           return { ...row, package_name };
//         });

//         console.log("Final Table Data with Package Names:", finalTableData);

//         //add incremental no. to each row

//         console.log("Final Table Data:", finalTableData);

//         // setFlights(tableData as FlightRecord[]);
//         // uploadFlightSchedule(tableData);
//         // tableData = tableData.filter((row) => Object.keys(row).length > 0);
//         // setFlights(tableData as FlightRecord[]);
//         uploadFlightSchedule(finalTableData);
//       },
//     });
//   };

//   const handleClear = () => {
//     if (confirm("Clear all master flight records?")) {
//       setFlights([]);
//     }
//   };

//   const filtered = flights.filter(
//     (f) =>
//       f.pakej.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       f.month.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       f.flt.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="space-y-6 animate-fadeIn pb-10">
//       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
//         <div>
//           <h2 className="text-2xl font-bold tracking-tight">
//             Master Flight File
//           </h2>
//           <p className="text-slate-500 text-sm">
//             Upload your flight schedule CSV to automate quotation date picking.
//           </p>
//         </div>
//         <div className="flex gap-2 w-full md:w-auto">
//           <div className="relative flex-1 md:w-48">
//             <input
//               type="file"
//               accept=".csv"
//               onChange={handleFileUpload}
//               className="hidden"
//               ref={fileInputRef}
//             />
//             {/* Fix: Removed invalid asChild prop and using onClick with useRef to trigger file input */}
//             <Button
//               variant="outline"
//               className="w-full gap-2"
//               onClick={() => fileInputRef.current?.click()}
//             >
//               <Upload className="w-4 h-4" /> Upload CSV
//             </Button>
//           </div>
//           {flights.length > 0 && (
//             <Button variant="destructive" onClick={handleClear} size="icon">
//               <Trash2 className="w-4 h-4" />
//             </Button>
//           )}
//         </div>
//       </div>

//       <Card>
//         <CardHeader className="p-4 border-b border-slate-100">
//           <div className="relative">
//             <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
//             <Input
//               placeholder="Search flight by package, month or flight no..."
//               className="pl-9 h-9"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//         </CardHeader>
//         <CardContent className="p-0">
//           <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
//             <table className="w-full text-[10px] md:text-xs">
//               <thead className="sticky top-0 z-10">
//                 <tr className="bg-slate-900 text-white font-bold text-center">
//                   <th className="p-2 border border-slate-700">MONTH</th>
//                   <th className="p-2 border border-slate-700">NO.</th>
//                   <th className="p-2 border border-slate-700">FLT</th>
//                   <th className="p-2 border border-slate-700">DEPARTURE</th>
//                   <th className="p-2 border border-slate-700">DoW</th>
//                   <th className="p-2 border border-slate-700">SECTOR</th>
//                   <th className="p-2 border border-slate-700">RETURN</th>
//                   <th className="p-2 border border-slate-700">DoW</th>
//                   <th className="p-2 border border-slate-700">PAKEJ</th>
//                   <th className="p-2 border border-slate-700">REMARK</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-100">
//                 {filtered.map((f) => (
//                   <tr
//                     key={f.id}
//                     className="hover:bg-slate-50 transition-colors text-center font-medium"
//                   >
//                     <td className="p-2 border border-slate-100 uppercase">
//                       {f.month}
//                     </td>
//                     <td className="p-2 border border-slate-100">{f.no}</td>
//                     <td className="p-2 border border-slate-100 font-bold">
//                       {f.flt}
//                     </td>
//                     <td className="p-2 border border-slate-100 text-blue-700">
//                       {f.departure}
//                     </td>
//                     <td className="p-2 border border-slate-100">{f.dow}</td>
//                     <td className="p-2 border border-slate-100 uppercase">
//                       {f.sector}
//                     </td>
//                     <td className="p-2 border border-slate-100 text-red-700">
//                       {f.returnDate}
//                     </td>
//                     <td className="p-2 border border-slate-100">
//                       {f.dowReturn}
//                     </td>
//                     <td className="p-2 border border-slate-100 text-left font-bold">
//                       {f.pakej}
//                     </td>
//                     <td className="p-2 border border-slate-100 text-left italic text-slate-500">
//                       {f.remark}
//                     </td>
//                   </tr>
//                 ))}
//                 {filtered.length === 0 && (
//                   <tr>
//                     <td colSpan={10} className="p-20 text-center">
//                       <div className="flex flex-col items-center gap-2 text-slate-400">
//                         <FileSpreadsheet className="w-12 h-12 opacity-20" />
//                         <p>
//                           No flight records found. Upload a CSV to get started.
//                         </p>
//                       </div>
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// };

//

function FlightMaster() {
	return <div>Flight Master Component</div>;
}

export default FlightMaster;
