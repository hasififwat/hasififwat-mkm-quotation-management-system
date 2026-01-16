import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

interface SupabaseContextType {
  supabase: SupabaseClient;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

interface SupabaseProviderProps {
  children: ReactNode;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabasePublishableKey?: string;
}

export function SupabaseProvider({ children }: SupabaseProviderProps) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
  const supabasePublishableKey =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const supabase = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey || !supabasePublishableKey) {
      throw new Error(
        "Supabase URL, Anon Key, and Publishable Key are required"
      );
    }

    return createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }, []);

  const value = useMemo(() => ({ supabase }), [supabase]);

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);

  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }

  return context.supabase;
}
