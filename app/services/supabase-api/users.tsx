import { useSupabase } from "@/features/supabase/provider/SupabaseProvider";

export default function useClientServices() {
  const supabase = useSupabase();

  const getAllUsers = async () => {
    const { data, error } = await supabase.from("clients").select("*");
    console.log("Users:", data);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  return { getAllUsers };
}
