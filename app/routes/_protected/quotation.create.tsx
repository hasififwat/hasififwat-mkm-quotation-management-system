import QuotationBuilder from "~/features/quotation/QuotationBuilder";
import { getServerClient } from "~/lib/supabase/server";
import type { Route } from "./+types/quotation.create";

import { UmrahPackageService } from "~/services/package-service";
import { UmrahQuotationService } from "~/services/quotation-service";

import { createClient } from "~/lib/supabase/client";

import { redirect } from "react-router";

export async function loader({ request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = getServerClient(request, headers);
  const allPackages = await UmrahPackageService.getAllPackages(supabase);

  // const pkg = await UmrahPackageService.getNewPackageTemplate(supabase);
  // if (!pkg) {
  //   return redirect("/clients");
  // }

  return { initialData: null, allPackages };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const supabase = createClient();
  try {
    await UmrahQuotationService.create(supabase, await request.json());
    return redirect("/quotations");
  } catch (error) {
    console.error("Error in quotation.create clientAction:", error);
    throw error;
  }
}

export default function QuotationCreatePage() {
  return <QuotationBuilder />;
}
