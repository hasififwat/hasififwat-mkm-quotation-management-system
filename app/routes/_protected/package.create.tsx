import { redirect } from "react-router";
import PackageBuilder from "~/features/packages/PackageBuilder";
import { createClient } from "~/lib/supabase/client";
import { getServerClient } from "~/lib/supabase/server";
import { UmrahPackageService } from "~/services/package-service";
import type { Route } from "./+types/package.create";

export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = getServerClient(request, headers);
	const allPackages = UmrahPackageService.getAllPackages(supabase);

	const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
	if (!pkg) {
		return redirect("/packages");
	}

	return { allPackages, initialData: pkg };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const supabase = createClient();

	const data = await request.json();

	console.log("package.create clientAction called", data);

	await UmrahPackageService.savePackage(supabase, data);

	return redirect("/packages");
}

export function HydrateFallback() {
	return <div>Loading...</div>;
}

export default function PackageBuilderPage() {
	return <PackageBuilder />;
}
