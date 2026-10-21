import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Galaxy3D from "@/components/Galaxy3D";
import JGit from "@/components/JGit";
import AuthCard from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";

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

  const stageRef = useRef(stage);
  stageRef.current = stage;
  useEffect(() => {
    const go = () => { if (stageRef.current === "login") login(); };
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const { data } = supabase.auth.onAuthStateChange((e, sess) => { if (e === "SIGNED_IN" && sess) go(); });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="dark relative h-screen w-full overflow-hidden font-sans text-foreground">
      {stage === "login" && (
        <div className={`space-bg relative flex h-full flex-col items-center justify-center gap-10 transition-all duration-700 ${fade ? "scale-110 opacity-0" : ""}`}>
          <Stars />
          <h1 className="animate-rise relative font-display text-6xl font-black tracking-widest text-neon-cyan text-glow md:text-8xl">J-UniVerse</h1>
          <AuthCard />
        </div>
      )}
      {stage === "galaxy" && <Galaxy3D onEnter={enter} onGameOver={() => setStage("login")} />}
      {stage === "planet" && (planet === "J-CodeHub" ? (
        <JGit />
      ) : (
        <div className="flex h-full flex-col items-center bg-flash pt-16 text-flash-foreground">
          <h1 className="font-display text-4xl font-bold">Welcome to {planet}</h1>
        </div>
      ))}
      {stage === "planet" && (
        <button
          onClick={() => setStage("galaxy")}
          className="fixed bottom-6 right-6 z-40 rounded-full border border-neon-cyan/60 bg-space/80 px-6 py-3 font-display text-sm tracking-wider text-neon-cyan backdrop-blur transition hover:bg-neon-blue/30"
        >
          ← Back to Galaxy
        </button>
      )}
      {flash && <div className="animate-flash pointer-events-none fixed inset-0 z-50 bg-flash" />}
    </main>
  );
}

