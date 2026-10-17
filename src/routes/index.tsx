import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
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

const WORLD = 2400;
const SPEED = 6;
const PLANETS = [
  { name: "J-CodeHub", x: 1200, y: 900, r: 70, hue: "var(--neon-cyan)" },
  { name: "J-Linkedup", x: 1520, y: 1120, r: 60, hue: "var(--neon-blue)" },
  { name: "J-Complain", x: 880, y: 1150, r: 58, hue: "var(--destructive)" },
  { name: "J-Past", x: 1050, y: 1520, r: 64, hue: "var(--neon-violet)" },
  { name: "J-Collab", x: 1420, y: 1530, r: 66, hue: "var(--chart-2)" },
];
type Dir = "up" | "down" | "left" | "right";

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
      {stage === "galaxy" && <Galaxy onEnter={enter} />}
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

function Galaxy({ onEnter }: { onEnter: (n: string) => void }) {
  const [pos, setPos] = useState({ x: 1200, y: 1250, a: 0 });
  const [view, setView] = useState({ w: 1280, h: 800 });
  const keys = useRef(new Set<Dir>());
  const entered = useRef(false);

  useEffect(() => {
    const resize = () => setView({ w: window.innerWidth, h: window.innerHeight });
    resize();
    window.addEventListener("resize", resize);
    const map: Record<string, Dir> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
    const kd = (e: KeyboardEvent) => { const d = map[e.key]; if (d) { e.preventDefault(); keys.current.add(d); } };
    const ku = (e: KeyboardEvent) => { const d = map[e.key]; if (d) keys.current.delete(d); };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    let raf = 0;
    const tick = () => {
      const k = keys.current;
      const dx = (k.has("right") ? 1 : 0) - (k.has("left") ? 1 : 0);
      const dy = (k.has("down") ? 1 : 0) - (k.has("up") ? 1 : 0);
      if (dx || dy) {
        setPos((p) => {
          const x = Math.max(0, Math.min(WORLD, p.x + dx * SPEED));
          const y = Math.max(0, Math.min(WORLD, p.y + dy * SPEED));
          const hit = PLANETS.find((pl) => Math.hypot(pl.x - x, pl.y - y) < pl.r);
          if (hit && !entered.current) { entered.current = true; setTimeout(() => onEnter(hit.name), 0); }
          return { x, y, a: (Math.atan2(dy, dx) * 180) / Math.PI + 90 };
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [onEnter]);

  const ox = view.w / 2 - pos.x;
  const oy = view.h / 2 - pos.y;
  const hold = (d: Dir) => ({
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); keys.current.add(d); },
    onPointerUp: () => keys.current.delete(d),
    onPointerCancel: () => keys.current.delete(d),
    onPointerLeave: () => keys.current.delete(d),
  });

  return (
    <div className="space-bg relative h-full w-full touch-none select-none">
      <Stars count={120} />
      <div className="absolute left-0 top-0" style={{ width: WORLD, height: WORLD, transform: `translate(${ox}px, ${oy}px)` }}>
        <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(var(--neon-blue) 1px, transparent 1px)", backgroundSize: "120px 120px" }} />
        {PLANETS.map((p) => (
          <button key={p.name} onClick={() => onEnter(p.name)} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y, width: p.r * 2, height: p.r * 2 }} aria-label={`Enter ${p.name}`}>
            <span className="animate-spin-slow absolute -inset-6 rounded-full border border-dashed opacity-70" style={{ borderColor: p.hue, boxShadow: `0 0 18px ${p.hue}` }} />
            <span className="absolute inset-0 rounded-full transition group-hover:scale-110" style={{ background: `radial-gradient(circle at 30% 30%, color-mix(in oklab, ${p.hue} 90%, white), color-mix(in oklab, ${p.hue} 40%, black))`, boxShadow: `0 0 40px ${p.hue}, 0 0 90px color-mix(in oklab, ${p.hue} 50%, transparent)` }} />
            <span className="absolute inset-[28%] rounded-full border-2 border-foreground/50 bg-space/70" />
            <span className="absolute left-1/2 top-full mt-8 -translate-x-1/2 whitespace-nowrap font-display text-sm tracking-widest text-glow">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Ship */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-150" style={{ transform: `translate(-50%,-50%) rotate(${pos.a}deg)` }}>
        <svg width="44" height="52" viewBox="0 0 44 52" style={{ filter: "drop-shadow(0 0 8px var(--neon-cyan))" }}>
          <path d="M22 2 L30 30 L42 40 L28 40 L22 48 L16 40 L2 40 L14 30 Z" fill="var(--space)" stroke="var(--neon-cyan)" strokeWidth="2" />
          <circle cx="22" cy="20" r="4" fill="var(--neon-cyan)" />
          <path d="M18 44 L22 52 L26 44" fill="var(--neon-violet)" />
        </svg>
      </div>

      <p className="absolute left-1/2 top-6 -translate-x-1/2 font-display text-xs tracking-[0.3em] text-neon-cyan/80">J-UNIVERSE · FLY INTO A PLANET</p>

      {/* D-pad */}
      <div className="absolute bottom-6 left-6 grid grid-cols-3 gap-2">
        {([["up", "▲", "col-start-2"], ["left", "◀", "col-start-1 row-start-2"], ["right", "▶", "col-start-3 row-start-2"], ["down", "▼", "col-start-2 row-start-3"]] as const).map(([d, l, c]) => (
          <button key={d} {...hold(d)} aria-label={d} className={`${c} neon-box flex h-14 w-14 items-center justify-center rounded-xl border border-neon-cyan/50 bg-space/70 text-neon-cyan backdrop-blur active:scale-90 active:bg-neon-blue/30`}>{l}</button>
        ))}
      </div>

      {/* Minimap */}
      <div className="neon-box absolute bottom-6 right-6 h-40 w-40 overflow-hidden rounded-full border border-neon-cyan/60 bg-space/80 backdrop-blur md:h-48 md:w-48">
        <div className="absolute inset-0 rounded-full" style={{ background: "repeating-radial-gradient(circle, transparent 0 22px, color-mix(in oklab, var(--neon-cyan) 25%, transparent) 22px 23px)" }} />
        <div className="animate-spin-slow absolute inset-0" style={{ background: "conic-gradient(from 0deg, color-mix(in oklab, var(--neon-cyan) 35%, transparent), transparent 25%)", animationDuration: "4s" }} />
        {PLANETS.map((p) => (
          <span key={p.name} className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${(p.x / WORLD) * 100}%`, top: `${(p.y / WORLD) * 100}%`, background: p.hue, boxShadow: `0 0 6px ${p.hue}` }} />
        ))}
        <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: `${(pos.x / WORLD) * 100}%`, top: `${(pos.y / WORLD) * 100}%`, boxShadow: "0 0 8px var(--foreground)" }} />
      </div>
    </div>
  );
}
