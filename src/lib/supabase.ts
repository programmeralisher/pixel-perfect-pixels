import { createClient } from "@supabase/supabase-js";
import { SB_KEY, SB_URL } from "./supabase-config";

export const supabase = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
