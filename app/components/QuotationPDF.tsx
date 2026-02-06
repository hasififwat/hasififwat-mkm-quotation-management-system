import type React from "react";
import { TERMS_AND_CONDITIONS } from "../features/quotation/legacy/constants";
import {
	formatCurrency as fmt,
	formatDateRange,
} from "../features/quotation/legacy/utils";
import type { QuotationFullDetails } from "../features/quotation/schema";

interface Props {
	details: QuotationFullDetails;
	ref?: React.Ref<HTMLDivElement> | null;
}

const QuotationPDF: React.FC<Props> = ({ details, ref = null }) => {
	const pkg = details.package;
	const activeHotels = pkg.hotels.filter((h) => h.enabled);
	const flights = details.selected_flight;
	const rooms = details.items.selected_rooms;
	const paxCount = rooms.reduce((acc, r) => acc + r.pax, 0);
	const addons = details.items.adds_ons;
	const discounts = details.items.discounts;

	const packageTotal = rooms.reduce((acc, r) => acc + r.subtotal, 0);

	// We rely on details.total_amount for the grand total if it's already calculated correctly on backend.
	// Otherwise, if we need to show breakdown logic:
	// Grand Total = Package Total + Addons - Discounts
	// For display purposes, let's trust details.total_amount, but we'll show the sub-items for clarity.

	const total = details.total_amount;

	// Format date
	const createDate = new Date(details.created_at).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});

	return (
			<div
				ref={ref}
				className="quotation-print bg-white text-black mx-auto p-12 shadow-2xl min-h-280.75 w-198.5 border border-gray-200 text-[10px] leading-tight print:shadow-none print:min-h-0 print:w-auto print:border-0"
			>
				{/* Header */}
				<div className="flex justify-between items-start mb-6">
					<div className="text-gray-600 text-[8px] max-w-50">
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
						<div className="w-full h-1 bg-linear-to-r from-blue-900 to-red-600 mt-1"></div>
					</div>
				</div>

				<div className="flex justify-end   mb-6">
					<div className="inline-block border border-gray-800 px-8 py-1 font-bold text-xs">
						SEBUT HARGA
					</div>
				</div>

				{/* Info Grid */}
				<div className="flex justify-between mb-6">
					<div className="w-1/3">
						<div className="flex mb-1">
							<span className="font-bold w-20">KEPADA :</span>
							<span className="uppercase">
								{details.client_name || "CUSTOMER NAME"}
							</span>
						</div>
					</div>
					<div className="w-2/3 flex flex-col items-end">
						<div className="grid grid-cols-2 gap-x-2 w-full max-w-57.5">
							<span className="font-bold">NO. RUJUKAN</span>
							<span>: {details.reference_number}</span>
							<span className="font-bold">TARIKH</span>
							<span>: {createDate}</span>
							<span className="font-bold">PIC</span>
							<span>: {details.pic_name}</span>
							<span className="font-bold">PEJABAT</span>
							<span>: {details.branch}</span>
						</div>
					</div>
				</div>

				{/* Pricing Table */}
				<table className="w-full border-collapse mb-1 text-[9px]">
					<thead>
						<tr className="bg-[#1a365d] text-white">
							<th className="border border-gray-400 p-1 text-center font-bold w-30 max-w-30">
								PAKEJ / BILIK
							</th>
							{rooms.map((room) => (
								<th
									key={room.room_type}
									className="border border-gray-400 p-1 text-center font-bold"
								>
									{room.room_type.toUpperCase()} / PAX
								</th>
							))}
							<th className="w-30 max-w-30 border border-gray-400 p-1 text-center font-bold uppercase bg-[#d9e2f3] text-black">
								JUMLAH {paxCount} PAX
							</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td className="border border-gray-400 p-1 text-center font-bold">
								{pkg.name} (RM)
							</td>
							{rooms.map((room) => (
								<td
									key={room.room_type}
									className="border border-gray-400 p-1 text-center "
								>
									{fmt(
										pkg.available_rooms.find(
											(r) => r.room_type === room.room_type,
										)?.price || 0,
									)}
									{room.pax > 0 && (
										<span className="font-bold ml-1 text-gray-700">
											({room.pax} PAX)
										</span>
									)}
								</td>
							))}
							<td className="border border-gray-400 p-1 text-center font-bold bg-[#d9e2f3]">
								{fmt(packageTotal)}
							</td>
						</tr>
						{/* Add-ons */}
						{addons.map((addon, i) => (
							<tr key={`addon-${i}_${addon.name}`}>
								<td
									className="border border-gray-400 p-1 text-center font-bold"
									colSpan={1}
								>
									{addon.name}
								</td>
								<td
									className="border border-gray-400 p-1 text-center"
									colSpan={rooms.length}
								>
									{fmt(addon.price)}
									<span className="font-bold ml-1 text-gray-700">
										({addon.pax} PAX)
									</span>
								</td>
								<td className="border border-gray-400 p-1 text-center font-bold bg-[#d9e2f3]">
									{fmt(addon.subtotal)}
								</td>
							</tr>
						))}

						{/* Discounts */}
						{discounts.map((discount, i) => (
							<tr key={`discount-${i}_${discount.name}`}>
								<td
									className="border border-gray-400 p-1 text-center font-bold "
									colSpan={1}
								>
									{discount.name}
								</td>
								<td
									className="border border-gray-400 p-1 text-center"
									colSpan={rooms.length}
								>
									{fmt(discount.price)}
									<span className="font-bold ml-1 text-gray-700">
										({discount.pax} PAX)
									</span>
								</td>
								<td className="border border-gray-400 p-1 text-center font-bold  bg-[#d9e2f3]">
									{fmt(discount.subtotal)}
								</td>
							</tr>
						))}

						<tr>
							<td className="border border-r-0 border-gray-400 p-1 text-center font-bold"></td>
							<td
								className="border border-l-0 border-gray-400 p-1 text-center font-bold h-6"
								colSpan={rooms.length}
							>
								JUMLAH KESELURUHAN (RM)
							</td>
							<td className="border border-gray-400 p-1 text-center font-bold bg-[#d9e2f3]">
								{fmt(total)}
							</td>
						</tr>
					</tbody>
				</table>
				<div className="text-right  text-red-600 font-bold mb-4 italic">
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
							<td className="border border-gray-400 p-1">
								{pkg.transport || "N/A"}
							</td>
						</tr>
						<tr>
							<td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
								TARIKH CADANGAN
							</td>
							<td className="border border-gray-400 p-1">
								{formatDateRange(
									flights?.departure_date || "",
									flights?.return_date || "",
								)}
							</td>
						</tr>
						<tr>
							<td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
								JUMLAH HARI
							</td>
							<td className="border border-gray-400 p-1">{pkg.duration}</td>
						</tr>
						{activeHotels.map((hotel, i) => (
							<tr key={`hotel-${i}_${hotel.name}`}>
								<td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
									HOTEL {hotel.hotel_type}
								</td>
								<td className="border border-gray-400 p-1">{hotel.name}</td>
							</tr>
						))}
						<tr>
							<td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
								JENIS MAKANAN
							</td>
							<td className="border border-gray-400 p-1">
								{Array.from(new Set(activeHotels.flatMap((h) => h.meals))).join(
									", ",
								)}
							</td>
						</tr>
						<tr>
							<td className="border border-gray-400 p-1 font-bold bg-gray-100 uppercase">
								PENGANGKUTAN
							</td>
							<td className="border border-gray-400 p-1">
								{pkg.transport || "N/A"}
							</td>
						</tr>
					</tbody>
				</table>

				{/* Inclusion/Exclusion */}
				<div className="grid grid-cols-2 gap-0 mb-6 border border-gray-400">
					<div className="border-r border-gray-400">
						<div className="bg-[#1a365d] text-white text-center py-1 font-bold uppercase">
							PAKEJ TERMASUK
						</div>
						<div className="p-2 min-h-25">
							{(pkg.inclusions?.split("\n") || []).map((item, i) => (
								<p key={`${i}_${item}`} className="mb-1  uppercase">
									* {item}
								</p>
							))}
						</div>
					</div>
					<div>
						<div className="bg-[#1a365d] text-white text-center py-1 font-bold uppercase">
							PAKEJ TIDAK TERMASUK
						</div>
						<div className="p-2 min-h-25">
							{(pkg.exclusions?.split("\n") || []).map((item, i) => (
								<p key={`${i}_${item}`} className="mb-1  uppercase">
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
						<div
							key={`${i}_${term}`}
							className="flex border-b border-gray-400 last:border-0"
						>
							<div className="w-8 border-r border-gray-400 p-1 text-center font-bold bg-gray-100">
								{i + 1}
							</div>
							<div className="flex-1 p-1  uppercase">{term}</div>
						</div>
					))}
				</div>

				{/* Footer */}
				<div className="bg-gray-100 p-4 flex justify-between items-center  border-t border-gray-300">
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
