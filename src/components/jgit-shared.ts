import { forgejoApi } from "@/lib/forgejo.functions";

export const BASE = (((import.meta as any).env?.["VITE_FORGEJO_URL"] as string | undefined) ?? "http://localhost:3000");

export type Repo = { stars_count?: number; website?: string; permissions?: { admin?: boolean; push?: boolean }; clone_url?: string; name: string; full_name: string; description: string; private: boolean; default_branch: string; updated_at: string; owner: { login: string } };

export const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");

// All Forgejo calls go through our server (forgejoApi). The browser never sees an admin token.
export async function call(path: string, token: string, init?: RequestInit) {
  const r = await forgejoApi({
    data: { token: token || undefined, method: (init?.method ?? "GET") as "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path, body: typeof init?.body === "string" ? init.body : undefined },
  });
  if (!r.ok) throw new Error(`${r.status}: ${r.text.slice(0, 180)}`);
  return r.text;
}

export async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const t = await call(path, token, init);
  return (t ? JSON.parse(t) : null) as T;
}

export const raw = (o: string, r: string, path: string, ref: string, token: string) =>
  call(`/repos/${o}/${r}/raw/${enc(path)}?ref=${encodeURIComponent(ref)}`, token);

export function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

// Shared GitHub-dark style tokens
export const box = "rounded-md border border-[#30363d] bg-[#0d1117]";
export const btn = "inline-flex items-center gap-1.5 rounded-md border border-[#363b42] bg-[#21262d] px-3 py-1 text-sm font-medium text-[#e6edf3] hover:bg-[#30363d]";
export const btnGreen = "inline-flex items-center gap-1.5 rounded-md border border-[#2ea043] bg-[#238636] px-3 py-1 text-sm font-medium text-white hover:bg-[#2ea043] disabled:opacity-50";
export const input = "w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-sm text-[#e6edf3] outline-none placeholder:text-[#6e7681] focus:border-[#2f81f7]";
