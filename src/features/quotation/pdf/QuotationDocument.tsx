import {
	Document,
	Font,
	Image,
	Page,
	StyleSheet,
	Text,
	View,
} from "@react-pdf/renderer";

Font.registerHyphenationCallback((word) => [word]);

import type { QuotationRenderInput } from "./render-input";
import { formatCurrency as fmt } from "../utils";

interface Props {
	input: QuotationRenderInput;
}

function getMealLabel(meals: readonly string[], hotelType: string) {
	const normalizedMeals = meals
		.map((meal) => meal?.trim())
		.filter((meal): meal is string => Boolean(meal));

	if (normalizedMeals.length === 0) {
		return `TIADA MAKANAN (${hotelType.toUpperCase()})`;
	}

	if (normalizedMeals.length === 3) {
		return `FULL BOARD(${hotelType.toUpperCase()})`;
	}

	if (normalizedMeals.length === 2) {
		return `HALF BOARD(${hotelType.toUpperCase()})`;
	}

	return `${normalizedMeals[0].toUpperCase()}(${hotelType.toUpperCase()})`;
}

function getListItems(value: string | null | undefined) {
	if (!value) return [];

	return value
		.split("\n")
		.map((line) => line.replace(/\t/g, "").trim())
		.filter(Boolean);
}

const styles = StyleSheet.create({
	page: {
		backgroundColor: "#ffffff",
		padding: 10,
		fontSize: 8,
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

export function QuotationDocument({ input }: Props) {
	const details = input.details;
	const pkg = details.package;
	const activeHotels = pkg.hotels.filter((h) => h.enabled);
	const flights = details.selected_flight;
	const rooms = details.items.selected_rooms;
	const addons = details.items.adds_ons;
	const discounts = details.items.discounts;
	const flightType = flights?.flight?.trim() || "MALAYSIA AIRLINES";
	const inclusionItems = getListItems(pkg.inclusions);
	const exclusionItems = getListItems(pkg.exclusions);

	const packageTotal = rooms.reduce((acc, r) => acc + r.subtotal, 0);

	const total = details.total_amount;

	return (
		<Document title={input.title}>
			<Page size="A4" style={styles.page}>
				<Image src={input.assets.header} style={styles.headerImage} />
				<View style={styles.body}>
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
									<Text>: {input.documentDate}</Text>
									<Text>: {details.pic_name.toUpperCase()}</Text>
									<Text>: {details.branch.toLocaleUpperCase()}</Text>
								</View>
							</View>
						</View>
					</View>
					<View style={{ marginTop: 12 }}>
						<View style={{ display: "flex", flexDirection: "row" }}>
							<View style={{ flexBasis: 140, ...styles.baseTableHeader }}>
								<Text>PAKEJ/BILIK</Text>
							</View>
							{rooms.map((room) => (
								<View
									style={{ flex: 1, ...styles.baseTableHeader }}
									key={room.id}
								>
									<Text>{room.room_type.toUpperCase()}/PAX</Text>
								</View>
							))}
							<View
								style={{
									flexBasis: 120,
									...styles.baseTableHeader,
									borderRight: "1px solid black inset",
								}}
							>
								<Text>JUMLAH</Text>
							</View>
						</View>
						<View
							style={{
								display: "flex",
								flexDirection: "row",
								alignItems: "stretch",
							}}
						>
							<View style={{ flexBasis: 140, ...styles.baseTableData }}>
								<Text>{pkg.name.toLocaleUpperCase()}</Text>
							</View>
							{rooms.map((room) => (
								<View
									style={{ flex: 1, ...styles.baseTableData }}
									key={room.id}
								>
									<Text>
										{fmt(room.price)} X ({room.pax} pax)
									</Text>
								</View>
							))}
							<View
								style={{
									flexBasis: 120,
									...styles.baseTableData,
									backgroundColor: "#e2e8f0",
									borderRight: "1px solid black inset",
								}}
							>
								<Text>{fmt(packageTotal)}</Text>
							</View>
						</View>

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
					<View style={{ marginTop: 12 }}>
						<View
							style={{
								...styles.baseTableHeader,
								borderRight: "1px solid black inset",
							}}
						>
							<Text>BUTIRAN PAKEJ</Text>
						</View>
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
								<Text>{flightType}</Text>
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
									{input.travelDateRange}
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

						{pkg.transport && (
							<View style={{ display: "flex", flexDirection: "row" }}>
								<View
									style={{
										...styles.baseTableData,
										flexBasis: 140,
										textAlign: "left",
									}}
								>
									<Text>JENIS PENGANGKUTAN</Text>
								</View>
								<View
									style={{
										...styles.baseTableData,
										flex: 1,
										textAlign: "left",
										borderRight: "1px solid black inset",
									}}
								>
									<Text>{pkg.transport.toUpperCase()}</Text>
								</View>
							</View>
						)}

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
										{getMealLabel(hotel.meals, hotel.hotel_type)}
									</Text>
								))}
							</View>
						</View>
					</View>
					{(inclusionItems.length > 0 || exclusionItems.length > 0) && (
						<View style={{ marginTop: 12 }}>
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
							<View style={{ display: "flex", flexDirection: "row" }}>
								<View
									style={{
										...styles.baseTableData,
										textAlign: "left",
										flex: 1,
										lineHeight: 1.1,
									}}
								>
									{inclusionItems.map((inclusion) => (
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
									{exclusionItems.map((exclusion) => (
										<Text key={`exclusion-${exclusion}`}>- {exclusion}</Text>
									))}
								</View>
							</View>

						</View>
					)}
					<View style={{ marginTop: 12 }}>
						<View
							style={{
								...styles.baseTableHeader,
							}}
						>
							<Text>TERMA & SYARAT PEMBAYARAN </Text>
						</View>

						{input.terms.map((term, index) => (
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

				<Image src={input.assets.footer} style={styles.footerImage} />
			</Page>
		</Document>
	);
}
