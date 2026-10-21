import { useCallback, useEffect, useState } from "react";
import { api, call, ago, box, btn, btnGreen, input, BASE, type Repo } from "./jgit-shared";

type PR = { number: number; title: string; body: string; state: string; merged: boolean; mergeable: boolean; user: { login: string }; head: { ref: string }; base: { ref: string }; created_at: string };
type Cmt = { id: number; body: string; user: { login: string }; created_at: string };

const err0 = "mb-4 rounded-md border border-[#f85149]/50 bg-[#f85149]/10 p-3 text-sm text-[#ff7b72]";

function status(p: PR) {
  if (p.merged) return { t: "Merged", c: "border-[#a371f7] text-[#a371f7]" };
  if (p.state === "open") return { t: "Open", c: "border-[#3fb950] text-[#3fb950]" };
  return { t: "Closed", c: "border-[#f85149] text-[#f85149]" };
}

function Detail({ repo, token, n, onBack }: { repo: Repo; token: string; n: number; onBack: () => void }) {
  const o = repo.owner.login;
  const r = repo.name;
  const [pr, setPr] = useState<PR | null>(null);
  const [diff, setDiff] = useState("");
  const [cmts, setCmts] = useState<Cmt[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<PR>(`/repos/${o}/${r}/pulls/${n}`, token).then(setPr).catch((e) => setErr(e.message));
    call(`/repos/${o}/${r}/pulls/${n}.diff`, token).then(setDiff).catch(() => setDiff(""));
    api<Cmt[]>(`/repos/${o}/${r}/issues/${n}/comments`, token).then(setCmts).catch(() => {});
  }, [o, r, n, token]);
  useEffect(load, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr("");
    try { await fn(); load(); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  };
  const base = `/repos/${o}/${r}/pulls/${n}`;
  const merge = () => act(() => api(`${base}/merge`, token, { method: "POST", body: JSON.stringify({ Do: "merge" }) }));
  const update = () => act(() => api(`${base}/update`, token, { method: "POST" }));
  const close = () => act(() => api(base, token, { method: "PATCH", body: JSON.stringify({ state: "closed" }) }));
  const comment = () => act(async () => { await api(`/repos/${o}/${r}/issues/${n}/comments`, token, { method: "POST", body: JSON.stringify({ body: text }) }); setText(""); });

  if (!pr) return <>{err ? <p className={err0}>{err}</p> : <p className="text-[#8b949e]">Loading…</p>}</>;
  const st = status(pr);
  const open = pr.state === "open" && !pr.merged;
  const url = repo.clone_url ?? `${BASE}/${repo.full_name}.git`;
  const lines = diff.split("\n");

  return (
    <>
      <button className={`${btn} mb-4`} onClick={onBack}>← All pull requests</button>
      <h2 className="mb-1 text-xl font-semibold">{pr.title} <span className="font-normal text-[#8b949e]">#{pr.number}</span></h2>
      <p className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#8b949e]">
        <span className={`rounded-full border px-2 py-0.5 text-xs ${st.c}`}>{st.t}</span>
        {pr.user.login} wants to merge <code className="rounded bg-[#161b22] px-1.5">{pr.head.ref}</code> into <code className="rounded bg-[#161b22] px-1.5">{pr.base.ref}</code>
      </p>
      {err && <p className={err0}>{err}</p>}
      {pr.body && <div className={`${box} mb-4 whitespace-pre-wrap p-4 text-sm`}>{pr.body}</div>}

      {open && !pr.mergeable && (
        <div className="mb-4 rounded-md border border-[#d29922]/60 bg-[#d29922]/10 p-4 text-sm">
          <p className="font-semibold text-[#d29922]">This branch has merge conflicts</p>
          <p className="mt-1 text-[#8b949e]">Fix them on your computer, then push again:</p>
          <pre className="mt-2 overflow-auto rounded bg-[#161b22] p-3 font-mono text-xs leading-5">{`git checkout ${pr.head.ref}\ngit pull\ngit merge ${pr.base.ref}\n# open the files marked <<<<<<< , keep the right code, delete the markers\ngit add .\ngit commit -m "Resolve merge conflict"\ngit push\n# repo: ${url}`}</pre>
        </div>
      )}
      {open && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button className={btnGreen} disabled={!token || busy || !pr.mergeable} onClick={merge}>Merge pull request</button>
          <button className={btn} disabled={!token || busy} onClick={update}>Update branch</button>
          <button className={btn} disabled={!token || busy} onClick={close}>Close</button>
          {!token && <span className="self-center text-xs text-[#d29922]">Sign in to merge</span>}
        </div>
      )}

      <h3 className="mb-2 font-semibold">Changes</h3>
      <div className={`${box} mb-6 overflow-auto`}>
        <pre className="p-0 text-xs leading-5">
          {lines.slice(0, 3000).map((l, i) => {
            const c = l.startsWith("+") && !l.startsWith("+++") ? "bg-[#2ea043]/20" : l.startsWith("-") && !l.startsWith("---") ? "bg-[#f85149]/20" : l.startsWith("@@") ? "text-[#58a6ff]" : l.startsWith("diff ") ? "bg-[#161b22] font-semibold" : "";
            return <div key={i} className={`whitespace-pre px-3 font-mono ${c}`}>{l || " "}</div>;
          })}
        </pre>
        {lines.length > 3000 && <p className="p-3 text-xs text-[#8b949e]">Diff truncated (first 3000 lines).</p>}
        {!diff && <p className="p-4 text-sm text-[#8b949e]">No changes to show.</p>}
      </div>

      <h3 className="mb-2 font-semibold">Comments</h3>
      <div className="mb-3 space-y-2">
        {cmts.map((c) => (
          <div key={c.id} className={`${box} p-3 text-sm`}>
            <p className="mb-1 text-xs text-[#8b949e]">{c.user.login} · {ago(c.created_at)}</p>
            <p className="whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Leave a comment" className={`${input} mb-2`} />
      <button className={btnGreen} disabled={!token || busy || !text.trim()} onClick={comment}>Comment</button>
    </>
  );
}

export default function JGitPulls({ repo, token, branches, startHead }: { repo: Repo; token: string; branches: string[]; startHead: string }) {
  const o = repo.owner.login;
  const r = repo.name;
  const [state, setState] = useState<"open" | "closed">("open");
  const [list, setList] = useState<PR[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [creating, setCreating] = useState(!!startHead);
  const [head, setHead] = useState(startHead);
  const [base, setBase] = useState(repo.default_branch);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { if (startHead) { setHead(startHead); setCreating(true); setSel(null); } }, [startHead]);

  const load = useCallback(() => {
    api<PR[]>(`/repos/${o}/${r}/pulls?state=${state}&limit=30`, token).then(setList).catch((e) => setErr(e.message));
  }, [o, r, state, token]);
  useEffect(load, [load]);

  const create = async () => {
    setErr("");
    try {
      const p = await api<PR>(`/repos/${o}/${r}/pulls`, token, { method: "POST", body: JSON.stringify({ head, base, title, body }) });
      setCreating(false); setTitle(""); setBody("");
      setSel(p.number);
    } catch (e: any) { setErr(e.message); }
  };

  if (sel !== null) return <Detail repo={repo} token={token} n={sel} onBack={() => { setSel(null); load(); }} />;

  return (
    <>
      {err && <p className={err0}>{err}</p>}
      <div className="mb-4 flex items-center gap-2">
        {(["open", "closed"] as const).map((s) => (
          <button key={s} onClick={() => setState(s)} className={`${btn} capitalize ${state === s ? "!border-[#2f81f7]" : ""}`}>{s}</button>
        ))}
        <button className={`${btnGreen} ml-auto`} onClick={() => setCreating((v) => !v)}>New pull request</button>
      </div>
      {creating && (
        <div className={`${box} mb-4 space-y-3 p-4`}>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[#8b949e]">merge</span>
            <select value={head} onChange={(e) => setHead(e.target.value)} className={`${btn} appearance-none`}>
              <option value="">choose branch</option>
              {branches.filter((b) => b !== base).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <span className="text-[#8b949e]">into</span>
            <select value={base} onChange={(e) => setBase(e.target.value)} className={`${btn} appearance-none`}>
              {branches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={input} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="What did you change and why?" className={input} />
          <button className={btnGreen} disabled={!token || !head || !title.trim()} onClick={create}>Create pull request</button>
          {!token && <span className="ml-3 text-xs text-[#d29922]">Sign in first</span>}
        </div>
      )}
      <div className={`${box} divide-y divide-[#30363d]`}>
        {list.length === 0 && <p className="p-6 text-center text-sm text-[#8b949e]">No {state} pull requests.</p>}
        {list.map((p) => {
          const st = status(p);
          return (
            <button key={p.number} onClick={() => setSel(p.number)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#161b22]">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${st.c}`}>{st.t}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{p.title}</span>
                <span className="text-xs text-[#8b949e]">#{p.number} by {p.user.login} · {p.head.ref} → {p.base.ref} · {ago(p.created_at)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
