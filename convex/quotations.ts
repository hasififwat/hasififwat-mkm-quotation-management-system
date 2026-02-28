import { query } from "./_generated/server";

function buildQuotationNumber(hijriYear: string, sequenceNum: number, revision: number) {
	const paddedSequence = String(sequenceNum).padStart(4, "0");
	return revision > 0
		? `${hijriYear}-${paddedSequence}-R${revision}`
		: `${hijriYear}-${paddedSequence}`;
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const [quotations, packages, packageFlights] = await Promise.all([
			ctx.db.query("quotations").collect(),
			ctx.db.query("packages").collect(),
			ctx.db.query("package_flights").collect(),
		]);

			const packagesById = new Map<string, (typeof packages)[number]>();
		for (const pkg of packages) {
				packagesById.set(String(pkg._id), pkg);
		}

			const flightsById = new Map<string, (typeof packageFlights)[number]>();
		for (const flight of packageFlights) {
				flightsById.set(String(flight._id), flight);
		}

		return quotations
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.map((quotation) => {
				const selectedPackage = packagesById.get(quotation.package_id);
				const selectedFlight = flightsById.get(quotation.flight_id);

				return {
					id: String(quotation._id),
					quotation_number: buildQuotationNumber(
						quotation.hijri_year,
						quotation.sequence_num,
						quotation.revision,
					),
					client_name: quotation.client_name,
					pic_name: quotation.pic_name,
					branch: quotation.branch,
					status: quotation.status,
					total_amount: quotation.total_amount,
					notes: quotation.notes ?? "",
					hijri_year: quotation.hijri_year,
					created_at: quotation.created_at,
					updated_at: quotation.updated_at,
					package: {
						id: selectedPackage ? String(selectedPackage._id) : null,
						name: selectedPackage?.name ?? "Unknown Package",
						year: selectedPackage?.year ?? null,
						duration: selectedPackage?.duration ?? null,
					},
					selected_flight: selectedFlight
						? {
							id: String(selectedFlight._id),
							month: selectedFlight.month,
							return_date: selectedFlight.return_date,
							return_sector: selectedFlight.return_sector,
							departure_date: selectedFlight.departure_date,
							departure_sector: selectedFlight.departure_sector,
						}
						: null,
				};
			});
	},
});
