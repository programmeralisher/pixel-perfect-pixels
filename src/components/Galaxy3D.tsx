import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Stars } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

type Dir = "up" | "down" | "left" | "right";
type PlanetDef = {
  name: string; x: number; r: number; base: string; alt: string;
  bands?: boolean; ring?: boolean; moon?: boolean;
};

export const PLANETS: PlanetDef[] = [
  { name: "J-Linkedup", x: 14, r: 1.2, base: "#8c8378", alt: "#5a544d" }, // Mercury
  { name: "J-CodeHub", x: 22, r: 1.9, base: "#e3c27e", alt: "#b48a4a", bands: true }, // Venus
  { name: "J-Complain", x: 31, r: 2.1, base: "#2f6fb5", alt: "#3f8a4a", moon: true }, // Earth
  { name: "J-Past", x: 40, r: 1.6, base: "#c1532e", alt: "#7a2e18" }, // Mars
  { name: "J-Collab", x: 54, r: 3.4, base: "#d9b77a", alt: "#a07a4a", bands: true, ring: true }, // Saturn
];
const SPEED = 14;
const WORLD = 70;

function makeTexture(base: string, alt: string, bands?: boolean) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 512, 256);
  let seed = base.length * 97 + alt.charCodeAt(1);
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  if (bands) {
    for (let y = 0; y < 256; y += 4 + rnd() * 10) {
      g.globalAlpha = 0.15 + rnd() * 0.35;
      g.fillStyle = rnd() > 0.5 ? alt : "#fff3d6";
      g.fillRect(0, y, 512, 2 + rnd() * 8);
    }
  } else {
    for (let i = 0; i < 160; i++) {
      g.globalAlpha = 0.2 + rnd() * 0.5;
      g.fillStyle = rnd() > 0.3 ? alt : "#ffffff";
      g.beginPath();
      g.ellipse(rnd() * 512, rnd() * 256, 4 + rnd() * 30, 3 + rnd() * 16, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Planet({ p, onEnter }: { p: PlanetDef; onEnter: (n: string) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Group>(null);
  const tex = useMemo(() => makeTexture(p.base, p.alt, p.bands), [p]);
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.y += d * 0.3;
    if (moon.current) moon.current.rotation.y += d * 0.8;
  });
  return (
    <group position={[p.x, 0, 0]}>
      <mesh ref={ref} onClick={() => onEnter(p.name)} onPointerOver={() => (document.body.style.cursor = "pointer")} onPointerOut={() => (document.body.style.cursor = "")}>
        <sphereGeometry args={[p.r, 48, 48]} />
        <meshStandardMaterial map={tex} roughness={0.9} />
      </mesh>
      {p.ring && (
        <mesh rotation={[-Math.PI / 2.4, 0, 0]}>
          <ringGeometry args={[p.r * 1.4, p.r * 2.3, 96]} />
          <meshStandardMaterial color="#d8c39a" side={THREE.DoubleSide} transparent opacity={0.75} />
        </mesh>
      )}
      {p.moon && (
        <group ref={moon}>
          <mesh position={[p.r + 1.6, 0.3, 0]}>
            <sphereGeometry args={[0.45, 24, 24]} />
            <meshStandardMaterial color="#bdbdbd" roughness={1} />
          </mesh>
        </group>
      )}
      <Html position={[0, 0, p.r + 2.2]} center style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-1 whitespace-nowrap">
          <span className="h-8 w-8 rounded-full border-2 border-foreground/60 bg-space/70" />
          <span className="font-display text-xs tracking-widest text-foreground text-glow">{p.name}</span>
        </div>
      </Html>
    </group>
  );
}

function Orbits() {
  return (
    <>
      {PLANETS.map((p) => (
        <mesh key={p.name} rotation-x={-Math.PI / 2}>
          <ringGeometry args={[p.x - 0.04, p.x + 0.04, 160]} />
          <meshBasicMaterial color="#5fb8ff" transparent opacity={0.25} />
        </mesh>
      ))}
    </>
  );
}

function Sun() {
  const ref = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => makeTexture("#ffb02e", "#ff6a00"), []);
  useFrame((_, d) => { if (ref.current) ref.current.rotation.y += d * 0.1; });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[6, 64, 64]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {[7, 8.5, 11].map((r, i) => (
        <mesh key={r}>
          <sphereGeometry args={[r, 32, 32]} />
          <meshBasicMaterial color="#ff9a2e" transparent opacity={0.18 - i * 0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <pointLight intensity={2500} distance={200} decay={1.6} color="#fff1d6" />
    </group>
  );
}

function MilkyWay() {
  const geo = useMemo(() => {
    const n = 9000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const spread = (Math.random() - 0.5) * (Math.random() * 60);
      const R = 260;
      const v = new THREE.Vector3(Math.cos(a) * R, spread, Math.sin(a) * R);
      v.applyEuler(new THREE.Euler(0.5, 0, 0.35));
      pos.set([v.x, v.y, v.z], i * 3);
      c.setHSL(0.6 + Math.random() * 0.25, 0.6, 0.6 + Math.random() * 0.3);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial size={1.4} vertexColors transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

type Rock = { x: number; z: number; r: number; vx: number; vz: number; orbit: number; ang: number; spin: number };

function makeRocks(): Rock[] {
  const rocks: Rock[] = [];
  for (let i = 0; i < 70; i++) {
    const orbit = 46 + (Math.random() - 0.5) * 5;
    rocks.push({ x: 0, z: 0, r: 0.35 + Math.random() * 0.7, vx: 0, vz: 0, orbit, ang: Math.random() * Math.PI * 2, spin: 0.02 + Math.random() * 0.04 });
  }
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 55;
    rocks.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, r: 0.4 + Math.random() * 0.9, vx: (Math.random() - 0.5) * 3, vz: (Math.random() - 0.5) * 3, orbit: 0, ang: 0, spin: 0 });
  }
  return rocks;
}

function Asteroids({ rocks }: { rocks: Rock[] }) {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const tex = useMemo(() => makeTexture("#6b6058", "#3a332e"), []);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    rocks.forEach((k, i) => {
      if (k.orbit) { k.ang += k.spin * dt; k.x = Math.cos(k.ang) * k.orbit; k.z = Math.sin(k.ang) * k.orbit; }
      else {
        k.x += k.vx * dt; k.z += k.vz * dt;
        if (Math.abs(k.x) > WORLD) k.vx *= -1;
        if (Math.abs(k.z) > WORLD) k.vz *= -1;
      }
      const m = refs.current[i];
      if (m) { m.position.set(k.x, 0, k.z); m.rotation.x += dt; m.rotation.y += dt * 0.7; }
    });
  });
  return (
    <>
      {rocks.map((k, i) => (
        <mesh key={i} ref={(m) => { refs.current[i] = m; }} scale={[k.r, k.r * 0.8, k.r * 1.1]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial map={tex} roughness={1} flatShading />
        </mesh>
      ))}
    </>
  );
}

function Ship({ keys, onMove, onEnter, rocks, onHit }: { keys: React.MutableRefObject<Set<Dir>>; onMove: (x: number, z: number) => void; onEnter: (n: string) => void; rocks: Rock[]; onHit: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const cool = useRef(0);
  const { camera } = useThree();
  const hit = useRef(false);
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.05);
    const s = ref.current!;
    const k = keys.current;
    const dx = (k.has("right") ? 1 : 0) - (k.has("left") ? 1 : 0);
    const dz = (k.has("down") ? 1 : 0) - (k.has("up") ? 1 : 0);
    if (dx || dz) {
      const l = Math.hypot(dx, dz);
      s.position.x = THREE.MathUtils.clamp(s.position.x + (dx / l) * SPEED * dt, -WORLD, WORLD);
      s.position.z = THREE.MathUtils.clamp(s.position.z + (dz / l) * SPEED * dt, -WORLD, WORLD);
      s.rotation.y = Math.atan2(-dx, -dz);
      onMove(s.position.x, s.position.z);
      const p = PLANETS.find((p) => Math.hypot(p.x - s.position.x, s.position.z) < p.r + 0.6);
      if (p && !hit.current) { hit.current = true; onEnter(p.name); }
    }
    cool.current -= dt;
    const rk = rocks.find((k) => Math.hypot(k.x - s.position.x, k.z - s.position.z) < k.r + 0.7);
    if (rk && cool.current <= 0) {
      cool.current = 1;
      const ang = Math.atan2(s.position.z - rk.z, s.position.x - rk.x);
      s.position.x += Math.cos(ang) * 2.5; s.position.z += Math.sin(ang) * 2.5;
      onHit();
    }
    const target = new THREE.Vector3(s.position.x, 22, s.position.z + 18);
    camera.position.lerp(target, 1 - Math.exp(-4 * dt));
    camera.lookAt(s.position.x, 0, s.position.z);
  });
  return (
    <group ref={ref} position={[31, 0, 14]}>
      <mesh rotation-x={-Math.PI / 2}>
        <coneGeometry args={[0.5, 1.6, 4]} />
        <meshStandardMaterial color="#cfe8ff" metalness={0.6} roughness={0.3} emissive="#1d4f80" />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <boxGeometry args={[2, 0.08, 0.5]} />
        <meshStandardMaterial color="#9fb4c8" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.95]}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#5fe0ff" />
      </mesh>
      <pointLight intensity={8} distance={6} color="#9ad8ff" />
    </group>
  );
}

