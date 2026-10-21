import { useState } from "react";
import { BASE, box, btn, type Repo } from "./jgit-shared";

function Cmd({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200); } catch { /* ignore */ }
  };
  return (
    <div className="my-2 flex items-start gap-2 rounded-md border border-[#30363d] bg-[#161b22] p-3">
      <pre className="flex-1 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5">{text}</pre>
      <button onClick={copy} className={btn}>{ok ? "Copied" : "Copy"}</button>
    </div>
  );
}

export default function JGitGuide({ repo }: { repo: Repo }) {
  const url = repo.clone_url ?? `${BASE}/${repo.full_name}.git`;
  const main = repo.default_branch;
  const steps: { title: string; note: string; cmd: string }[] = [
    { title: "1. Get the code (first time only)", note: "Git asks for credentials: username = your J-GIT username, password = the Git token (header → Git token).", cmd: `git clone ${url}\ncd ${repo.name}` },
    { title: "2. Make your own branch", note: "Never work directly on the main branch. One branch per feature or assignment.", cmd: `git checkout -b my-feature` },
    { title: "3. Save your work (commit) and upload it (push)", note: "Commit often with a clear message.", cmd: `git add .\ngit commit -m "Describe what you changed"\ngit push -u origin my-feature` },
    { title: "4. Ask to merge: open a Pull Request", note: "Go to the Pull requests tab, choose your branch, write a title and submit. A teammate or teacher reviews and merges it.", cmd: "" },
    { title: "5. Get the latest changes from others", note: "Do this before you start new work.", cmd: `git checkout ${main}\ngit pull origin ${main}` },
    { title: "6. Bring the latest main into your branch", note: "Keeps your branch up to date and shows conflicts early.", cmd: `git checkout my-feature\ngit merge ${main}` },
    { title: "7. Fix a merge conflict", note: "Git marks the clashing lines with <<<<<<<, ======= and >>>>>>>. Open the file, keep the correct version, delete the markers, then:", cmd: `git add the-file-you-fixed\ngit commit -m "Resolve merge conflict"\ngit push` },
  ];
  return (
    <div className={`${box} p-5`}>
      <h2 className="mb-1 text-lg font-semibold">How to work on {repo.name}</h2>
      <p className="mb-4 text-sm text-[#8b949e]">Copy each command into your terminal (PowerShell or VS Code terminal).</p>
      {steps.map((s) => (
        <div key={s.title} className="mb-5">
          <h3 className="font-semibold">{s.title}</h3>
          <p className="text-sm text-[#8b949e]">{s.note}</p>
          {s.cmd && <Cmd text={s.cmd} />}
        </div>
      ))}
    </div>
  );
}
