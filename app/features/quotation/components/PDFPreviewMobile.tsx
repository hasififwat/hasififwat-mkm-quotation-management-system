import footer from "../assets/mkm-quotation-footer.png";
import header from "../assets/mkm-quotation-header.png";
import { TERMS_AND_CONDITIONS } from "../legacy/constants";
import { formatCurrency as fmt, formatDateRange } from "../legacy/utils";
import type { QuotationFullDetails } from "../schema";

interface Props {
	details: QuotationFullDetails;
}

export default function PDFPreviewMobile({ details }: Props) {
	const pkg = details.package;
	const activeHotels = pkg.hotels.filter((h) => h.enabled);
	const flights = details.selected_flight;
	const rooms = details.items.selected_rooms;
	const paxCount = rooms.reduce((acc, r) => acc + r.pax, 0);
	const addons = details.items.adds_ons;
	const discounts = details.items.discounts;

	const packageTotal = rooms.reduce((acc, r) => acc + r.subtotal, 0);

	const total = details.total_amount;

	// Format date
	const createDate = new Date(details.created_at).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});

	return (
        // Page
		<div 
		    className="quotation-print relative bg-white text-black mx-auto p-[10px] shadow-2xl w-[210mm] aspect-[210/280] border border-gray-200 text-[10px] leading-tight"
        >
			<img
				src={header}
				alt="Header"
				className="mb-3 h-[100px] w-full object-contain object-left"
			/>
			{/* Body */}
			<div className="relative  ">
				{/* Basic Info */}
				<div className="flex flex-row">
					<div className="flex-[2_2_0%] flex flex-col gap-1">
						<div className="py-2 border border-black opacity-0">
							<span className="font-semibold"> SEBUT HARGA</span>
						</div>

						<div className="flex flex-row gap-1 mt-2">
							<span className="font-semibold">KEPADA:</span>
							<span>{details.client_name.toUpperCase()}</span>
						</div>
					</div>
					<div className="flex-1">
						<div className="py-2 border border-black">
							<div className="font-semibold text-center">SEBUT HARGA</div>
						</div>
						<div className="mt-2 flex flex-row">
							<div className="flex-1">
								<div>NO. RUJUKAN</div>
								<div>TARIKH</div>
								<div>PIC</div>
								<div>PEJABAT</div>
							</div>
							<div className="flex-1">
								<div>: {details.reference_number}</div>
								<div>: {createDate}</div>
								<div>: {details.pic_name.toUpperCase()}</div>
								<div>: {details.branch.toLocaleUpperCase()}</div>
							</div>
						</div>
					</div>
				</div>

				{/* Room and Add-ons */}
				<div className="mt-3">
					{/* Table */}
					<div className="flex flex-row">
						{/* PACKAGE & ROOMS COLUMNS */}
						<div className="w-[140px] shrink-0">
							{/* Header Row */}
							<div className="bg-[#1a365d] text-white p-1 font-semibold text-center border-l border-black">
								PAKEJ/BILIK
							</div>
							{/* Data Rows */}
							<div className="p-1 text-center border-l border-b border-black">
								{pkg.name.toLocaleUpperCase()} - {paxCount} PAX
							</div>
						</div>
						{/* ROOMS COLUMNS */}
						{rooms.map((room) => (
							<div className="flex-1 min-w-0" key={room.id}>
								{/* Header Row */}
								<div className="bg-[#1a365d] text-white p-1 font-semibold text-center border-l border-black truncate">
									{room.room_type.toUpperCase()}/PAX
								</div>
								{/* Data Rows */}
								<div className="p-1 text-center border-l border-b border-black">
									{fmt(room.price)} X ({room.pax} pax)
								</div>
							</div>
						))}

						{/* SUBTOTAL COLUMN */}
						<div className="w-[120px] shrink-0">
							{/* Header Row */}
							<div className="bg-[#1a365d] text-white p-1 font-semibold text-center border-l border-r border-black">
								JUMLAH
							</div>
							{/* Data Rows */}
							<div className="p-1 text-center border-l border-b border-r border-black bg-slate-200">
								{fmt(packageTotal)}
							</div>
						</div>
					</div>

					{/* Add-ons */}

					{addons.map((addon) => (
						<div
							key={addon.id}
							className="flex flex-row"
						>
							<div className="w-[140px] shrink-0 p-1 border-l border-b border-black text-center">
								{addon.name.toUpperCase()}
							</div>
							<div className="flex-1 p-1 border-l border-b border-black text-center">
								{fmt(addon.price)} x ({addon.pax} pax)
							</div>
							<div className="w-[120px] shrink-0 p-1 border-l border-r border-b border-black bg-slate-200 text-center">
								{fmt(addon.price * addon.pax)}
							</div>
						</div>
					))}

					{/* Discount */}
					{discounts.length > 0 &&
						discounts.map((discount) => (
							<div
								key={discount.id}
								className="flex flex-row"
							>
								<div className="w-[140px] shrink-0 p-1 border-l border-b border-black text-center">
									{discount.name.toUpperCase()}
								</div>
								<div className="flex-1 p-1 border-l border-b border-black text-center">
									{fmt(discount.price)} x ({discount.pax} pax)
								</div>
								<div className="w-[120px] shrink-0 p-1 border-l border-r border-b border-black bg-slate-200 text-center">
									- {fmt(discount.price * discount.pax)}
								</div>
							</div>
						))}

					{/* Total Amount */}
					<div className="flex flex-row">
						<div className="w-[140px] shrink-0 p-1 border-l border-b border-black">
							JUMLAH KESELURUHAN
						</div>
						<div className="flex-1 p-1 border-l border-b border-black"></div>
						<div className="w-[120px] shrink-0 p-1 border-l border-r border-b border-black bg-slate-200 font-semibold text-center">
							{fmt(total)}
						</div>
					</div>
				</div>

				{/* Package Details */}
				<div className="mt-3">
					{/* Package Detail Table */}
					<div className="bg-[#1a365d] text-white p-1 font-semibold text-center border-l border-r border-black">
						BUTIRAN PAKEJ
					</div>
					{/* Data */}
					<DetailRow label="JENIS PENERBANGAN" value="MALAYSIA AIRLINES" />
					<DetailRow
						label="TARIKH CADANGAN"
						value={formatDateRange(
							flights?.departure_date || "",
							flights?.return_date || "",
						)}
					/>
					<DetailRow label="JUMLAH HARI" value={pkg.duration} />

					{activeHotels.map((hotel, i) => (
						<DetailRow
							key={`hotel-${i}_${hotel.name}`}
							label={`HOTEL ${hotel.hotel_type.toUpperCase()}:`}
							value={hotel.name.toUpperCase()}
						/>
					))}

					<DetailRow
						label="JENIS MAKANAN"
						value={
							<div className="flex flex-row gap-1">
								{activeHotels.map((hotel, index) => (
									<span key={`meal-${hotel.name}`}>
										{index > 0 ? ", " : ""}
										{hotel.meals.length === 3
											? `FULL BOARD(${hotel.hotel_type.toUpperCase()})`
											: hotel.meals.length === 2
												? `HALF BOARD(${hotel.hotel_type.toUpperCase()})`
												: `${hotel.meals[0].toUpperCase()}(${hotel.hotel_type.toUpperCase()})`}
									</span>
								))}
							</div>
						}
					/>
				</div>

				{/* Package Inclusions and Exclusions */}
				<div className="mt-3">
					{/* Header */}
					<div className="flex flex-row">
						<div className="flex-1 bg-[#1a365d] text-white p-1 font-semibold text-center border-l border-black">
							PAKEJ TERMASUK
						</div>
						<div className="flex-1 bg-[#1a365d] text-white p-1 font-semibold text-center border-l border-r border-black">
							PAKEJ TIDAK TERMASUK
						</div>
					</div>
					{/* Data */}
					<div className="flex flex-row"
              
                    >
						<div className="flex-1 p-1 border-l border-b border-black text-left " >
					
                                {pkg.inclusions?.split("\n").map((inc) => (
                            		<div className="mb-2 leading-relaxed"> 
                                        - {inc}
                                    </div>)
                                 )}     
                     
                           
						</div>
						<div className="flex-1 p-1 border-l border-r border-b border-black text-left"  >
							 {pkg.exclusions?.split("\n").map((inc) => (
                            		<div className="mb-2 leading-relaxed" >
                                        - {inc}
                                    </div>)
                              )}   
						</div>
					</div>

					{/* Inclusions */}
				</div>

				{/* Terms and Conditions */}
				<div className="mt-3">
					<div className="bg-[#1a365d] text-white p-1 font-semibold text-center border-l border-r border-black">
						TERMA & SYARAT PEMBAYARAN{" "}
					</div>
					{/* Data */}

					{TERMS_AND_CONDITIONS.map((term, index) => (
						<div
							key={`${term}`}
							className="flex flex-row"
						>
							<div className="w-[20px] shrink-0 p-1 border-l border-b border-black text-left">
								{index + 1}.
							</div>
							<div className="flex-1 p-1 border-l border-r border-b border-black text-left">
								{term}
							</div>
						</div>
					))}
				</div>
			</div>


			<div className="absolute bottom-[10px] left-[10px] right-[10px]">
				<img
					src={footer}
					className="h-[100px] w-full object-contain object-left"
					alt="Footer"
				/>
			</div>
		</div>
        
	);
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="flex flex-row">
			<div className="w-[140px] shrink-0 p-1 border-l border-b border-black text-left">
				{label}
			</div>
			<div className="flex-1 p-1 border-l border-r border-b border-black text-left">
				{value}
			</div>
		</div>
	);
}
