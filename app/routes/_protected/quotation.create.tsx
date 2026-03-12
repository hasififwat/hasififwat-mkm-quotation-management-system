import { api } from "convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { redirect } from "react-router";
import type {
	ClientsListResult,
	QuotationPackagesResult,
} from "~/features/quotation/loader-utils";
import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import type { Route } from "./+types/quotation.create";

export async function loader({ request }: Route.LoaderArgs) {
	void request;
	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	const [packagesData, allClients] = await Promise.all([
		client.query(api.packages.listWithRooms, {}),
		client.query(api.clients.list, {}),
	]);

	const allPackages: QuotationPackagesResult = Array.isArray(packagesData)
		? packagesData
		: [];

	const typedClients: ClientsListResult = Array.isArray(allClients)
		? allClients
		: [];

	// const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
	// if (!pkg) {
	//   return redirect("/clients");
	// }

	return {
		initialData: null,
		allPackages,
		allClients: typedClients,
	};
}

export async function action({ request }: Route.ActionArgs) {
	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) {
		throw new Error("CONVEX_URL is not set");
	}

	const client = new ConvexHttpClient(convexUrl);
	try {
		await client.mutation(api.quotations.create, {
			payload: await request.json(),
		});
		return redirect("/quotations");
	} catch (error) {
		console.error("Error in quotation.create action:", error);
		throw error;
	}
}

export default function QuotationCreatePage() {
	return <QuotationBuilder />;
}
