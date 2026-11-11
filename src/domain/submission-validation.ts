export function priceError(value: unknown): string | undefined {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return "Enter a finite price. Use 0 for an intentional zero price.";
	}
	if (value < 0) return "Price must be 0 or greater.";
	const rounded = Math.round(value * 100) / 100;
	if (!Number.isFinite(rounded) || Math.abs(value - rounded) > Number.EPSILON * Math.max(1, value)) {
		return "Enter a price with at most 2 decimal places.";
	}
}

export function requirePrice(value: unknown, label = "Price"): asserts value is number {
	const error = priceError(value);
	if (error) throw new Error(`${label}: ${error}`);
}

export function parsePriceInput(value: unknown): number {
	const price = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
	requirePrice(price);
	return price;
}

export function requirePrices(rows: ReadonlyArray<{ price: number }>, label = "Room") {
	rows.forEach((row, index) => requirePrice(row.price, `${label} ${index + 1} price`));
}

type FlightDates = { departure_date: string; return_date: string };

function isCalendarDate(value: string) {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function flightDateErrors(flight: FlightDates) {
	const errors: Partial<Record<keyof FlightDates, string>> = {};
	if (!isCalendarDate(flight.departure_date)) errors.departure_date = "Choose a valid departure date.";
	if (!isCalendarDate(flight.return_date)) errors.return_date = "Choose a valid return date.";
	if (!errors.departure_date && !errors.return_date && flight.return_date < flight.departure_date) {
		errors.return_date = "Return date must be on or after departure date.";
	}
	return errors;
}

export function requireFlightDates(flight: FlightDates, label = "Flight") {
	const errors = Object.values(flightDateErrors(flight));
	if (errors.length) throw new Error(`${label}: ${errors.join(" ")}`);
}
