import { getServerClient } from "~/lib/supabase/server";
import type { Route } from "./+types/quotation.review";

import { UmrahQuotationService } from "~/services/quotation-service";

import { redirect } from "react-router";
import QuotationPDF from "~/components/QuotationPDF";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

  return (
    <div
      ref={containerRef}
      className="col-span-full flex flex-col items-center py-8 bg-gray-100/50 overflow-hidden min-h-screen relative"
    >
      <style>{`
        @media print {
          /* HIDE EVERYTHING INITIALLY */
          body > * { 
            display: none !important; 
          }

          /* SHOW ONLY OUR PRINT PORTAL */
          body > #print-portal-root {
            display: block !important;
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: auto;
            z-index: 9999;
            background-color: white;
          }

          /* RESET PAGE SETTINGS */
          @page {
            size: A4;
            margin: 0;
          }
          
          /* FORCE COLORS */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* OVERRIDE COMPONENT STYLES FOR FULL WIDTH */
          #print-portal-root > div {
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important; /* Allow height to fit content */
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            padding: 20px !important; /* Add safe print padding */
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

      {/* Print View Portal - Rendered directly to body to escape layout constraints */}
      {mounted &&
        createPortal(
          <div id="print-portal-root" className="hidden print:block">
            <QuotationPDF details={loaderData.initialData} />
          </div>,
          document.body,
        )}
    </div>
  );
}
