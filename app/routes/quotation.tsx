import { useState } from "react";

import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import QuotationManager from "~/features/quotation/legacy/QuotationManager";

export function meta() {
	return [
		{ title: "Quotation - MKM Quotation" },
		{ name: "description", content: "Create and manage quotations" },
	];
}

export default function QuotationPage() {
	const [step, setStep] = useState<"form" | "preview">("form");

	return (
		<ProtectedRoute title="Quotation">
			<QuotationManager step={step} setStep={setStep} />
		</ProtectedRoute>
	);
}
