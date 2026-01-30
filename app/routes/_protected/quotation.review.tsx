import { getServerClient } from "~/lib/supabase/server";
import type { Route } from "./+types/quotation.review";

import { UmrahQuotationService } from "~/services/quotation-service";

import { redirect } from "react-router";
import QuotationPDF from "~/components/QuotationPDF";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Printer } from "lucide-react";

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

  console.log("Initial Quotation Data:", initialData);

  return { initialData: initialData };
}

export default function QuotationReviewPage({
  loaderData,
}: Route.ComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

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

  // PDF original dimensions
  const pdfWidth = 794;
  const pdfHeight = 1123; // From min-h-[1123px]

  return (
    <div
      ref={containerRef}
      className="col-span-full flex flex-col items-center py-8 bg-gray-100/50 overflow-hidden min-h-screen relative"
    >
      <style>{`
        @media print {
          /* COMPLETELY HIDE UI ELEMENTS */
          header, aside, nav, button, .print\\:hidden { 
            display: none !important; 
          }
          
          /* VISIBILITY TRICK FOR EVERYTHING ELSE */
          body * {
            visibility: hidden;
          }
          
          /* RESTORE CONTENT */
          #print-area, #print-area * {
            visibility: visible;
          }

          /* FORCE POSITIONING TO TOP OF PAGE */
          #print-area {
            position: fixed; /* Fixed relative to viewport/paper */
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            z-index: 9999; /* Ensure it's on top */
            background-color: white; /* Cover anything below */
          }
          
           /* Force background graphics */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Override QuotationPDF styles for print */
          #print-area > div {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
      <div className="fixed bottom-8 right-8 z-50 print:hidden">
        <Button onClick={() => handlePrint()} size="lg" className="shadow-xl">
          <Printer className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* Screen View */}
      <div
        className="print:hidden"
        style={{
          width: pdfWidth,
          height: pdfHeight, // Reserve original space to allow transform to work contextually
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          marginBottom: -1 * (pdfHeight * (1 - scale)), // Compensate for vertical space lost by scaling
        }}
      >
        <div ref={contentRef}>
          <QuotationPDF details={loaderData.initialData} />
        </div>
      </div>

      {/* Print View - Hidden on screen, visible on print */}
      <div id="print-area" className="hidden print:block">
        <QuotationPDF details={loaderData.initialData} />
      </div>
    </div>
  );
}
