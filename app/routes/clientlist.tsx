import { useNavigate } from "react-router";
import type { Route } from "./+types/clientlist";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import ClientList from "~/features/clients/ClientList";
import type { Client } from "~/features/clients/types";

export function meta() {
  return [
    { title: "Clients - MKM Quotation" },
    { name: "description", content: "Manage your clients" },
  ];
}

export default function ClientListPage() {
  const navigate = useNavigate();

  const handleEdit = (client: Client) => {
    navigate("/clients/create", { state: { editingClient: client } });
  };

  const handleAdd = () => {
    navigate("/clients/create");
  };

  return (
    <ProtectedRoute title="Clients">
      <ClientList onEdit={handleEdit} onAdd={handleAdd} />
    </ProtectedRoute>
  );
}
