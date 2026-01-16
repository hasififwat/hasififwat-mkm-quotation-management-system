import { useNavigate } from "react-router";
import type { Route } from "./+types/packagelist";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import PackageList from "~/features/packages/PackageList";
import type { PackageDetails } from "~/features/quotation/types";

export function meta() {
  return [
    { title: "Packages - MKM Quotation" },
    { name: "description", content: "Manage Umrah packages" },
  ];
}

export default function PackageListPage() {
  const navigate = useNavigate();

  const handleEdit = (pkg: PackageDetails) => {
    console.log("Editing package:", pkg);
    navigate(`/packages/edit/${pkg.id}`);
  };

  const handleAdd = () => {
    navigate("/packages/create");
  };

  return (
    <ProtectedRoute title="Packages">
      <PackageList onEdit={handleEdit} onAdd={handleAdd} />
    </ProtectedRoute>
  );
}
