import { useCallback, useEffect, useState } from "react";
import { File as FileIcon, Folder, GitBranch, History, KeyRound, Lock, Plus, Search } from "lucide-react";

// Forgejo server URL. Change it in .env (VITE_FORGEJO_URL) when you deploy; no code change needed.
const BASE = ((import.meta as any).env?.VITE_FORGEJO_URL as string | undefined) ?? "http://localhost:3000";

type Repo = { name: string; full_name: string; description: string; private: boolean; default_branch: string; updated_at: string; owner: { login: string } };
type Entry = { name: string; path: string; type: "file" | "dir" | "symlink" | "submodule"; size: number };
type Commit = { sha: string; commit: { message: string; author: { name: string; date: string } } };

const enc = (p: string) => p.split("/").map(encodeURIComponent).join("/");

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `token ${token}` } : {}), ...init?.headers },
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 180)}`);
  return (res.status === 204 ? null : await res.json()) as T;
}

async function raw(o: string, r: string, path: string, ref: string, token: string) {
  const res = await fetch(`${BASE}/api/v1/repos/${o}/${r}/raw/${enc(path)}?ref=${encodeURIComponent(ref)}`, {
    headers: token ? { Authorization: `token ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

const toB64 = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)} days ago`;
  return new Date(iso).toLocaleDateString();
}

// Shared GitHub-dark style tokens
const box = "rounded-md border border-[#30363d] bg-[#0d1117]";
const btn = "inline-flex items-center gap-1.5 rounded-md border border-[#363b42] bg-[#21262d] px-3 py-1 text-sm font-medium text-[#e6edf3] hover:bg-[#30363d]";
const btnGreen = "inline-flex items-center gap-1.5 rounded-md border border-[#2ea043] bg-[#238636] px-3 py-1 text-sm font-medium text-white hover:bg-[#2ea043] disabled:opacity-50";
const input = "w-full rounded-md border border-[#30363d] bg-[#0d1117] px-3 py-1.5 text-sm text-[#e6edf3] outline-none placeholder:text-[#6e7681] focus:border-[#2f81f7]";

export default function JGit() {
  const [token, setToken] = useState(() => (typeof window === "undefined" ? "" : sessionStorage.getItem("jgit-token") ?? ""));
  const [showToken, setShowToken] = useState(false);
  const [repo, setRepo] = useState<Repo | null>(null);

  const saveToken = (t: string) => {
    setToken(t);
    try { sessionStorage.setItem("jgit-token", t); } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 overflow-auto bg-[#0d1117] pb-24 font-sans text-[#e6edf3]">
      <header className="flex items-center gap-4 border-b border-[#30363d] bg-[#161b22] px-6 py-3">
        <button onClick={() => setRepo(null)} className="flex items-center gap-2 text-lg font-semibold">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#2f81f7" strokeWidth="2" strokeLinecap="round"><circle cx="6" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="9" r="2" /><path d="M6 7v10M18 11c0 4-12 2-12 6" /></svg>
          J-GIT
        </button>
        {repo && <span className="text-sm text-[#8b949e]">/ {repo.full_name}</span>}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-[#8b949e]">{token ? "Signed in with token" : "Read-only (public repos)"}</span>
          <button onClick={() => setShowToken((v) => !v)} className={btn}><KeyRound size={14} /> Token</button>
        </div>
      </header>
      {showToken && (
        <div className="mx-auto mt-4 max-w-5xl px-6">
          <div className={`${box} p-4`}>
            <p className="mb-2 text-sm text-[#8b949e]">Paste a Forgejo access token (Settings → Applications) to see private repos and push changes. It is kept only for this browser tab.</p>
            <input type="password" value={token} onChange={(e) => saveToken(e.target.value.trim())} placeholder="Access token" className={input} />
          </div>
        </div>
      )}
      <main className="mx-auto max-w-5xl px-6 py-6">
        {repo ? <RepoView repo={repo} token={token} /> : <RepoList token={token} onOpen={setRepo} />}
      </main>
    </div>
  );
}

function RepoList({ token, onOpen }: { token: string; onOpen: (r: Repo) => void }) {
  const [q, setQ] = useState("");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [err, setErr] = useState("");
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setErr("");
    api<{ data: Repo[] }>(`/repos/search?q=${encodeURIComponent(q)}&limit=50&sort=updated&order=desc`, token)
      .then((r) => setRepos(r.data))
      .catch((e) => setErr(e.message === "Failed to fetch" ? `Cannot reach ${BASE}. Is Forgejo running and CORS enabled?` : e.message));
  }, [q, token]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    try {
      const r = await api<Repo>("/user/repos", token, { method: "POST", body: JSON.stringify({ name: name.trim(), private: isPrivate, auto_init: true, default_branch: "main" }) });
      setName("");
      setCreating(false);
      onOpen(r);
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-2.5 text-[#8b949e]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a repository…" className={`${input} pl-9`} />
        </div>
        <button className={btnGreen} onClick={() => setCreating((v) => !v)}><Plus size={14} /> New</button>
      </div>
      {creating && (
        <div className={`${box} mb-4 flex flex-wrap items-center gap-3 p-4`}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="repository-name" className={`${input} max-w-xs`} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} /> Private</label>
          <button className={btnGreen} disabled={!token} onClick={create}>Create repository</button>
          {!token && <span className="text-xs text-[#d29922]">Add a token first</span>}
        </div>
      )}
      {err && <p className="mb-4 rounded-md border border-[#f85149]/50 bg-[#f85149]/10 p-3 text-sm text-[#ff7b72]">{err}</p>}
      <div className={`${box} divide-y divide-[#30363d]`}>
        {repos.length === 0 && !err && <p className="p-6 text-center text-sm text-[#8b949e]">No repositories found.</p>}
        {repos.map((r) => (
          <button key={r.full_name} onClick={() => onOpen(r)} className="block w-full p-4 text-left hover:bg-[#161b22]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#2f81f7]">{r.full_name}</span>
              <span className="rounded-full border border-[#30363d] px-2 text-xs text-[#8b949e]">{r.private ? "Private" : "Public"}</span>
              {r.private && <Lock size={12} className="text-[#8b949e]" />}
            </div>
            {r.description && <p className="mt-1 text-sm text-[#8b949e]">{r.description}</p>}
            <p className="mt-2 text-xs text-[#8b949e]">Updated {ago(r.updated_at)}</p>
          </button>
        ))}
      </div>
    </>
  );
}

