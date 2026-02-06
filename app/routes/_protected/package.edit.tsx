import { redirect } from "react-router";
import { getServerClient } from "@/lib/supabase/server";
import PackageBuilder from "~/features/packages/PackageBuilder";
import { createClient } from "~/lib/supabase/client";
import { UmrahPackageService } from "~/services/package-service";
import type { Route } from "./+types/package.edit";

export async function loader({ request, params }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);
	const allPackages = UmrahPackageService.getAllPackages(supabase);

	const pkg = await UmrahPackageService.getPackageById(supabase, params.pid);
	if (!pkg) {
		return redirect("/packages");
	}

	return { allPackages, initialData: pkg };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	console.log("package.edit clientAction called", request);
	const supabase = createClient();

	const data = await request.json();

	await UmrahPackageService.updatePackage(supabase, data);

	return redirect("/packages");
}

export function HydrateFallback() {
	return <div>Loading...</div>;
}

export function meta() {
	return [
		{ title: "Package Builder - MKM Quotation" },
		{ name: "description", content: "Create or edit an Umrah package" },
	];
}

export default function PackageBuilderPage() {
	return <PackageBuilder />;
}
