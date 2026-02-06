import { useNavigate } from "react-router";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import ClientForm from "~/features/clients/ClientForm";

export function meta() {
	return [
		{ title: "Create Client - MKM Quotation" },
		{ name: "description", content: "Create a new client" },
	];
}

export default function ClientFormPage() {
	const navigate = useNavigate();

	const handleBack = () => {
		navigate("/clients");
	};

	return (
		<ProtectedRoute title="Client Form">
			<ClientForm onBack={handleBack} />
		</ProtectedRoute>
	);
}
