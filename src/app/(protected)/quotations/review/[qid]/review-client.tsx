"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import PDFPreviewMobile from "~/features/quotation/components/PDFPreviewMobile";
import { QuotationPdfSkeleton } from "~/features/quotation/components/QuotationPdfSkeleton";
import { STALE_FIELD_LABELS } from "~/features/quotation/stale-labels";

import type { QuotationFullDetails } from "./types";

const PdfPreviewPane = dynamic(() => import("./pdf-preview-pane"), {
	ssr: false,
	loading: () => (
		<div className="hidden min-h-screen w-full flex-1 flex-col items-center gap-3 p-4 md:flex">
			<p role="status" className="text-sm text-muted-foreground">
				Loading PDF viewer…
			</p>
			<QuotationPdfSkeleton className="flex-1" />
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
				const pdfWidth = 794;
				const padding = 32;

				const newScale = Math.min((containerWidth - padding) / pdfWidth, 1);
				setScale(newScale);
			}
		};

		handleResize();
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
				<div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:px-6">
					<div className="flex min-w-0 flex-[1_1_16rem] items-start gap-3">
						<span>⚠</span>
						<span className="min-w-0 wrap-anywhere">
							This PDF uses saved snapshot values where available.{" "}
							Details requiring verification:{" "}
							<span className="font-medium">
								{staleFields.map(f => STALE_FIELD_LABELS[f] ?? f).join(", ")}
							</span>.
						</span>
					</div>
					<a
						href={`/quotations/edit/${initialData.id}`}
						className="ml-auto max-w-full shrink-0 wrap-anywhere rounded bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-200"
					>
						Go to edit → refresh snapshot
					</a>
				</div>
			)}

			<PdfPreviewPane details={initialData} />

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
