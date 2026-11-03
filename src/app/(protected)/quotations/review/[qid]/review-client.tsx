"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import PDFPreviewMobile from "~/features/quotation/components/PDFPreviewMobile";
import { STALE_FIELD_LABELS } from "~/features/quotation/stale-labels";

import type { QuotationFullDetails } from "./types";

/**
 * The PDF pane pulls in `@react-pdf/renderer` (~1MB). Load it as a
 * separate client bundle on mount instead of statically importing it
 * into the review page bundle (bundle-dynamic-imports).
 */
const PdfPreviewPane = dynamic(() => import("./pdf-preview-pane"), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center h-screen text-muted-foreground text-sm">
			Loading PDF viewer…
		</div>
	),
});

export function ReviewClient({
	initialData,
}: { initialData: QuotationFullDetails }) {
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

	const staleFields: string[] = initialData.stale_fields ?? [];

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
						href={`/quotations/edit/${initialData.id}`}
						className="ml-auto shrink-0 rounded px-3 py-1 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
					>
						Go to edit → refresh snapshot
					</a>
				</div>
			)}

			{/* Desktop: PDF rendered into an iframe via blob URL (dynamically loaded) */}
			<PdfPreviewPane details={initialData} />

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
					<PDFPreviewMobile details={initialData} />
				</div>
			</div>
		</div>
	);
}
