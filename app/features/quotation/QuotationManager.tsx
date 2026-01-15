import type React from "react";
import { useState, useEffect, useRef } from "react";
import type { QuotationData, PackageDetails, SavedQuotation } from "./types";
import { packageStore } from "../packages/packageStore";
import { quotationStore } from "./quotationStore";
import { generateRefNumber, getCurrentDate } from "./utils";
import { useAuthentication } from "../authentication /provider/AuthenticationProvider";
import QuotationForm from "./components/QuotationForm";
import QuotationPDF from "./components/QuotationPDF";
import { Button } from "../../components/ui/button";
import { Pencil, Printer } from "lucide-react";

interface Props {
  step: "form" | "preview";
  setStep: (step: "form" | "preview") => void;
  editingQuote?: SavedQuotation;
}

const QuotationManager: React.FC<Props> = ({ step, setStep, editingQuote }) => {
  const { user } = useAuthentication();
  const [packages, setPackages] = useState<PackageDetails[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const [formData, setFormData] = useState<QuotationData>(() => {
    if (editingQuote) {
      const { id, createdAt, totalPrice, ...rest } = editingQuote;
      return rest;
    }
    return {
      referenceNumber: generateRefNumber(),
      date: getCurrentDate(),
      clientName: "",
      salesperson: user?.email || "Staff",
      office: "HQ",
      packageId: "",
      roomType: "quad",
      pax: 1,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 10 * 86400000).toISOString().split("T")[0],
    };
  });

  // Calculate scaling for preview
  useEffect(() => {
    if (step === "preview") {
      const handleResize = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.offsetWidth;
          const pdfWidth = 794; // Fixed width of the PDF component
          const padding = 32; // Horizontal padding in the view
          const availableWidth = containerWidth - padding;

          if (availableWidth < pdfWidth) {
            setScale(availableWidth / pdfWidth);
          } else {
            setScale(1);
          }
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, [step]);

  useEffect(() => {
    const allPackages = packageStore
      .getAll()
      .filter((p) => p.status === "published");
    setPackages(allPackages);
    if (allPackages.length > 0 && !formData.packageId) {
      setFormData((prev) => ({ ...prev, packageId: allPackages[0].id }));
    }
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "pax" ? (value === "" ? "" : parseInt(value)) : value,
    }));
  };

  const handleRoomTypeChange = (type: "double" | "triple" | "quad") => {
    setFormData((prev) => ({ ...prev, roomType: type }));
  };

  const selectedPkg =
    packages.find((p) => p.id === formData.packageId) || packages[0];

  const handlePreview = () => {
    const paxCount = typeof formData.pax === "number" ? formData.pax : 0;
    const unitPrice =
      formData.roomType === "double"
        ? selectedPkg.priceDouble
        : formData.roomType === "triple"
        ? selectedPkg.priceTriple
        : selectedPkg.priceQuad;

    const savedQuote: SavedQuotation = {
      ...formData,
      id: editingQuote?.id || `q-${Date.now()}`,
      createdAt: editingQuote?.createdAt || new Date().toISOString(),
      totalPrice: unitPrice * paxCount,
    };

    quotationStore.save(savedQuote);
    setStep("preview");
  };

  if (!selectedPkg && packages.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-bold">No Published Packages</h3>
        <p className="text-slate-500">
          Please create and publish a package in the "Manage Packages" section
          first.
        </p>
      </div>
    );
  }

  if (step === "form") {
    return (
      <QuotationForm
        formData={formData}
        selectedPkg={selectedPkg}
        onInputChange={handleInputChange}
        onRoomTypeChange={handleRoomTypeChange}
        onPreview={handlePreview}
      />
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-6 py-4 md:py-8 animate-slideIn w-full overflow-x-hidden"
      ref={containerRef}
    >
      <div className="no-print flex gap-3 w-full max-w-[794px] px-4">
        <Button
          variant="outline"
          className="flex-1 gap-2"
          onClick={() => setStep("form")}
        >
          <Pencil className="w-4 h-4" /> Edit Details
        </Button>
        <Button className="flex-1 gap-2" onClick={() => window.print()}>
          <Printer className="w-4 h-4" /> Print / PDF
        </Button>
      </div>

      {/* The scaling container */}
      <div
        className="flex justify-center w-full overflow-visible transition-all duration-300 ease-out"
        style={{
          height: step === "preview" ? `${1123 * scale + 40}px` : "auto",
        }}
      >
        <div
          className="print-content origin-top transition-transform duration-300 ease-out shadow-2xl rounded-sm border border-slate-200"
          style={{
            transform: `scale(${scale})`,
            width: "794px",
            minHeight: "1123px",
          }}
        >
          <QuotationPDF data={formData} pkg={selectedPkg} />
        </div>
      </div>

      <div className="h-20 w-full no-print"></div>
    </div>
  );
};

export default QuotationManager;
