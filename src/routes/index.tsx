import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import Galaxy3D from "@/components/Galaxy3D";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "J-UniVerse — Interactive Galaxy" },
      { name: "description", content: "Fly your ship through the J-UniVerse and land on its planets." },
      { property: "og:title", content: "J-UniVerse — Interactive Galaxy" },
      { property: "og:description", content: "Fly your ship through the J-UniVerse and land on its planets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});


function Stars({ count = 160 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        l: (i * 37.7) % 100,
        t: (i * 61.3 + (i % 7) * 11) % 100,
        s: (i % 3) + 1,
        d: (i % 10) * 0.4,
      })),
    [count],
  );
  return (
    <div className="pointer-events-none absolute inset-0">
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-foreground animate-twinkle"
          style={{ left: `${s.l}%`, top: `${s.t}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }}
        />
      ))}
    </div>
  );
}

function Index() {
  const [stage, setStage] = useState<"login" | "galaxy" | "planet">("login");
  const [planet, setPlanet] = useState("");
  const [flash, setFlash] = useState(false);
  const [fade, setFade] = useState(false);

  const enter = useCallback((name: string) => {
    setFlash((f) => {
      if (f) return f;
      setPlanet(name);
      setTimeout(() => setStage("planet"), 400);
      setTimeout(() => setFlash(false), 700);
      return true;
    });
  }, []);

  const login = () => {
    setFade(true);
    setTimeout(() => {
      setStage("galaxy");
      setFade(false);
    }, 700);
  };

  return (
    <main className="dark relative h-screen w-full overflow-hidden font-sans text-foreground">
      {stage === "login" && (
        <div className={`space-bg relative flex h-full flex-col items-center justify-center gap-10 transition-all duration-700 ${fade ? "scale-110 opacity-0" : ""}`}>
          <Stars />
          <h1 className="animate-rise relative font-display text-6xl font-black tracking-widest text-neon-cyan text-glow md:text-8xl">J-UniVerse</h1>
          <button
            onClick={login}
            className="animate-rise neon-box relative flex items-center gap-3 rounded-full border border-neon-cyan/60 bg-space/60 px-8 py-4 font-display text-sm tracking-wider backdrop-blur transition hover:scale-105 hover:bg-neon-blue/20"
            style={{ animationDelay: ".3s" }}
          >
            <svg viewBox="0 0 48 48" className="h-6 w-6"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Login with Google
          </button>
        </div>
      )}
      {stage === "galaxy" && <Galaxy3D onEnter={enter} />}
      {stage === "planet" && (
        <div className="flex h-full flex-col items-center bg-flash pt-16 text-flash-foreground">
          <h1 className="font-display text-4xl font-bold">Welcome to {planet}</h1>
          <button onClick={() => setStage("galaxy")} className="mt-8 rounded-full border border-flash-foreground/30 px-6 py-3 font-display text-sm tracking-wider transition hover:bg-flash-foreground hover:text-flash">
            ← Back to Galaxy
          </button>
        </div>
      )}
      {flash && <div className="animate-flash pointer-events-none fixed inset-0 z-50 bg-flash" />}
    </main>
  );
}

