"use client";

import { BlobProvider } from "@react-pdf/renderer";
import fileSaver from "file-saver";
import { Printer } from "lucide-react";

import { Button } from "~/components/ui/button";
import PDFPreview from "~/features/quotation/components/PDFPreview";

import type { QuotationFullDetails } from "./types";

const { saveAs } = fileSaver;

function toFileSafe(value: string) {
	return value
		.trim()
		.replace(/[^a-z0-9]+/gi, "-")
		.replace(/^-+|-+$/g, "")
		.toLowerCase();
}

/**
 * Desktop PDF pane. Lives in its own module so `@react-pdf/renderer`
 * is code-split out of the review page's initial bundle and only
 * fetched when this component mounts (loaded via `next/dynamic`).
 */
export default function PdfPreviewPane({
	details,
}: {
	details: QuotationFullDetails;
}) {
	const clientFileName = toFileSafe(details.client_name || "customer");
	const quotationFileName = toFileSafe(details.reference_number || "quotation");
	const documentTitle = `${clientFileName}_${quotationFileName}`;

	return (
		<BlobProvider document={<PDFPreview details={details} />}>
			{({ blob, url, loading, error }) => (
				<>
					<div className="hidden md:flex w-full flex-1 flex-col items-center">
						{loading && (
							<div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
								Generating PDF…
							</div>
						)}
						{error && (
							<div className="flex items-center justify-center h-screen text-destructive text-sm">
								Failed to generate PDF.
							</div>
						)}
						{url && !loading && (
							<iframe
								src={url}
								className="w-full flex-1 min-h-screen"
								title="Quotation PDF Preview"
							/>
						)}
					</div>

					<div className="fixed bottom-8 right-8 z-50">
						<Button
							size="lg"
							className="shadow-xl"
							disabled={!blob || loading}
							onClick={() => {
								if (blob) {
									saveAs(blob, `${documentTitle}.pdf`);
								}
							}}
						>
							<Printer className="mr-2 h-4 w-4" />
							{loading ? "Generating…" : "Download PDF"}
						</Button>
					</div>
				</>
			)}
		</BlobProvider>
	);
}
