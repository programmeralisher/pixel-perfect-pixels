import { useCallback, useEffect, useMemo, useState } from "react";
import { api, call, ago, box, btn, btnGreen, input, BASE, type Repo } from "./jgit-shared";

const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : "");

/** Description, demo link, topics, star and (for admins) edit form shown on top of a repo. */
export function RepoAbout({ repo, token }: { repo: Repo; token: string }) {
  const o = repo.owner.login;
  const r = repo.name;
  const [info, setInfo] = useState<Repo>(repo);
  const [topics, setTopics] = useState<string[]>([]);
  const [starred, setStarred] = useState(false);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState("");
  const [site, setSite] = useState("");
  const [tp, setTp] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api<Repo>(`/repos/${o}/${r}`, token).then((x) => { setInfo(x); setDesc(x.description ?? ""); setSite(x.website ?? ""); }).catch(() => {});
    api<{ topics: string[] }>(`/repos/${o}/${r}/topics`, token).then((x) => { setTopics(x.topics ?? []); setTp((x.topics ?? []).join(", ")); }).catch(() => {});
    if (token) call(`/user/starred/${o}/${r}`, token).then(() => setStarred(true)).catch(() => setStarred(false));
  }, [o, r, token]);
  useEffect(load, [load]);

  const star = async () => {
    try {
      await call(`/user/starred/${o}/${r}`, token, { method: starred ? "DELETE" : "PUT" });
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const save = async () => {
    setErr("");
    try {
      await api(`/repos/${o}/${r}`, token, { method: "PATCH", body: JSON.stringify({ description: desc, website: site }) });
      const list = tp.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")).filter(Boolean);
      await api(`/repos/${o}/${r}/topics`, token, { method: "PUT", body: JSON.stringify({ topics: list }) });
      setEditing(false);
      load();
    } catch (e: any) { setErr(e.message); }
  };

  const link = safeUrl(info.website ?? "");
  const canEdit = !!token && !!info.permissions?.admin;

  return (
    <div className="mb-4">
      {info.description && <p className="mb-2 text-sm">{info.description}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {link && <a href={link} target="_blank" rel="noreferrer" className="rounded-md border border-[#2f81f7]/60 px-3 py-1 text-sm text-[#2f81f7] hover:bg-[#161b22]">Live demo ↗</a>}
        {topics.map((t) => <span key={t} className="rounded-full bg-[#388bfd]/15 px-3 py-0.5 text-xs text-[#58a6ff]">{t}</span>)}
        <button className={`${btn} ml-auto`} disabled={!token} onClick={star}>{starred ? "★ Starred" : "☆ Star"} {info.stars_count ?? 0}</button>
        {canEdit && <button className={btn} onClick={() => setEditing((v) => !v)}>Edit details</button>}
      </div>
      {editing && (
        <div className={`${box} mt-3 space-y-3 p-4`}>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" className={input} />
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="Live demo link (https://...)" className={input} />
          <input value={tp} onChange={(e) => setTp(e.target.value)} placeholder="Topics, comma separated (react, university-project)" className={input} />
          <button className={btnGreen} onClick={save}>Save</button>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-[#ff7b72]">{err}</p>}
    </div>
  );
}

type User = { login: string; full_name?: string; avatar_url?: string; created?: string };
type Heat = { timestamp: number; contributions: number };

function Heatmap({ data }: { data: Heat[] }) {
  const cells = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach((h) => { const k = new Date(h.timestamp * 1000).toISOString().slice(0, 10); m.set(k, (m.get(k) ?? 0) + h.contributions); });
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());
    const out: { k: string; n: number }[] = [];
    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      out.push({ k, n: m.get(k) ?? 0 });
    }
    return out;
  }, [data]);
  const shade = (n: number) => (n === 0 ? "#161b22" : n < 2 ? "#0e4429" : n < 4 ? "#006d32" : n < 7 ? "#26a641" : "#39d353");
  return (
    <div className="overflow-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ width: "max-content" }}>
        {cells.map((c) => <div key={c.k} title={`${c.n} contributions on ${c.k}`} className="h-[11px] w-[11px] rounded-sm" style={{ background: shade(c.n) }} />)}
      </div>
    </div>
  );
}

export function Profile({ name, token, onOpen }: { name: string; token: string; onOpen: (r: Repo) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [heat, setHeat] = useState<Heat[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const n = encodeURIComponent(name);
    api<User>(`/users/${n}`, token).then(setUser).catch((e) => setErr(e.message));
    api<Repo[]>(`/users/${n}/repos?limit=50`, token).then(setRepos).catch(() => {});
    api<Heat[]>(`/users/${n}/heatmap`, token).then(setHeat).catch(() => setHeat([]));
  }, [name, token]);

  const total = heat.reduce((a, h) => a + h.contributions, 0);
  const avatar = user?.avatar_url && safeUrl(user.avatar_url) ? user.avatar_url : "";

  return (
    <>
      {err && <p className="mb-4 rounded-md border border-[#f85149]/50 bg-[#f85149]/10 p-3 text-sm text-[#ff7b72]">{err}</p>}
      <div className="mb-6 flex items-center gap-4">
        {avatar ? <img src={avatar} alt="" className="h-20 w-20 rounded-full border border-[#30363d]" /> : <div className="h-20 w-20 rounded-full bg-[#21262d]" />}
        <div>
          <h2 className="text-2xl font-semibold">{user?.full_name || name}</h2>
          <p className="text-[#8b949e]">{name}{user?.created ? ` · joined ${new Date(user.created).toLocaleDateString()}` : ""}</p>
        </div>
      </div>
      <h3 className="mb-2 font-semibold">{total} contributions in the last year</h3>
      <div className={`${box} mb-6 p-4`}><Heatmap data={heat} /></div>
      <h3 className="mb-2 font-semibold">Projects ({repos.length})</h3>
      <div className={`${box} divide-y divide-[#30363d]`}>
        {repos.length === 0 && <p className="p-6 text-center text-sm text-[#8b949e]">No public projects yet.</p>}
        {repos.map((p) => (
          <button key={p.full_name} onClick={() => onOpen(p)} className="block w-full p-4 text-left hover:bg-[#161b22]">
            <span className="font-semibold text-[#2f81f7]">{p.name}</span>
            {p.description && <p className="mt-1 text-sm text-[#8b949e]">{p.description}</p>}
            <p className="mt-2 text-xs text-[#8b949e]">★ {p.stars_count ?? 0} · Updated {ago(p.updated_at)}</p>
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-[#6e7681]">Server: {BASE}</p>
    </>
  );
}
