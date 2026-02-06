import { Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { redirect } from "react-router";
import * as pkg from "react-to-print";
import QuotationPDF from "~/components/QuotationPDF";
import { Button } from "~/components/ui/button";
import { getServerClient } from "~/lib/supabase/server";
import { UmrahQuotationService } from "~/services/quotation-service";
import type { Route } from "./+types/quotation.review";

const useReactToPrint =
	pkg.useReactToPrint || (pkg as any).default?.useReactToPrint;

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
	const pdfRef = useRef<HTMLDivElement>(null);
	const [scale, setScale] = useState(1);
	const contentRef = useRef<HTMLDivElement>(null);
    const [isPrinting, setIsPrinting] = useState(false);

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

	// PDF original dimensions
	const pdfWidth = 794;
	const pdfHeight = 1123; // From min-h-[1123px]

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

    
    const reactToPrintFn = useReactToPrint({ contentRef: pdfRef, documentTitle});

    
	return (
             <div  className="col-span-full flex flex-col items-center py-0 bg-gray-100/50 overflow-hidden min-h-screen relative print:py-0">
               	<div 
            className="print-btn fixed bottom-8 right-8 z-50 print:hidden">
           
			    <Button
					onClick={() => reactToPrintFn()}
					size="lg"
					className="shadow-xl"
				>
					<Printer className="mr-2 h-4 w-4" />
					Export PDF
				</Button>
			</div >
                   
                   
                   {/* <div style={{ 
                    position: "absolute", 
                    top: "-9999px", 
                    left: "-9999px",
                    width: "794px" // Fixed A4 width
                }}>





                
                   </div> */}

                    <QuotationPDF details={loaderData.initialData} ref={pdfRef} />     
                   
             </div>
        
		// <div
		// 	ref={containerRef}
		// 	className="col-span-full flex flex-col items-center py-8 bg-gray-100/50 overflow-hidden min-h-screen relative print:hidden"
		// >
         
        //     {/* Print Button */}
	

		// 	{/* Screen View */}
		// 	<div
		// 		className="print:hidden"
		// 		style={{
		// 			width: pdfWidth,
		// 			height: pdfHeight, // Reserve original space to allow transform to work contextually
		// 			transform: `scale(${scale})`,
		// 			transformOrigin: "top center",
		// 			marginBottom: -1 * (pdfHeight * (1 - scale)), // Compensate for vertical space lost by scaling
		// 		}}
		// 	>
		// 		<div ref={contentRef} className="print:hidden">
		// 			<QuotationPDF details={loaderData.initialData}  />
		// 		</div>
		// 	</div>
        //     <div style={{ display: "none" }}>
           

        //     </div>
           

		// 	{/* Print View Portal - Rendered directly to body to escape layout constraints */}
		// 	{/* {mounted &&
		// 		createPortal(
		// 			<div id="print-portal-root" className="hidden print:block">
		// 				<QuotationPDF details={loaderData.initialData} ref={pdfRef} />
		// 			</div>,
		// 			document.body,
		// 		)} */}
		// </div>
	);
}


