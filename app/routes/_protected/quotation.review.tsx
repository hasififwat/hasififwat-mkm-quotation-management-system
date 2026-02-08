import { BlobProvider, PDFViewer, usePDF } from "@react-pdf/renderer";
import * as pkg from "file-saver";
import { Printer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { redirect } from "react-router";
import QuotationPDF from "~/components/QuotationPDF";
import { Button } from "~/components/ui/button";
import PDFPreview from "~/features/quotation/components/PDFPreview";
import { getServerClient } from "~/lib/supabase/server";
import { UmrahQuotationService } from "~/services/quotation-service";
import type { Route } from "./+types/quotation.review";

const saveAs = pkg.saveAs || (pkg as any).default?.saveAs;

export async function loader({ params, request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);

	const initialData = await UmrahQuotationService.getQuotationFullDetails(
		supabase,
		params.qid,
	);

	// const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
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
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
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

	const issuedDate = new Date(loaderData.initialData.created_at)
		.toISOString()
		.slice(0, 10);
	const documentTitle = `${toFileSafe(loaderData.initialData.client_name || "customer")}_${issuedDate}`;

	return (
		<div
			ref={containerRef}
			className="col-span-full flex flex-col items-center bg-gray-100/50 overflow-hidden min-h-screen relative"
		>
			<PDFViewer className="w-full h-full hidden md:block">
				<PDFPreview details={loaderData.initialData} />
			</PDFViewer>
			<div
				className="bg-white shadow-lg my-8 md:hidden"
				style={{
					width: 794 * scale,
					height: 1123 * scale,
					transform: `scale(${scale})`,
					transformOrigin: "top left",
				}}
			>
				<QuotationPDF details={loaderData.initialData} />
			</div>
			<BlobProvider document={<PDFPreview details={loaderData.initialData} />}>
				{({ blob, url, loading, error }) => {
					// You can use the blob, url, loading, and error here
					// For example, you might want to provide a download link or handle loading state
					return (
						<div className="fixed bottom-8 right-8 z-50  md:hidden">
							<Button
								size="lg"
								className="shadow-xl"
								onClick={() => {
									if (blob) {
										saveAs(blob, `${documentTitle}.pdf`);
									}
								}}
							>
								<Printer className="mr-2 h-4 w-4" />
								Download PDF
							</Button>
						</div>
					); // Replace with your desired UI
				}}
			</BlobProvider>
		</div>
	);
}
