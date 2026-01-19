import PackageBuilder from "~/features/packages/PackageBuilder";

import { redirect } from "react-router";
import { UmrahPackageService } from "~/services/package-service";
import { createClient } from "~/lib/supabase/client";

export async function clientLoader() {
  const supabase = createClient();

  // 1. Fetch Server Data
  const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
  if (!pkg) {
    return redirect("/packages");
  }

  return {
    initialData: pkg,
  };
}

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function PackageBuilderPage() {
  return <PackageBuilder />;
}
