import type { Route } from "./+types/package.edit";

import PackageBuilder from "~/features/packages/PackageBuilder";

import { redirect } from "react-router";
import { UmrahPackageService } from "~/services/package-service";
import { createClient } from "~/lib/supabase/client";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const supabase = createClient();

  // 1. Fetch Server Data
  const pkg = await UmrahPackageService.getPackageById(supabase, params.pid);
  if (!pkg) {
    return redirect("/packages");
  }

  return {
    initialData: pkg,
  };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const supabase = createClient();

  const formData = await request.formData();
  const dataObject = Object.fromEntries(formData.entries());

  await UmrahPackageService.savePackage(supabase, dataObject);

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
