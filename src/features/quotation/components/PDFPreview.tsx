"use client";

import footer from "../assets/mkm-quotation-footer.png";
import header from "../assets/mkm-quotation-header.png";
import { TERMS_AND_CONDITIONS } from "../constants";
import { QuotationDocument } from "../pdf/QuotationDocument";
import { createQuotationRenderInput } from "../pdf/render-input";
import type { QuotationFullDetails } from "../schema";
import { formatDateRange } from "../utils";

interface Props {
	details: QuotationFullDetails;
	fileName?: string;
}

export default function PDFPreview({ details, fileName }: Props) {
	return (
		<QuotationDocument
			input={createQuotationRenderInput(details, {
			title: fileName,
			datePolicy: "legacy-viewer-local",
			documentDate: new Date(details.created_at).toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			}),
			travelDateRange: formatDateRange(
				details.selected_flight?.departure_date || "",
				details.selected_flight?.return_date || "",
			),
			assets: { version: "mkm-branding-v1", header: header.src, footer: footer.src },
			termsVersion: "mkm-payment-terms-v1",
			terms: TERMS_AND_CONDITIONS,
		})}
		/>
	);
}
