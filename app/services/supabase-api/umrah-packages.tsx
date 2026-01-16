import { useSupabase } from "@/features/supabase/provider/SupabaseProvider";
import type {
  PackageDetails,
  SupabasePackageDetails,
} from "@/features/quotation/types";

export function useUmrahPackageService() {
  const supabase = useSupabase();

  // Fetch all packages using the view
  const getAllPackages = async (): Promise<SupabasePackageDetails[]> => {
    const { data, error } = await supabase
      .from("v_packages_complete")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching packages:", error);
      throw error;
    }

    return data as SupabasePackageDetails[];
  };

  // Fetch single package using the view
  const getPackageById = async (id: string) => {
    const { data, error } = await supabase.rpc("get_package_details", {
      p_id: id,
    });

    if (error) {
      console.error("Error fetching package:", error);
      throw new Error(error.message);
    }

    return data;
  };

  // Save package (complex multi-table insert)
  const savePackage = async (pkg: PackageDetails) => {
    try {
      // 1. Upsert main package
      const { data: packageData, error: packageError } = await supabase
        .from("packages")
        .upsert({
          id: pkg.id,
          name: pkg.name,
          duration: pkg.duration,
          transport: pkg.transport,
          status: pkg.status,
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // 2. Save hotels and meals
      for (const [hotelKey, hotelData] of Object.entries(pkg.hotels)) {
        if (!hotelData.enabled) continue;

        const { data: hotelRecord, error: hotelError } = await supabase
          .from("package_hotels")
          .upsert({
            package_id: packageData.id,
            hotel_type: hotelKey,
            name: hotelData.name,
            enabled: hotelData.enabled,
            placeholder: hotelData.placeholder,
          })
          .select()
          .single();

        if (hotelError) throw hotelError;

        // Delete old meals
        await supabase
          .from("package_meals")
          .delete()
          .eq("package_hotel_id", hotelRecord.id);

        // Insert new meals
        if (hotelData.meals.length > 0) {
          const mealsToInsert = hotelData.meals.map((meal) => ({
            package_hotel_id: hotelRecord.id,
            meal_type: meal,
          }));

          await supabase.from("package_meals").insert(mealsToInsert);
        }
      }

      // 3. Save inclusions
      await supabase
        .from("package_inclusions")
        .delete()
        .eq("package_id", packageData.id);

      if (pkg.inclusions.length > 0) {
        const inclusionsToInsert = pkg.inclusions.map((desc, index) => ({
          package_id: packageData.id,
          description: desc,
          sort_order: index,
        }));
        await supabase.from("package_inclusions").insert(inclusionsToInsert);
      }

      // 4. Save exclusions
      await supabase
        .from("package_exclusions")
        .delete()
        .eq("package_id", packageData.id);

      if (pkg.exclusions.length > 0) {
        const exclusionsToInsert = pkg.exclusions.map((desc, index) => ({
          package_id: packageData.id,
          description: desc,
          sort_order: index,
        }));
        await supabase.from("package_exclusions").insert(exclusionsToInsert);
      }

      // 5. Save room pricing
      await supabase
        .from("package_rooms")
        .delete()
        .eq("package_id", packageData.id);

      const roomsToInsert = pkg.rooms
        .filter((room) => room.enabled)
        .map((room) => ({
          package_id: packageData.id,
          room_type: room.label,
          price: room.value,
          enabled: room.enabled,
        }));

      if (roomsToInsert.length > 0) {
        await supabase.from("package_rooms").insert(roomsToInsert);
      }

      return { success: true, data: packageData };
    } catch (error) {
      console.error("Error saving package:", error);
      return { success: false, error };
    }
  };

  const deletePackage = async (id: string) => {
    const { error } = await supabase.from("packages").delete().eq("id", id);

    if (error) {
      console.error("Error deleting package:", error);
      return { success: false, error };
    }

    return { success: true };
  };

  const uploadFlightSchedule = async (payload: any) => {
    // Calls the RPC function we created
    const { data, error } = await supabase.rpc("create_package_with_schedule", {
      payload: payload,
    });

    if (error) {
      console.error("Error uploading schedule:", error);
      throw new Error(error.message);
    }

    return data;
  };

  return {
    getAllPackages,
    getPackageById,
    savePackage,
    deletePackage,
    uploadFlightSchedule,
  };
}
