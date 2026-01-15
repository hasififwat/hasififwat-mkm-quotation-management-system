import React from "react";
import type { PackageDetails, QuotationData } from "../types";
import { TERMS_AND_CONDITIONS } from "../constants";
import { formatCurrency as fmt, formatDateRange } from "../utils";

interface Props {
  data: QuotationData;
  pkg: PackageDetails;
}

const QuotationPDF: React.FC<Props> = ({ data, pkg }) => {
  const getPriceByRoom = (type: string) => {
    if (type === "double") return pkg.priceDouble;
    if (type === "triple") return pkg.priceTriple;
    return pkg.priceQuad;
  };

  const paxCount = typeof data.pax === "number" ? data.pax : 0;
  const unitPrice = getPriceByRoom(data.roomType);
  const total = unitPrice * paxCount;

  return (
    <div
      className="bg-white mx-auto p-12 shadow-2xl min-h-[1123px] w-[794px] border border-gray-200 text-[10px] leading-tight relative overflow-hidden"
      style={{ colorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="text-gray-600 text-[8px] max-w-[200px]">
          <p>Star Avenue Commercial Centre,</p>
          <p>B-29, Jalan Zuhal U5/179, Seksyen U5,</p>
          <p>Bandar Pinggiran Subang, 40150 Shah Alam, Selangor</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[#1a365d] montserrat font-extrabold text-2xl italic">
              MKM
            </div>
            <div className="text-[6px] font-bold border-l border-gray-400 pl-2 text-gray-700">
              MKM Ticketing
              <br />
              Travel & Tours
              <br />
              <span className="font-normal">964005-X / KPL 6666</span>
            </div>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-blue-900 to-red-600 mt-1"></div>
        </div>
      </div>

      <div className="text-center mb-6">
        <div className="inline-block border border-gray-800 px-8 py-1 font-bold text-xs">
          SEBUT HARGA
        </div>
      </div>

      {/* Info Grid */}
      <div className="flex justify-between mb-6">
        <div className="w-1/2">
          <div className="flex mb-1">
            <span className="font-bold w-20">KEPADA :</span>
            <span className="uppercase">
              {data.clientName || "CUSTOMER NAME"}
            </span>
          </div>
        </div>
        <div className="w-1/2 flex flex-col items-end">
          <div className="grid grid-cols-2 gap-x-2 w-full max-w-[200px]">
            <span className="font-bold">NO. RUJUKAN</span>
            <span>: {data.referenceNumber}</span>
            <span className="font-bold">TARIKH</span>
            <span>: {data.date}</span>
            <span className="font-bold">PIC</span>
            <span>: {data.salesperson}</span>
            <span className="font-bold">PEJABAT</span>
            <span>: {data.office}</span>
          </div>
        </div>
      </div>

      {/* Pricing Table */}
      <table className="w-full border-collapse mb-1 text-[9px]">
        <thead>
          <tr className="bg-[#1a365d] text-white">
            <th className="border border-gray-400 p-1 text-center font-bold">
              PAKEJ / BILIK
            </th>
            <th className="border border-gray-400 p-1 text-center font-bold">
              DOUBLE ROOM/PAX
            </th>
            <th className="border border-gray-400 p-1 text-center font-bold">
              TRIPLE ROOM/PAX
            </th>
            <th className="border border-gray-400 p-1 text-center font-bold">
              QUAD ROOM/PAX
            </th>
            <th className="border border-gray-400 p-1 text-center font-bold uppercase bg-[#d9e2f3] text-black">
              JUMLAH {paxCount} PAX
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-400 p-1 text-center font-bold">
              {pkg.name} (RM)
            </td>
            <td className="border border-gray-400 p-1 text-center">
              {fmt(pkg.priceDouble)}
            </td>
            <td className="border border-gray-400 p-1 text-center">
              {fmt(pkg.priceTriple)}
            </td>
            <td className="border border-gray-400 p-1 text-center">
              {fmt(pkg.priceQuad)}
            </td>
            <td className="border border-gray-400 p-1 text-center font-bold bg-[#d9e2f3]">
              {fmt(total)}
            </td>
          </tr>
          <tr>
            <td
              className="border border-gray-400 p-1 text-center font-bold h-6"
              colSpan={4}
            >
              JUMLAH KESELURUHAN (RM)
            </td>
            <td className="border border-gray-400 p-1 text-center font-bold bg-[#d9e2f3]">
              {fmt(total)}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="text-right text-[7px] text-red-600 font-bold mb-4 italic">
        *TERTAKLUK KEKOSONGAN & HARGA SEMASA
      </div>

      {/* Package Details */}
      <div className="bg-[#1a365d] text-white text-center py-1 font-bold mb-0 border border-[#1a365d]">
        BUTIRAN PAKEJ
      </div>
      <table className="w-full border-collapse mb-6 text-[8px]">
        <tbody>
          <tr>
            <td className="border border-gray-400 p-1 font-bold w-1/4 bg-gray-100 uppercase">
              JENIS PENERBANGAN
            </td>
            <td className="border border-gray-400 p-1">{pkg.flightType}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
              TARIKH CADANGAN
            </td>
            <td className="border border-gray-400 p-1">
              {formatDateRange(data.startDate, data.endDate)}
            </td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
              JUMLAH HARI
            </td>
            <td className="border border-gray-400 p-1">{pkg.duration}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
              HOTEL MAKKAH
            </td>
            <td className="border border-gray-400 p-1">{pkg.hotelMakkah}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
              HOTEL MADINAH
            </td>
            <td className="border border-gray-400 p-1">{pkg.hotelMadinah}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
              HOTEL TAIF
            </td>
            <td className="border border-gray-400 p-1">{pkg.hotelTaif}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
              JENIS MAKANAN
            </td>
            <td className="border border-gray-400 p-1">{pkg.meals}</td>
          </tr>
          <tr>
            <td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
              PENGANGKUTAN
            </td>
            <td className="border border-gray-400 p-1">{pkg.transport}</td>
          </tr>
        </tbody>
      </table>

      {/* Inclusion/Exclusion */}
      <div className="grid grid-cols-2 gap-0 mb-6 border border-gray-400">
        <div className="border-r border-gray-400">
          <div className="bg-[#1a365d] text-white text-center py-1 font-bold uppercase">
            PAKEJ TERMASUK
          </div>
          <div className="p-2 min-h-[100px]">
            {pkg.inclusions.map((item, i) => (
              <p key={i} className="mb-1 text-[7px] uppercase">
                * {item}
              </p>
            ))}
          </div>
        </div>
        <div>
          <div className="bg-[#1a365d] text-white text-center py-1 font-bold uppercase">
            PAKEJ TIDAK TERMASUK
          </div>
          <div className="p-2 min-h-[100px]">
            {pkg.exclusions.map((item, i) => (
              <p key={i} className="mb-1 text-[7px] uppercase">
                * {item}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Terms */}
      <div className="bg-[#1a365d] text-white text-center py-1 font-bold uppercase border border-[#1a365d]">
        TERMA & SYARAT PEMBAYARAN
      </div>
      <div className="border border-gray-400 border-t-0 mb-6">
        {TERMS_AND_CONDITIONS.map((term, i) => (
          <div key={i} className="flex border-b border-gray-400 last:border-0">
            <div className="w-8 border-r border-gray-400 p-1 text-center font-bold bg-gray-100">
              {i + 1}
            </div>
            <div className="flex-1 p-1 text-[7px] uppercase">{term}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="bg-gray-100 p-4 flex justify-between items-center text-[7px] border-t border-gray-300">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="font-bold uppercase">Laman Web</span>
          <span>www.mkm.my</span>
          <span className="font-bold uppercase">Emel</span>
          <span>enquiry@mkm.my</span>
          <span className="font-bold uppercase">Haji/Umrah/Visa</span>
          <span>03-7831 6740</span>
          <span className="font-bold uppercase">Tiket/Pelancongan</span>
          <span>03-7831 8740</span>
          <span className="font-bold uppercase">Pentadbiran</span>
          <span>03-7831 3740</span>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 opacity-50 grayscale">
            <div className="text-[#1a365d] montserrat font-extrabold text-lg italic">
              MKM
            </div>
            <div className="text-[5px] font-bold border-l border-gray-400 pl-1 text-gray-700">
              MKM Ticketing
              <br />
              Travel & Tours
              <br />
              <span className="font-normal">964005-X / KPL 6666</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationPDF;
