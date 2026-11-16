import type { QuotationFullDetails } from "../schema";

export const QUOTATION_RENDER_VERSION = "mkm-quotation-v1" as const;
export const DOCUMENT_TIME_ZONE = "Asia/Kuala_Lumpur" as const;

type DeepReadonly<T> = {
	readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

export type DisplayDetails = Pick<QuotationFullDetails,
	"reference_number" | "client_name" | "pic_name" | "branch" | "total_amount" | "items"
> & {
	package: Pick<QuotationFullDetails["package"],
		"name" | "duration" | "transport" | "inclusions" | "exclusions" | "hotels"
	>;
	selected_flight: Pick<NonNullable<QuotationFullDetails["selected_flight"]>, "flight"> | null;
};

export type QuotationRenderAssets = Readonly<{
	version: string;
	header: string;
	footer: string;
}>;

export type QuotationRenderInput = DeepReadonly<{
	renderVersion: typeof QUOTATION_RENDER_VERSION;
	title?: string;
	datePolicy: typeof DOCUMENT_TIME_ZONE | "legacy-viewer-local";
	documentDate: string;
	travelDateRange: string;
	details: DisplayDetails;
	assets: QuotationRenderAssets;
	termsVersion: string;
	terms: string[];
}>;

type RenderContext = Omit<QuotationRenderInput, "renderVersion" | "details">;

function freeze<T extends object>(value: T): T {
	for (const child of Object.values(value)) {
		if (child && typeof child === "object") freeze(child);
	}
	return Object.freeze(value);
}

type DatedDisplayDetails = DisplayDetails & { created_at: string; selected_flight: (NonNullable<DisplayDetails["selected_flight"]> & { departure_date?: string; return_date?: string }) | null };

export function createQuotationRenderInput(
	details: DatedDisplayDetails,
	context: RenderContext,
): QuotationRenderInput {
	const pkg = details.package;
	return freeze(structuredClone({
		...context,
		renderVersion: QUOTATION_RENDER_VERSION,
		details: {
			reference_number: details.reference_number,
			client_name: details.client_name,
			pic_name: details.pic_name,
			branch: details.branch,
			total_amount: details.total_amount,
			items: details.items,
			package: {
				name: pkg.name,
				duration: pkg.duration,
				transport: pkg.transport,
				inclusions: pkg.inclusions,
				exclusions: pkg.exclusions,
				hotels: pkg.hotels,
			},
			selected_flight: details.selected_flight ? { flight: details.selected_flight.flight } : null,
		},
	}));
}

export function freezeQuotationForServer(
	details: DatedDisplayDetails,
	context: Pick<RenderContext, "assets" | "terms" | "termsVersion" | "title">,
): QuotationRenderInput {
	const date = (value: string) => {
		const calendarDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
		if (!calendarDate && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
			throw new Error("Quotation dates require an ISO calendar date or an instant with an explicit offset");
		}
		const parsed = new Date(value);
		if (!Number.isFinite(parsed.getTime()) || (calendarDate && parsed.toISOString().slice(0, 10) !== value)) {
			throw new Error("Invalid quotation date");
		}
		return new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			timeZone: DOCUMENT_TIME_ZONE,
		}).format(parsed);
	};
	const flight = details.selected_flight;
	return createQuotationRenderInput(details, {
		...context,
		datePolicy: DOCUMENT_TIME_ZONE,
		documentDate: date(details.created_at),
		travelDateRange: flight?.departure_date && flight.return_date
			? `${date(flight.departure_date).toUpperCase()} - ${date(flight.return_date).toUpperCase()}`
			: "TBC",
	});
}
