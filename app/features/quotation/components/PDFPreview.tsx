import {
	Document,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";

import footer from "../assets/mkm-quotation-footer.png";
import header from "../assets/mkm-quotation-header.png";
import { TERMS_AND_CONDITIONS } from "../legacy/constants";
import { formatCurrency as fmt, formatDateRange } from "../legacy/utils";
import type { QuotationFullDetails } from "../schema";

interface Props {
	details: QuotationFullDetails;
}

const styles = StyleSheet.create({
	page: {
		backgroundColor: "#ffffff",
		padding: 10,
		fontSize: 8, // Slightly smaller to guarantee one-page fit
		color: "#000",
		fontFamily: "Helvetica",
	},
	headerImage: {
		marginBottom: 12,
		height: 60,
	},
	footerImage: {
		position: "absolute",
		left: 0,
		right: 0,
		bottom: 0,

		height: 60,
		marginBottom: 10,
		marginHorizontal: 10,
	},

	body: {
		height: 680,

		position: "relative",
	},

	basicInfoContainer: {
		display: "flex",
		flexDirection: "row",
	},

	baseTableHeader: {
		backgroundColor: "#1a365d",
		color: "#fff",
		padding: 4,
		fontWeight: 600,
		textAlign: "center",
		borderLeft: "1px solid black inset",
	},
	baseTableData: {
		padding: 4,
		textAlign: "center",
		borderLeft: "1px solid black inset",
		borderBottom: "1px solid black inset",
	},
});

export default function PDFPreview({ details }: Props) {
	const pkg = details.package;
	const activeHotels = pkg.hotels.filter((h) => h.enabled);
	const flights = details.selected_flight;
	const rooms = details.items.selected_rooms;
	const _paxCount = rooms.reduce((acc, r) => acc + r.pax, 0);
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
		<Document>
			<Page size="A4" style={styles.page}>
				<Image src={header} style={styles.headerImage} />
				{/* Body */}
				<View style={styles.body}>
					{/* Basic Info */}
					<View style={styles.basicInfoContainer}>
						<View
							style={{
								flex: 2 / 3,
								display: "flex",
								flexDirection: "column",
								gap: 4,
							}}
						>
							<View
								style={{
									paddingVertical: 8,
									border: "1px solid #000",
									opacity: 0,
								}}
							>
								<Text style={{ fontWeight: 600 }}> SEBUT HARGA</Text>
							</View>

							<View
								style={{
									display: "flex",
									flexDirection: "row",
									gap: 4,
									marginTop: 8,
								}}
							>
								<Text style={{ fontWeight: 600 }}>KEPADA:</Text>
								<Text>{details.client_name.toUpperCase()}</Text>
							</View>
						</View>
						<View style={{ flex: 1 / 3 }}>
							<View style={{ paddingVertical: 8, border: "1px solid #000" }}>
								<Text style={{ fontWeight: 600, textAlign: "center" }}>
									SEBUT HARGA
								</Text>
							</View>
							<View
								style={{
									marginTop: 8,
									display: "flex",
									flexDirection: "row",
								}}
							>
								<View style={{ flex: 1 / 2 }}>
									<Text>NO. RUJUKAN</Text>
									<Text>TARIKH</Text>
									<Text>PIC</Text>
									<Text>PEJABAT</Text>
								</View>
								<View style={{ flex: 1 / 2 }}>
									<Text>: {details.reference_number}</Text>
									<Text>: {createDate}</Text>
									<Text>: {details.pic_name.toUpperCase()}</Text>
									<Text>: {details.branch.toLocaleUpperCase()}</Text>
								</View>
							</View>
						</View>
					</View>
					{/* Room and Add-ons */}
					<View style={{ marginTop: 12 }}>
						{/* Table */}
						<View
							style={{
								display: "flex",
								flexDirection: "row",
							}}
						>
							{/* PACKAGE & ROOMS COLUMNS */}
							<View
								style={{
									flexBasis: 140,
									textOverflow: "ellipsis",
									overflow: "hidden",
								}}
							>
								{/* Header Row */}
								<View style={{ ...styles.baseTableHeader }}>
									<Text>PAKEJ/BILIK</Text>
								</View>
								{/* Data Rows */}
								<View>
									<Text style={{ ...styles.baseTableData }}>
										{pkg.name.toLocaleUpperCase()}
									</Text>
								</View>
							</View>
							{/* ROOMS COLUMNS */}
							{rooms.map((room) => (
								<View style={{ flex: 1 }} key={room.id}>
									{/* Header Row */}
									<View style={{ ...styles.baseTableHeader }}>
										<Text>{room.room_type.toUpperCase()}/PAX</Text>
									</View>
									{/* Data Rows */}
									<View style={{ ...styles.baseTableData }}>
										<Text>
											{fmt(room.price)} X ({room.pax} pax)
										</Text>
									</View>
								</View>
							))}

							{/* SUBTOTAL COLUMN */}
							<View style={{ flexBasis: 120 }}>
								{/* Header Row */}
								<View
									style={{
										...styles.baseTableHeader,
										borderRight: "1px solid black inset",
									}}
								>
									<Text>JUMLAH</Text>
								</View>
								{/* Data Rows */}
								<View
									style={{
										...styles.baseTableData,
										backgroundColor: "#e2e8f0",
										borderRight: "1px solid black inset",
									}}
								>
									<Text>{fmt(packageTotal)}</Text>
								</View>
							</View>
						</View>
						{/* Add-ons */}

						{addons.map((addon) => (
							<View
								key={addon.id}
								style={{
									display: "flex",
									flexDirection: "row",
								}}
							>
								<View style={{ ...styles.baseTableData, flexBasis: 140 }}>
									<Text>{addon.name.toUpperCase()}</Text>
								</View>
								<View style={{ ...styles.baseTableData, flex: 1 }}>
									<Text>
										{fmt(addon.price)} x ({addon.pax} pax)
									</Text>
								</View>
								<View
									style={{
										...styles.baseTableData,
										flexBasis: 120,
										backgroundColor: "#e2e8f0",
										borderRight: "1px solid black inset",
									}}
								>
									<Text>{fmt(addon.price * addon.pax)}</Text>
								</View>
							</View>
						))}

						{/* Discount */}
						{discounts.length > 0 &&
							discounts.map((discount) => (
								<View
									key={discount.id}
									style={{
										display: "flex",
										flexDirection: "row",
									}}
								>
									<View style={{ ...styles.baseTableData, flexBasis: 140 }}>
										<Text>{discount.name.toUpperCase()}</Text>
									</View>
									<View style={{ ...styles.baseTableData, flex: 1 }}>
										<Text>
											{fmt(discount.price)} x ({discount.pax} pax)
										</Text>
									</View>
									<View
										style={{
											...styles.baseTableData,
											flexBasis: 120,
											backgroundColor: "#e2e8f0",
											borderRight: "1px solid black inset",
										}}
									>
										<Text> - {fmt(discount.price * discount.pax)}</Text>
									</View>
								</View>
							))}

						{/* Total Amount */}
						<View
							style={{
								display: "flex",
								flexDirection: "row",
							}}
						>
							<View style={{ ...styles.baseTableData, flexBasis: 140 }}>
								<Text>JUMLAH KESELURUHAN</Text>
							</View>
							<View style={{ ...styles.baseTableData, flex: 1 }}></View>
							<View
								style={{
									...styles.baseTableData,
									flexBasis: 120,
									backgroundColor: "#e2e8f0",
									fontWeight: 600,
									borderRight: "1px solid black inset",
								}}
							>
								<Text>{fmt(total)}</Text>
							</View>
						</View>
					</View>

					{/* Package Details */}
					<View style={{ marginTop: 12 }}>
						{/* Package Detail Table */}
						<View
							style={{
								...styles.baseTableHeader,
								borderRight: "1px solid black inset",
							}}
						>
							<Text>BUTIRAN PAKEJ</Text>
						</View>
						{/* Data */}
						<View style={{ display: "flex", flexDirection: "row" }}>
							<View
								style={{
									...styles.baseTableData,
									flexBasis: 140,
									textAlign: "left",
								}}
							>
								<Text>JENIS PENERBANGAN</Text>
							</View>
							<View
								style={{
									...styles.baseTableData,
									flex: 1,
									textAlign: "left",
									borderRight: "1px solid black inset",
								}}
							>
								<Text>MALAYSIA AIRLINES</Text>
							</View>
						</View>
						<View style={{ display: "flex", flexDirection: "row" }}>
							<View
								style={{
									...styles.baseTableData,
									flexBasis: 140,
									textAlign: "left",
								}}
							>
								<Text>TARIKH CADANGAN</Text>
							</View>
							<View
								style={{
									...styles.baseTableData,
									flex: 1,
									textAlign: "left",
									borderRight: "1px solid black inset",
								}}
							>
								<Text>
									{formatDateRange(
										flights?.departure_date || "",
										flights?.return_date || "",
									)}
								</Text>
							</View>
						</View>
						<View style={{ display: "flex", flexDirection: "row" }}>
							<View
								style={{
									...styles.baseTableData,
									flexBasis: 140,
									textAlign: "left",
								}}
							>
								<Text>JUMLAH HARI</Text>
							</View>
							<View
								style={{
									...styles.baseTableData,
									flex: 1,
									textAlign: "left",
									borderRight: "1px solid black inset",
								}}
							>
								<Text>{pkg.duration}</Text>
							</View>
						</View>

						{activeHotels.map((hotel, i) => (
							<View
								style={{
									display: "flex",
									flexDirection: "row",
								}}
								key={`hotel-${i}_${hotel.name}`}
							>
								<View
									style={{
										...styles.baseTableData,
										flexBasis: 140,
										textAlign: "left",
									}}
								>
									<Text>HOTEL {hotel.hotel_type.toUpperCase()}:</Text>
								</View>

								<View
									style={{
										...styles.baseTableData,
										flex: 1,
										textAlign: "left",
										borderRight: "1px solid black inset",
									}}
								>
									<Text>{hotel.name.toUpperCase()}</Text>
								</View>
							</View>
						))}

						<View style={{ display: "flex", flexDirection: "row" }}>
							<View
								style={{
									...styles.baseTableData,
									flexBasis: 140,
									textAlign: "left",
								}}
							>
								<Text>JENIS MAKANAN</Text>
							</View>
							<View
								style={{
									...styles.baseTableData,
									flex: 1,
									textAlign: "left",
									display: "flex",
									flexDirection: "row",
									gap: 2,
									borderRight: "1px solid black inset",
								}}
							>
								{activeHotels.map((hotel, index) => (
									<Text key={`meal-${hotel.name}`}>
										{index > 0 ? ", " : ""}
										{hotel.meals.length === 3
											? `FULL BOARD(${hotel.hotel_type.toUpperCase()})`
											: hotel.meals.length === 2
												? `HALF BOARD(${hotel.hotel_type.toUpperCase()})`
												: `${hotel.meals[0].toUpperCase()}(${hotel.hotel_type.toUpperCase()})`}
									</Text>
								))}
							</View>
						</View>
					</View>

					{/* Package Inclusions and Exclusions */}
					<View style={{ marginTop: 12 }}>
						{/* Header */}
						<View style={{ display: "flex", flexDirection: "row" }}>
							<View
								style={{
									...styles.baseTableHeader,
									flex: 1,
								}}
							>
								<Text>PAKEJ TERMASUK</Text>
							</View>
							<View
								style={{
									...styles.baseTableHeader,
									flex: 1,
									borderRight: "1px solid black inset",
								}}
							>
								<Text>PAKEJ TIDAK TERMASUK</Text>
							</View>
						</View>
						{/* Data */}
						<View style={{ display: "flex", flexDirection: "row" }}>
							<View
								style={{
									...styles.baseTableData,
									textAlign: "left",
									flex: 1,
									lineHeight: 1.1,
								}}
							>
								{pkg.inclusions?.split("\n").map((inclusion) => (
									<Text key={`inclusion-${inclusion}`}>- {inclusion}</Text>
								))}
							</View>
							<View
								style={{
									...styles.baseTableData,
									flex: 1,
									textAlign: "left",
									lineHeight: 1.1,
									borderRight: "1px solid black inset",
								}}
							>
								{pkg.exclusions?.split("\n").map((exclusion) => (
									<Text key={`exclusion-${exclusion}`}>- {exclusion}</Text>
								))}
							</View>
						</View>

						{/* Inclusions */}
					</View>

					{/* Terms and Conditions */}
					<View style={{ marginTop: 12 }}>
						<View
							style={{
								...styles.baseTableHeader,
							}}
						>
							<Text>TERMA & SYARAT PEMBAYARAN </Text>
						</View>
						{/* Data */}

						{TERMS_AND_CONDITIONS.map((term, index) => (
							<View
								key={`${term}`}
								style={{ display: "flex", flexDirection: "row" }}
							>
								<View
									style={{
										...styles.baseTableData,
										flexBasis: 16,
										textAlign: "left",
									}}
								>
									<Text>{index + 1}.</Text>
								</View>
								<View
									style={{
										...styles.baseTableData,
										borderRight: "1px solid black inset",
										textAlign: "left",
										flex: 1,
									}}
								>
									<Text>{term}</Text>
								</View>
							</View>
						))}
					</View>
				</View>

				<Image src={footer} style={styles.footerImage} />
			</Page>
		</Document>
	);
}