function RepoView({ repo, token }: { repo: Repo; token: string }) {
  const o = repo.owner.login;
  const r = repo.name;
  const [tab, setTab] = useState<"code" | "commits">("code");
  const [branches, setBranches] = useState<string[]>([]);
  const [ref, setRef] = useState(repo.default_branch);
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [file, setFile] = useState<{ path: string; text: string } | null>(null);
  const [readme, setReadme] = useState("");
  const [commits, setCommits] = useState<Commit[]>([]);
  const [err, setErr] = useState("");
  const [menu, setMenu] = useState<"" | "branch" | "file">("");
  const [newBranch, setNewBranch] = useState("");
  const [fPath, setFPath] = useState("");
  const [fText, setFText] = useState("");
  const [fMsg, setFMsg] = useState("");

  const loadBranches = useCallback(() => {
    api<{ name: string }[]>(`/repos/${o}/${r}/branches?limit=50`, token).then((b) => setBranches(b.map((x) => x.name))).catch(() => {});
  }, [o, r, token]);
  useEffect(loadBranches, [loadBranches]);

  const loadDir = useCallback(() => {
    setErr("");
    setFile(null);
    setReadme("");
    api<Entry[]>(`/repos/${o}/${r}/contents/${enc(path)}?ref=${encodeURIComponent(ref)}`, token)
      .then((list) => {
        const sorted = [...list].sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
        setEntries(sorted);
        const rd = sorted.find((e) => /^readme(\.md|\.txt)?$/i.test(e.name));
        if (rd) raw(o, r, rd.path, ref, token).then(setReadme).catch(() => {});
      })
      .catch((e) => { setEntries([]); setErr(e.message.startsWith("404") ? "This branch is empty or the path does not exist." : e.message); });
  }, [o, r, path, ref, token]);
  useEffect(() => { if (tab === "code") loadDir(); }, [tab, loadDir]);

  useEffect(() => {
    if (tab !== "commits") return;
    api<Commit[]>(`/repos/${o}/${r}/commits?sha=${encodeURIComponent(ref)}&limit=30&stat=false&verification=false&files=false`, token)
      .then(setCommits)
      .catch((e) => setErr(e.message));
  }, [tab, o, r, ref, token]);

  const openFile = async (e: Entry) => {
    if (e.type === "dir") return setPath(e.path);
    if (e.size > 512 * 1024) return setErr("File is too large to preview here.");
    try { setFile({ path: e.path, text: await raw(o, r, e.path, ref, token) }); } catch (x: any) { setErr(x.message); }
  };

  const createBranch = async () => {
    try {
      await api(`/repos/${o}/${r}/branches`, token, { method: "POST", body: JSON.stringify({ new_branch_name: newBranch.trim(), old_branch_name: ref }) });
      setRef(newBranch.trim());
      setPath("");
      setNewBranch("");
      setMenu("");
      loadBranches();
    } catch (e: any) { setErr(e.message); }
  };

  const createFile = async () => {
    try {
      await api(`/repos/${o}/${r}/contents/${enc(fPath.trim())}`, token, {
        method: "POST",
        body: JSON.stringify({ content: toB64(fText), message: fMsg || `Add ${fPath}`, branch: ref }),
      });
      setFPath(""); setFText(""); setFMsg(""); setMenu("");
      loadDir();
    } catch (e: any) { setErr(e.message); }
  };

  const crumbs = path ? path.split("/") : [];

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-xl">
        <span className="text-[#2f81f7]">{o}</span><span className="text-[#8b949e]">/</span><span className="font-semibold text-[#2f81f7]">{r}</span>
        <span className="ml-1 rounded-full border border-[#30363d] px-2 text-xs text-[#8b949e]">{repo.private ? "Private" : "Public"}</span>
      </div>
      <div className="mb-4 flex gap-1 border-b border-[#30363d]">
        {(["code", "commits"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm capitalize ${tab === t ? "border-[#f78166] font-semibold" : "border-transparent text-[#8b949e] hover:text-[#e6edf3]"}`}>
            {t === "code" ? <FileIcon size={14} /> : <History size={14} />} {t}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={ref} onChange={(e) => { setRef(e.target.value); setPath(""); }} className={`${btn} appearance-none pr-6`}>
          {(branches.length ? branches : [ref]).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <span className="flex items-center gap-1 text-sm text-[#8b949e]"><GitBranch size={14} /> {branches.length || 1} branches</span>
        <div className="ml-auto flex gap-2">
          <button className={btn} onClick={() => setMenu(menu === "branch" ? "" : "branch")}><GitBranch size={14} /> New branch</button>
          <button className={btnGreen} onClick={() => setMenu(menu === "file" ? "" : "file")}><Plus size={14} /> Add file</button>
        </div>
      </div>

      {!token && menu && <p className="mb-3 text-xs text-[#d29922]">Add an access token (top right) to create branches or files.</p>}
      {menu === "branch" && (
        <div className={`${box} mb-4 flex items-center gap-3 p-4`}>
          <input value={newBranch} onChange={(e) => setNewBranch(e.target.value)} placeholder={`New branch from ${ref}`} className={`${input} max-w-xs`} />
          <button className={btnGreen} disabled={!token || !newBranch.trim()} onClick={createBranch}>Create branch</button>
        </div>
      )}
      {menu === "file" && (
        <div className={`${box} mb-4 space-y-3 p-4`}>
          <input value={fPath} onChange={(e) => setFPath(e.target.value)} placeholder="path/to/file.txt" className={input} />
          <textarea value={fText} onChange={(e) => setFText(e.target.value)} rows={8} placeholder="File contents" className={`${input} font-mono`} />
          <input value={fMsg} onChange={(e) => setFMsg(e.target.value)} placeholder="Commit message" className={input} />
          <button className={btnGreen} disabled={!token || !fPath.trim()} onClick={createFile}>Commit to {ref}</button>
        </div>
      )}
      {err && <p className="mb-4 rounded-md border border-[#f85149]/50 bg-[#f85149]/10 p-3 text-sm text-[#ff7b72]">{err}</p>}

      {tab === "code" && (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-1 text-sm">
            <button className="text-[#2f81f7] hover:underline" onClick={() => { setPath(""); setFile(null); }}>{r}</button>
            {crumbs.map((c, i) => (
              <span key={i} className="flex items-center gap-1"><span className="text-[#8b949e]">/</span>
                <button className="text-[#2f81f7] hover:underline" onClick={() => { setPath(crumbs.slice(0, i + 1).join("/")); setFile(null); }}>{c}</button>
              </span>
            ))}
          </div>
          {file ? (
            <div className={box}>
              <div className="border-b border-[#30363d] bg-[#161b22] px-4 py-2 text-sm font-semibold">{file.path}</div>
              <pre className="overflow-auto p-0 text-xs leading-5"><code>{file.text.split("\n").map((l, i) => (
                <div key={i} className="flex hover:bg-[#161b22]"><span className="w-12 shrink-0 select-none pr-3 text-right text-[#6e7681]">{i + 1}</span><span className="whitespace-pre pr-4 font-mono">{l}</span></div>
              ))}</code></pre>
            </div>
          ) : (
            <>
              <div className={`${box} divide-y divide-[#30363d]`}>
                {path && <button onClick={() => setPath(path.split("/").slice(0, -1).join("/"))} className="block w-full px-4 py-2 text-left text-sm text-[#2f81f7] hover:bg-[#161b22]">..</button>}
                {entries.map((e) => (
                  <button key={e.path} onClick={() => openFile(e)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-[#161b22]">
                    {e.type === "dir" ? <Folder size={16} className="text-[#7d8590]" fill="#7d8590" /> : <FileIcon size={16} className="text-[#7d8590]" />}
                    <span className="hover:text-[#2f81f7] hover:underline">{e.name}</span>
                  </button>
                ))}
              </div>
              {readme && (
                <div className={`${box} mt-4`}>
                  <div className="border-b border-[#30363d] bg-[#161b22] px-4 py-2 text-sm font-semibold">README</div>
                  <pre className="overflow-auto whitespace-pre-wrap p-4 font-sans text-sm leading-6">{readme}</pre>
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === "commits" && (
        <div className={`${box} divide-y divide-[#30363d]`}>
          {commits.map((c) => (
            <div key={c.sha} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.commit.message.split("\n")[0]}</p>
                <p className="text-xs text-[#8b949e]">{c.commit.author.name} committed {ago(c.commit.author.date)}</p>
              </div>
              <code className="rounded-md border border-[#30363d] px-2 py-0.5 text-xs text-[#2f81f7]">{c.sha.slice(0, 7)}</code>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
