import { useNavigate, useLoaderData } from "react-router";
import type { Route } from "./+types/packagebuilder";
import { ProtectedRoute } from "~/features/authentication /components/ProtectedRoute";
import PackageBuilder from "~/features/packages/PackageBuilder";
import { createClient } from "@supabase/supabase-js";
import type {
  PackageDetails,
  SupabasePackageDetails,
} from "~/features/quotation/types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function loader({ params }: Route.LoaderArgs) {
  if (!params.pid) {
    return { editingPackage: null };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from("v_packages_complete")
    .select("*")
    .eq("id", params.pid)
    .single();

  if (error || !data) {
    console.error("Error fetching package:", error);
    return { editingPackage: null };
  }

  const supabasePackage = data as SupabasePackageDetails;

  // Transform to PackageDetails format
  const editingPackage: PackageDetails = {
    id: supabasePackage.id,
    name: supabasePackage.name,
    duration: supabasePackage.duration,
    transport: supabasePackage.transport ?? "",
    status: supabasePackage.status,
    hotels: {
      makkah: supabasePackage.hotels?.makkah
        ? {
            name: supabasePackage.hotels.makkah.name,
            enabled: supabasePackage.hotels.makkah.enabled,
            meals: supabasePackage.hotels.makkah.meals,
            placeholder: supabasePackage.hotels.makkah.placeholder,
          }
        : { name: "", enabled: false, meals: [], placeholder: "" },
      madinah: supabasePackage.hotels?.madinah
        ? {
            name: supabasePackage.hotels.madinah.name,
            enabled: supabasePackage.hotels.madinah.enabled,
            meals: supabasePackage.hotels.madinah.meals,
            placeholder: supabasePackage.hotels.madinah.placeholder,
          }
        : { name: "", enabled: false, meals: [], placeholder: "" },
      taif: supabasePackage.hotels?.taif
        ? {
            name: supabasePackage.hotels.taif.name,
            enabled: supabasePackage.hotels.taif.enabled,
            meals: supabasePackage.hotels.taif.meals,
            placeholder: supabasePackage.hotels.taif.placeholder,
          }
        : { name: "", enabled: false, meals: [], placeholder: "" },
    },
    inclusions: supabasePackage.inclusions
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => i.description),
    exclusions: supabasePackage.exclusions
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((e) => e.description),
    rooms: supabasePackage.rooms.map((r) => ({
      label: r.room_type,
      value: r.price,
      enabled: r.enabled,
    })),
  };

  return { editingPackage };
}

export function meta() {
  return [
    { title: "Create Package - MKM Quotation" },
    { name: "description", content: "Create a new Umrah package" },
  ];
}

export default function PackageBuilderPage() {
  const navigate = useNavigate();
  const { editingPackage } = useLoaderData<typeof loader>();

  const handleBack = () => {
    navigate("/packages");
  };

  return (
    <ProtectedRoute title="Package Builder">
      <PackageBuilder
        editingPackage={editingPackage ?? undefined}
        onBack={handleBack}
      />
    </ProtectedRoute>
  );
}
