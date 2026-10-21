import { useCallback, useEffect, useState } from "react";
import { api, ago, box, btn, enc, type Repo } from "./jgit-shared";

type Br = { name: string; protected?: boolean; commit: { message: string; timestamp: string } };

export default function JGitBranches({ repo, token, onPR, onChanged }: { repo: Repo; token: string; onPR: (b: string) => void; onChanged: () => void }) {
  const o = repo.owner.login;
  const r = repo.name;
  const [list, setList] = useState<Br[]>([]);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    api<Br[]>(`/repos/${o}/${r}/branches?limit=50`, token).then(setList).catch((e) => setErr(e.message));
  }, [o, r, token]);
  useEffect(load, [load]);

  const del = async (name: string) => {
    if (!window.confirm(`Delete branch "${name}"?`)) return;
    try {
      await api(`/repos/${o}/${r}/branches/${enc(name)}`, token, { method: "DELETE" });
      load();
      onChanged();
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      {err && <p className="mb-4 rounded-md border border-[#f85149]/50 bg-[#f85149]/10 p-3 text-sm text-[#ff7b72]">{err}</p>}
      <div className={`${box} divide-y divide-[#30363d]`}>
        {list.map((b) => (
          <div key={b.name} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 font-semibold text-[#2f81f7]">{b.name}
                {b.name === repo.default_branch && <span className="rounded-full border border-[#30363d] px-2 text-xs font-normal text-[#8b949e]">default</span>}
              </p>
              <p className="truncate text-xs text-[#8b949e]">{b.commit.message.split("\n")[0]} · {ago(b.commit.timestamp)}</p>
            </div>
            {b.name !== repo.default_branch && <button className={btn} onClick={() => onPR(b.name)}>Open PR</button>}
            {b.name !== repo.default_branch && !b.protected && token && <button className={btn} onClick={() => del(b.name)}>Delete</button>}
          </div>
        ))}
      </div>
    </>
  );
}
