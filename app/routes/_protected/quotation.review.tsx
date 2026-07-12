import { BlobProvider } from "@react-pdf/renderer";
import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import fileSaver from "file-saver";
import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { redirect } from "react-router";

import { Button } from "~/components/ui/button";
import PDFPreview from "~/features/quotation/components/PDFPreview";
import PDFPreviewMobile from "~/features/quotation/components/PDFPreviewMobile";
import { STALE_FIELD_LABELS } from "~/features/quotation/stale-labels";
import type { Route } from "./+types/quotation.review";

const { saveAs } = fileSaver;

export async function loader({ params, request }: Route.LoaderArgs) {
	void request;
	const convexUrl = process.env.CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);

	const initialData = await client.query(
		api.quotations.getQuotationFullDetails,
		{
			target_quotation_id: params.qid,
		},
	);

	if (!initialData) {
		return redirect("/quotations");
	}

	return { initialData: initialData };
}

export default function QuotationReviewPage({
	loaderData,
}: Route.ComponentProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	const [scale, setScale] = useState(1);

	useEffect(() => {
		const handleResize = () => {
			if (containerRef.current) {
				const containerWidth = containerRef.current.offsetWidth;
				const pdfWidth = 794; // The fixed width of the QuotePDF component
				const padding = 32; // Side padding

				// Calculate scale based on container width vs PDF width
				// Only scale down (if container is smaller), don't scale up past 1
				const newScale = Math.min((containerWidth - padding) / pdfWidth, 1);
				setScale(newScale);
			}
		};

		handleResize(); // Initial calc
		window.addEventListener("resize", handleResize);

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const toFileSafe = (value: string) =>
		value
			.trim()
			.replace(/[^a-z0-9]+/gi, "-")
			.replace(/^-+|-+$/g, "")
			.toLowerCase();

	const clientFileName = toFileSafe(
		loaderData.initialData.client_name || "customer",
	);
	const quotationFileName = toFileSafe(
		loaderData.initialData.reference_number || "quotation",
	);
	const documentTitle = `${clientFileName}_${quotationFileName}`;

	const staleFields: string[] = loaderData.initialData.stale_fields ?? [];

	return (
		<div
			ref={containerRef}
			className="col-span-full flex flex-col items-center bg-gray-100/50 overflow-hidden min-h-screen relative"
		>
			{staleFields.length > 0 && (
				<div className="w-full flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">
					<span>⚠</span>
					<span>
						This PDF reflects the original values.{" "}
						The following have changed since this quotation was created:{" "}
						<span className="font-medium">
							{staleFields.map(f => STALE_FIELD_LABELS[f] ?? f).join(", ")}
						</span>.
					</span>
					<a
						href={`/quotations/edit/${loaderData.initialData.id}`}
						className="ml-auto shrink-0 rounded px-3 py-1 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
					>
						Go to edit → refresh snapshot
					</a>
				</div>
			)}

			{/* Desktop: render PDF into an iframe via blob URL */}
			<BlobProvider document={<PDFPreview details={loaderData.initialData} />}>
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

			{/* Mobile: HTML preview scaled to fit viewport width */}
			<div
				className="bg-white shadow-lg my-8 md:hidden overflow-hidden"
				style={{
					width: 794 * scale,
					height: 1123 * scale,
				}}
			>
				<div
					style={{
						width: 794,
						height: 1123,
						transform: `scale(${scale})`,
						transformOrigin: "top left",
					}}
				>
					<PDFPreviewMobile details={loaderData.initialData} />
				</div>
			</div>
		</div>
	);
}
