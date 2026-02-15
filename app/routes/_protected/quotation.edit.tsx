import { redirect } from "react-router";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import { createClient } from "~/lib/supabase/client";
import { getServerClient } from "~/lib/supabase/server";
import { ClientsService } from "~/services/clients-serice";
import { UmrahPackageService } from "~/services/package-service";
import { UmrahQuotationService } from "~/services/quotation-service";
import type { Route } from "./+types/quotation.edit";

export async function loader({ params, request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);
	const allPackages = await UmrahPackageService.getAllPackages(supabase);
	const allClients = await ClientsService.getClients(supabase);

	const initialData = await UmrahQuotationService.getQuotationForEdit(
		supabase,
		params.qid,
	);

	console.log("Loader fetched initial data:", initialData);

	// const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
	if (!initialData) {
		return redirect("/quotations");
	}

	console.log("Initial Quotation Data:", initialData);

	return { initialData: initialData, allPackages, allClients };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const supabase = createClient();
	try {
		await UmrahQuotationService.update(supabase, await request.json());
		return redirect("/quotations");
	} catch (error) {
		console.error("Error in quotation.update clientAction:", error);
		throw error;
	}
}

export default function QuotationCreatePage() {
	return <QuotationBuilder />;
}
