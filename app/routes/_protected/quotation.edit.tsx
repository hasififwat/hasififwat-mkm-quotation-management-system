import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import { getServerClient } from "~/lib/supabase/server";
import { ClientsService } from "~/services/clients-serice";
import { UmrahPackageService } from "~/services/package-service";
import type { Route } from "./+types/quotation.edit";

export async function loader({ params, request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);
	const allPackages = await UmrahPackageService.getAllPackages(supabase);
	const allClients = await ClientsService.getClients(supabase);
	const convexUrl = process.env.CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);

	const initialData = await client.query(api.quotations.getQuotationForEdit, {
		target_quotation_id: params.qid,
	});

	console.log("Loader fetched initial data:", initialData);

	// const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
	if (!initialData) {
		return redirect("/quotations");
	}

	console.log("Initial Quotation Data:", initialData);

	return { initialData: initialData, allPackages, allClients };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const convexUrl = import.meta.env.VITE_CONVEX_URL;

	if (!convexUrl) {
		throw new Error("VITE_CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const payload = await request.json();

	try {
		await client.mutation(api.quotations.update, {
			payload,
		});
		return redirect("/quotations");
	} catch (error) {
		console.error("Error in quotation.update clientAction:", error);
		throw error;
	}
}

export default function QuotationCreatePage() {
	return <QuotationBuilder />;
}
