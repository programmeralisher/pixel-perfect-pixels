// SERVER-SIDE ONLY logic (runs inside createServerFn handlers).
// The Forgejo admin token never reaches the browser.
import { createServerFn } from "@tanstack/react-start";
import { createClient, type User } from "@supabase/supabase-js";
import { z } from "zod";
import { SB_KEY, SB_URL } from "./supabase-config";

type Auth = "anon" | "admin" | { sudo: string } | { basic: string };

const E = (k: string) => process.env[k];
const need = (k: string) => {
  const v = E(k);
  if (!v) throw new Error(`Server is missing the ${k} setting`);
  return v;
};

async function userFromJwt(jwt: string): Promise<User> {
  const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(jwt);
  if (error || !data.user) throw new Error("Please sign in again");
  return data.user;
}

function checkDomain(user: User) {
  const allowed = (E("ALLOWED_EMAIL_DOMAINS") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const email = (user.email ?? "").toLowerCase();
  const owner = (E("FORGEJO_OWNER_EMAIL") ?? "").toLowerCase();
  if (!allowed.length || (owner && email === owner)) return;
  if (!allowed.some((d) => email.endsWith("@" + d))) throw new Error("Only university email addresses can use J-GIT.");
}

function forgejoName(user: User): string {
  const owner = (E("FORGEJO_OWNER_EMAIL") ?? "").toLowerCase();
  const ownerName = E("FORGEJO_OWNER_USERNAME");
  if (owner && ownerName && (user.email ?? "").toLowerCase() === owner) return ownerName;
  const base = ((user.email ?? "user").split("@")[0] ?? "user").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "user";
  return `${base}-${user.id.replace(/-/g, "").slice(0, 4)}`;
}

// Deterministic per-user password (never shown). Lets the server mint git tokens for the user.
async function userPassword(id: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(need("FORGEJO_USER_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(id));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("") + "Aa1!";
}

function fj(path: string, auth: Auth, init: { method?: string; body?: string } = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth === "admin") headers["Authorization"] = `token ${need("FORGEJO_ADMIN_TOKEN")}`;
  else if (typeof auth === "object" && "sudo" in auth) {
    headers["Authorization"] = `token ${need("FORGEJO_ADMIN_TOKEN")}`;
    headers["Sudo"] = auth.sudo;
  } else if (typeof auth === "object") headers["Authorization"] = `Basic ${btoa(auth.basic)}`;
  const req: RequestInit = { method: init.method ?? "GET", headers };
  if (init.body !== undefined) req.body = init.body;
  return fetch(`${need("FORGEJO_URL").replace(/\/$/, "")}/api/v1${path}`, req);
}

const known = new Set<string>();

async function ensureUser(user: User) {
  checkDomain(user);
  const name = forgejoName(user);
  if (known.has(name)) return name;
  const r = await fj(`/users/${encodeURIComponent(name)}`, "admin");
  if (r.status === 404) {
    const c = await fj("/admin/users", "admin", {
      method: "POST",
      body: JSON.stringify({
        username: name,
        email: `${name}@users.noreply.j-git.app`,
        password: await userPassword(user.id),
        must_change_password: false,
        send_notify: false,
        visibility: "public",
      }),
    });
    if (!c.ok) throw new Error(`Could not create your J-GIT account: ${(await c.text()).slice(0, 160)}`);
  } else if (!r.ok) throw new Error(`Forgejo error ${r.status}`);
  known.add(name);
  return name;
}

/** Browser -> this function -> Forgejo. Acts as the signed-in user (Sudo). Anonymous = public read-only. */
export const forgejoApi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string().optional(),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      path: z.string().max(2000),
      body: z.string().max(2_000_000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const p = data.path;
    if (!/^\/(repos|user|users|orgs)(\/|\?|$)/.test(p) || p.includes("..") || /%2e/i.test(p)) throw new Error("Path not allowed");
    let auth: Auth = "anon";
    if (data.token) auth = { sudo: await ensureUser(await userFromJwt(data.token)) };
    else if (data.method !== "GET") throw new Error("Please sign in first");
    const r = await fj(p, auth, { method: data.method, ...(data.body !== undefined ? { body: data.body } : {}) });
    return { ok: r.ok, status: r.status, text: await r.text() };
  });

/** Creates a Forgejo access token the student can use as the password for `git push` over HTTPS. */
export const createGitToken = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(10) }))
  .handler(async ({ data }) => {
    const user = await userFromJwt(data.token);
    const name = await ensureUser(user);
    const r = await fj(`/users/${encodeURIComponent(name)}/tokens`, { basic: `${name}:${await userPassword(user.id)}` }, {
      method: "POST",
      body: JSON.stringify({ name: `j-git-${Date.now()}`, scopes: ["write:repository"] }),
    });
    if (!r.ok) throw new Error(`Could not create git token: ${(await r.text()).slice(0, 160)}`);
    const j = JSON.parse(await r.text());
    return { username: name, token: String(j.sha1) };
  });
