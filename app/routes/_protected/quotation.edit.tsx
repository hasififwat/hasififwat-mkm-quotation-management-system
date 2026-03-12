import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";
import type { QuotationPackagesResult } from "~/features/quotation/loader-utils";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import type { Route } from "./+types/quotation.edit";

export async function loader({ params }: Route.LoaderArgs) {
	const convexUrl = process.env.CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const [initialData, packagesData, allClients] = await Promise.all([
		client.query(api.quotations.getQuotationForEdit, {
			target_quotation_id: params.qid,
		}),
		client.query(api.packages.listWithRooms, {}),
		client.query(api.clients.list, {}),
	]);
	const allPackages: QuotationPackagesResult = Array.isArray(packagesData)
		? packagesData
		: [];

	if (!initialData) {
		return redirect("/quotations");
	}

	return { initialData: initialData, allPackages, allClients };
}

export async function action({ request }: Route.ActionArgs) {
	const convexUrl = process.env.CONVEX_URL;

	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const payload = await request.json();

	try {
		await client.mutation(api.quotations.update, {
			payload,
		});
		return redirect("/quotations");
	} catch (error) {
		console.error("Error in quotation.update action:", error);
		throw error;
	}
}

export default function QuotationCreatePage() {
	return <QuotationBuilder />;
}
