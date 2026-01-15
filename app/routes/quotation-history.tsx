import { useNavigate } from "react-router";
import type { Route } from "./+types/quotation-history";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import ManageQuotation from "~/features/quotation/ManageQuotation";
import type { SavedQuotation } from "~/features/quotation/types";

export function meta() {
  return [
    { title: "Quotation History - MKM Quotation" },
    { name: "description", content: "View and manage quotation history" },
  ];
}

export default function QuotationHistoryPage() {
  const navigate = useNavigate();

  const handleEdit = (quote: SavedQuotation) => {
    // Navigate to quotation page with editing state
    navigate("/quotation", { state: { editingQuote: quote } });
  };

  const handleView = (quote: SavedQuotation) => {
    // Navigate to quotation page in preview mode
    navigate("/quotation", { state: { editingQuote: quote, viewOnly: true } });
  };

  const handleAddNew = () => {
    navigate("/quotation");
  };

  return (
    <ProtectedRoute title="Quotation History">
      <ManageQuotation
        onEdit={handleEdit}
        onView={handleView}
        onAddNew={handleAddNew}
      />
    </ProtectedRoute>
  );
}