export default function Galaxy3D({ onEnter, onGameOver }: { onEnter: (n: string) => void; onGameOver: () => void }) {
  const keys = useRef(new Set<Dir>());
  const rocks = useMemo(makeRocks, []);
  const [health, setHealth] = useState(100);
  const [flashHit, setFlashHit] = useState(false);
  const onHit = () => {
    setFlashHit(true);
    setTimeout(() => setFlashHit(false), 250);
    setHealth((h) => {
      const n = Math.max(0, h - 10);
      if (n === 0) setTimeout(onGameOver, 600);
      return n;
    });
  };
  const [pos, setPos] = useState({ x: 31, z: 14 });

  useEffect(() => {
    const map: Record<string, Dir> = { ArrowUp: "up", w: "up", ArrowDown: "down", s: "down", ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right" };
    const kd = (e: KeyboardEvent) => { const d = map[e.key]; if (d) { e.preventDefault(); keys.current.add(d); } };
    const ku = (e: KeyboardEvent) => { const d = map[e.key]; if (d) keys.current.delete(d); };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); document.body.style.cursor = ""; };
  }, []);

  const hold = (d: Dir) => ({
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); keys.current.add(d); },
    onPointerUp: () => keys.current.delete(d),
    onPointerCancel: () => keys.current.delete(d),
  });
  const mm = (v: number) => `${((v + WORLD) / (WORLD * 2)) * 100}%`;

  return (
    <div className="relative h-full w-full touch-none select-none bg-space">
      <Canvas camera={{ position: [31, 22, 32], fov: 55 }} dpr={[1, 2]}>
        <color attach="background" args={["#03030a"]} />
        <ambientLight intensity={0.15} />
        <Stars radius={200} depth={80} count={5000} factor={5} fade speed={1} />
        <MilkyWay />
        <Sun />
        <Orbits />
        {PLANETS.map((p) => <Planet key={p.name} p={p} onEnter={onEnter} />)}
        <Asteroids rocks={rocks} />
        <Ship keys={keys} onMove={(x, z) => setPos({ x, z })} onEnter={onEnter} rocks={rocks} onHit={onHit} />
      </Canvas>

      {flashHit && <div className="pointer-events-none absolute inset-0 bg-destructive/30" />}
      <div className="neon-box absolute left-6 top-6 w-48 rounded-xl border border-neon-cyan/50 bg-space/70 p-3 backdrop-blur">
        <div className="mb-1 flex justify-between font-display text-[10px] tracking-widest text-neon-cyan"><span>HULL</span><span>{health}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full transition-all duration-300 ${health > 30 ? "bg-neon-cyan" : "bg-destructive"}`} style={{ width: `${health}%` }} />
        </div>
      </div>
      {health === 0 && <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-display text-4xl font-black tracking-widest text-destructive">SHIP DESTROYED</div>}
      <p className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 font-display text-xs tracking-[0.3em] text-neon-cyan/80">J-UNIVERSE · FLY INTO A PLANET</p>

      <div className="absolute bottom-6 left-6 grid grid-cols-3 gap-2">
        {([["up", "▲", "col-start-2"], ["left", "◀", "col-start-1 row-start-2"], ["right", "▶", "col-start-3 row-start-2"], ["down", "▼", "col-start-2 row-start-3"]] as const).map(([d, l, c]) => (
          <button key={d} {...hold(d)} aria-label={d} className={`${c} neon-box flex h-14 w-14 items-center justify-center rounded-xl border border-neon-cyan/50 bg-space/70 text-neon-cyan backdrop-blur active:scale-90 active:bg-neon-blue/30`}>{l}</button>
        ))}
      </div>

      <div className="neon-box absolute bottom-6 right-6 h-40 w-40 overflow-hidden rounded-full border border-neon-cyan/60 bg-space/80 backdrop-blur md:h-48 md:w-48">
        <div className="animate-spin-slow absolute inset-0" style={{ background: "conic-gradient(from 0deg, color-mix(in oklab, var(--neon-cyan) 35%, transparent), transparent 25%)", animationDuration: "4s" }} />
        <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: mm(0), top: mm(0), background: "#ffb02e", boxShadow: "0 0 8px #ffb02e" }} />
        {PLANETS.map((p) => (
          <span key={p.name} className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: mm(p.x), top: mm(0), background: p.base }} />
        ))}
        <span className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" style={{ left: mm(pos.x), top: mm(pos.z), boxShadow: "0 0 8px var(--foreground)" }} />
      </div>
    </div>
  );
}
