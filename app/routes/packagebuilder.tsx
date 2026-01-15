import { useNavigate } from "react-router";
import type { Route } from "./+types/packagebuilder";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import PackageBuilder from "~/features/packages/PackageBuilder";

export function meta() {
  return [
    { title: "Create Package - MKM Quotation" },
    { name: "description", content: "Create a new Umrah package" },
  ];
}

export default function PackageBuilderPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate("/packages");
  };

  return (
    <ProtectedRoute title="Package Builder">
      <PackageBuilder onBack={handleBack} />
    </ProtectedRoute>
  );
}
