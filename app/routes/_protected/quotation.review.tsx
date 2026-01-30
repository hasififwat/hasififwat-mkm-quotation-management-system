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
    if (!contentRef.current) return;

    // Create a hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    // Write content to the iframe
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Print Quotation</title>
            <style>
              /* Copy Tailwind styles or critical styles here */
              @media print {
                @page { margin: 0; size: A4; }
                body { margin: 0; padding: 0; background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                
                /* Reset content styles for print */
                #print-content > div {
                    box-shadow: none !important;
                    border: none !important;
                    margin: 0 !important;
                    width: 100% !important; 
                    height: 100% !important;
                    max-width: none !important;
                }
              }
              /* Add minimal grid/flex support */
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              .uppercase { text-transform: uppercase; }
              .border { border-width: 1px; }
              .border-collapse { border-collapse: collapse; }
              
              /* We need to ensure all the styles from the app affecting QuotationPDF are present. 
                 Ideally, we'd link the stylesheets. */
            </style>
            <!-- Link to your app's compiled CSS if possible, otherwise rely on inline styles -->
             ${Array.from(
               document.querySelectorAll("style, link[rel='stylesheet']"),
             )
               .map((node) => node.outerHTML)
               .join("")}
          </head>
          <body>
            <div id="print-content">
              ${contentRef.current.innerHTML}
            </div>
            <script>
               // Wait for images/fonts if needed, then print
               window.onload = () => {
                 setTimeout(() => {
                   window.print();
                   // Cleanup handled by parent via timeout usually, or we can leave it
                 }, 500);
               };
            </script>
          </body>
        </html>
      `);
      doc.close();

      // Cleanup iframe after printing (roughly)
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000); // Give enough time for the print dialog to open
    }
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
      <div className="fixed bottom-8 right-8 z-50 print:hidden">
        <Button onClick={() => handlePrint()} size="lg" className="shadow-xl">
          <Printer className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <div
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
    </div>
  );
}
