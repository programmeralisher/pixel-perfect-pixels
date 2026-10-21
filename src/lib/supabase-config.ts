// Public values (safe in the browser). Override with VITE_* in .env.local if you like.
const env = ((import.meta as any).env ?? {}) as Record<string, string | undefined>;
export const SB_URL = env["VITE_SUPABASE_URL"] ?? "https://jxdlbypwxgkxncnvovta.supabase.co";
export const SB_KEY = env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "sb_publishable_zoTvgPl2ucgwt4S-QqE0dw_Chg-1q7I";
