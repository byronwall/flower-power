import type { Point, Property } from "../model/property";
import { bounds, rng } from "./geometry";
import type { View } from "./paint";

// Things that move on the 2D plan: the weather, fish in ponds, and birds at feeders and baths.
// It draws on its own transparent canvas over the plan, so the painting never repaints for it.

export type Weather = "sunny" | "cloudy" | "rain" | "snow";

type State = { property: Property; view: View; weather: Weather; width: number; height: number };

type Fish = { pond: Point[]; x: number; y: number; a: number; speed: number; tx: number; ty: number; color: string; size: number; wiggle: number };
type Bird = {
  home: Point;
  x: number; // feet
  y: number;
  a: number;
  color: string;
  wing: string;
  mode: "ground" | "leaving" | "away" | "arriving";
  t: number; // seconds in this mode
  hopTo: Point | null;
  peck: number;
  vx: number;
  vy: number;
  awayFor: number;
};
type Drop = { x: number; y: number; v: number; len: number };
type Splash = { x: number; y: number; t: number };
type Cloud = { x: number; y: number; r: number; v: number };

const BIRDS = [
  { color: "#c0352b", wing: "#8f241c" }, // cardinal
  { color: "#8a6a4a", wing: "#5e4630" }, // sparrow
  { color: "#4f7bb8", wing: "#2f4f80" }, // blue jay
  { color: "#e2b93b", wing: "#a8801a" }, // goldfinch
  { color: "#5d5a55", wing: "#3a3834" }, // chickadee
];
const KOI = ["#e8792b", "#f2f0e8", "#e04b2a", "#f0b03a"];

function inside([x, y]: Point, poly: Point[]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

function pointIn(poly: Point[], r: () => number, shrink = 0.7): Point {
  const b = bounds(poly);
  const cx = b.minX + b.w / 2, cy = b.minY + b.h / 2;
  for (let i = 0; i < 40; i++) {
    const p: Point = [cx + (r() - 0.5) * b.w * shrink, cy + (r() - 0.5) * b.h * shrink];
    if (inside(p, poly)) return p;
  }
  return [cx, cy];
}

export function createLife(canvas: HTMLCanvasElement, read: () => State) {
  const ctx = canvas.getContext("2d")!;
  const rand = rng(1234);
  let fish: Fish[] = [];
  let birds: Bird[] = [];
  let drops: Drop[] = [];
  let splashes: Splash[] = [];
  let clouds: Cloud[] = [];
  let lastKey = "";
  let frame = 0;
  let last = performance.now();
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  // Rebuild fish and birds when ponds, feeders, or baths change.
  function sync(p: Property) {
    const ponds = p.surfaces.filter((s) => s.kind === "pond");
    const perches = p.features.filter((f) => f.kind === "feeder" || f.kind === "birdbath");
    const key = JSON.stringify([ponds.map((s) => s.outline), perches.map((f) => [f.kind, f.at])]);
    if (key === lastKey) return;
    lastKey = key;
    fish = ponds.flatMap((s) => {
      const area = bounds(s.outline).w * bounds(s.outline).h;
      const n = Math.max(2, Math.min(7, Math.round(area / 18)));
      return Array.from({ length: n }, (_, i) => {
        const [x, y] = pointIn(s.outline, rand);
        const [tx, ty] = pointIn(s.outline, rand);
        return { pond: s.outline, x, y, a: rand() * Math.PI * 2, speed: 0.8 + rand() * 0.8, tx, ty, color: KOI[i % KOI.length], size: 0.55 + rand() * 0.35, wiggle: rand() * 10 };
      });
    });
    birds = perches.flatMap((f) => {
      const n = f.kind === "feeder" ? 4 : 2;
      return Array.from({ length: n }, (_, i) => {
        const look = BIRDS[(i + Math.round(f.at[0])) % BIRDS.length];
        const a = rand() * Math.PI * 2, d = 0.8 + rand() * 1.6;
        return {
          home: f.at,
          x: f.at[0] + Math.cos(a) * d,
          y: f.at[1] + Math.sin(a) * d,
          a: rand() * Math.PI * 2,
          ...look,
          mode: "ground" as const,
          t: rand() * 2,
          hopTo: null,
          peck: 0,
          vx: 0,
          vy: 0,
          awayFor: 0,
        };
      });
    });
  }

  // ---------- weather ----------
  function weather(s: State, dt: number) {
    const { width: w, height: h } = s;
    // Cloud shadows drift across the plan; more of them when it is cloudy or raining.
    const want = s.weather === "sunny" ? 3 : s.weather === "snow" ? 4 : 6;
    while (clouds.length < want) clouds.push({ x: rand() * w, y: rand() * h, r: 120 + rand() * 180, v: 8 + rand() * 10 });
    clouds.length = want;
    const shadowAlpha = s.weather === "sunny" ? 0.07 : s.weather === "cloudy" ? 0.12 : 0.1;
    for (const c of clouds) {
      if (!reduce) c.x += c.v * dt;
      if (c.x - c.r > w) {
        c.x = -c.r;
        c.y = rand() * h;
      }
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      g.addColorStop(0, `rgba(40,52,66,${shadowAlpha})`);
      g.addColorStop(1, "rgba(40,52,66,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r * 1.4, c.r, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Overall light.
    if (s.weather === "sunny") {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "rgba(255,228,150,0.16)");
      g.addColorStop(0.6, "rgba(255,240,200,0.03)");
      g.addColorStop(1, "rgba(255,240,200,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    } else if (s.weather === "cloudy") {
      ctx.fillStyle = "rgba(120,130,140,0.12)";
      ctx.fillRect(0, 0, w, h);
    } else if (s.weather === "rain") {
      ctx.fillStyle = "rgba(60,78,96,0.18)";
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = "rgba(235,242,248,0.22)";
      ctx.fillRect(0, 0, w, h);
    }

    // Rain streaks with splashes where they land; snow drifts down and sways.
    const area = w * h;
    if (s.weather === "rain" || s.weather === "snow") {
      const n = Math.round(area / (s.weather === "rain" ? 2600 : 3800));
      while (drops.length < n) drops.push({ x: rand() * w, y: rand() * h, v: s.weather === "rain" ? 520 + rand() * 260 : 30 + rand() * 30, len: s.weather === "rain" ? 10 + rand() * 10 : 1.4 + rand() * 2 });
      drops.length = n;
      if (s.weather === "rain") {
        ctx.strokeStyle = "rgba(210,225,240,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of drops) {
          if (!reduce) {
            d.y += d.v * dt;
            d.x -= d.v * dt * 0.18;
          }
          if (d.y > h || d.x < 0) {
            if (rand() < 0.6) splashes.push({ x: d.x, y: Math.min(d.y, h - 2), t: 0 });
            d.y = -d.len;
            d.x = rand() * (w + 100);
          }
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + d.len * 0.18, d.y - d.len);
        }
        ctx.stroke();
        // Splashes: small rings that spread and fade.
        if (!reduce) for (let i = 0; i < 6; i++) splashes.push({ x: rand() * w, y: rand() * h, t: 0 });
        ctx.lineWidth = 1;
        splashes = splashes.filter((sp) => (sp.t += dt) < 0.45);
        if (splashes.length > 220) splashes.splice(0, splashes.length - 220);
        for (const sp of splashes) {
          const k = sp.t / 0.45;
          ctx.strokeStyle = `rgba(225,236,246,${0.5 * (1 - k)})`;
          ctx.beginPath();
          ctx.ellipse(sp.x, sp.y, 1 + k * 6, 0.6 + k * 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        const t = performance.now() / 1000;
        for (const d of drops) {
          if (!reduce) {
            d.y += d.v * dt;
            d.x += Math.sin(t * 1.3 + d.len * 5) * 12 * dt;
          }
          if (d.y > h) {
            d.y = -4;
            d.x = rand() * w;
          }
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.len, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else drops.length = 0;
  }

  // ---------- fish ----------
  function drawFish(s: State, dt: number) {
    const v = s.view;
    const t = performance.now() / 1000;
    for (const f of fish) {
      if (!reduce) {
        const want = Math.atan2(f.ty - f.y, f.tx - f.x);
        let d = want - f.a;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        f.a += d * Math.min(1, dt * 1.6);
        const nx = f.x + Math.cos(f.a) * f.speed * dt, ny = f.y + Math.sin(f.a) * f.speed * dt;
        if (inside([nx, ny], f.pond)) {
          f.x = nx;
          f.y = ny;
        } else [f.tx, f.ty] = pointIn(f.pond, rand, 0.6);
        if (Math.hypot(f.tx - f.x, f.ty - f.y) < 0.6) [f.tx, f.ty] = pointIn(f.pond, rand, 0.6);
      }
      const sx = v.offX + f.x * v.scale, sy = v.offY + f.y * v.scale;
      const L = f.size * v.scale; // body length in px
      if (L < 2) continue;
      const tail = Math.sin(t * 8 + f.wiggle) * 0.45;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(f.a);
      // Soft shadow under the water, then the body and a flicking tail.
      ctx.fillStyle = "rgba(20,40,50,0.18)";
      ctx.beginPath();
      ctx.ellipse(L * 0.08, L * 0.12, L * 0.55, L * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, L * 0.5, L * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(-L * 0.45, 0);
      ctx.rotate(tail);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-L * 0.32, -L * 0.18);
      ctx.lineTo(-L * 0.26, 0);
      ctx.lineTo(-L * 0.32, L * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (f.color === "#f2f0e8") {
        ctx.fillStyle = "#e04b2a";
        ctx.beginPath();
        ctx.ellipse(L * 0.12, 0, L * 0.14, L * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Rain dimples the pond surface.
    if (s.weather === "rain" && !reduce) {
      for (const s2 of s.property.surfaces.filter((x) => x.kind === "pond")) {
        if (rand() < 0.6) {
          const [x, y] = pointIn(s2.outline, rand, 0.85);
          splashes.push({ x: v.offX + x * v.scale, y: v.offY + y * v.scale, t: 0 });
        }
      }
    }
  }

  // ---------- birds ----------
  function drawBirds(s: State, dt: number) {
    const v = s.view;
    const t = performance.now() / 1000;
    for (const b of birds) {
      b.t += dt;
      if (!reduce) {
        if (b.mode === "ground") {
          // Hop to a nearby spot now and then, peck in between.
          if (!b.hopTo && rand() < dt * 0.7) {
            const a = rand() * Math.PI * 2, d = 0.6 + rand() * 1.8;
            b.hopTo = [b.home[0] + Math.cos(a) * d, b.home[1] + Math.sin(a) * d];
          }
          if (b.hopTo) {
            const dx = b.hopTo[0] - b.x, dy = b.hopTo[1] - b.y, dist = Math.hypot(dx, dy);
            b.a = Math.atan2(dy, dx);
            if (dist < 0.1) b.hopTo = null;
            else {
              const step = Math.min(dist, dt * 2.2);
              b.x += (dx / dist) * step;
              b.y += (dy / dist) * step;
            }
          } else if (rand() < dt * 1.5) b.peck = 0.25;
          b.peck = Math.max(0, b.peck - dt);
        } else if (b.mode === "leaving" || b.mode === "arriving") {
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          if (b.mode === "leaving") {
            b.vx *= 1 + dt * 1.2;
            b.vy *= 1 + dt * 1.2;
            const sx = v.offX + b.x * v.scale, sy = v.offY + b.y * v.scale;
            if (sx < -60 || sy < -60 || sx > s.width + 60 || sy > s.height + 60 || b.t > 4) {
              b.mode = "away";
              b.t = 0;
            }
          } else {
            const dx = b.home[0] - b.x, dy = b.home[1] - b.y;
            if (Math.hypot(dx, dy) < 1.5) {
              b.mode = "ground";
              b.t = 0;
              b.hopTo = null;
            }
          }
        } else if (b.mode === "away" && b.t > b.awayFor) {
          // Come back from a random edge of the view.
          const edge = rand() * Math.PI * 2;
          const far = Math.max(s.width, s.height) / v.scale;
          b.x = b.home[0] + Math.cos(edge) * far * 0.7;
          b.y = b.home[1] + Math.sin(edge) * far * 0.7;
          const dx = b.home[0] - b.x, dy = b.home[1] - b.y, d = Math.hypot(dx, dy);
          const speed = Math.max(14, far * 0.35);
          b.vx = (dx / d) * speed;
          b.vy = (dy / d) * speed;
          b.a = Math.atan2(dy, dx);
          b.mode = "arriving";
          b.t = 0;
        }
      }
      if (b.mode === "away") continue;
      const sx = v.offX + b.x * v.scale, sy = v.offY + b.y * v.scale;
      const L = Math.max(7, 0.65 * v.scale); // birds stay visible when zoomed out
      const flying = b.mode !== "ground";
      const hop = b.hopTo ? Math.abs(Math.sin(t * 14)) * L * 0.25 : 0;
      ctx.save();
      ctx.translate(sx, sy - hop);
      ctx.rotate(b.a);
      if (flying) {
        // Shadow far below, then flapping wings.
        ctx.fillStyle = "rgba(30,30,30,0.15)";
        ctx.beginPath();
        ctx.ellipse(L * 0.6, L * 0.9, L * 0.4, L * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        const flap = Math.sin(t * 22) * 0.9;
        ctx.fillStyle = b.wing;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(-L * 0.1, side * L * (0.6 + flap * 0.35), -L * 0.45, side * L * (0.9 + flap * 0.5));
          ctx.quadraticCurveTo(-L * 0.25, side * L * 0.3, -L * 0.2, 0);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "rgba(30,30,30,0.18)";
        ctx.beginPath();
        ctx.ellipse(L * 0.05, L * 0.12, L * 0.42, L * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Body, tail, head (dips when pecking), beak.
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, L * 0.38, L * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = b.wing;
      ctx.beginPath();
      ctx.moveTo(-L * 0.3, 0);
      ctx.lineTo(-L * 0.6, -L * 0.1);
      ctx.lineTo(-L * 0.6, L * 0.1);
      ctx.closePath();
      ctx.fill();
      const hx = L * (0.36 + (b.peck > 0 ? 0.1 : 0));
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(hx, 0, L * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8b040";
      ctx.beginPath();
      ctx.moveTo(hx + L * 0.12, -L * 0.05);
      ctx.lineTo(hx + L * 0.26, 0);
      ctx.lineTo(hx + L * 0.12, L * 0.05);
      ctx.fill();
      ctx.restore();
    }
  }

  function tick(now: number) {
    frame = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const s = read();
    const dpr = window.devicePixelRatio || 1;
    if (!s.width || !s.height) return;
    const cw = Math.round(s.width * dpr), ch = Math.round(s.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    sync(s.property);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, s.width, s.height);
    drawFish(s, dt);
    weather(s, dt);
    drawBirds(s, dt);
    if (!reduce && !document.hidden) frame = requestAnimationFrame(tick);
  }

  const kick = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const vis = () => kick();
  document.addEventListener("visibilitychange", vis);
  kick();

  return {
    // Draw again now (needed with reduced motion, where nothing loops).
    refresh: kick,
    // The bird under a screen point, if any.
    birdAt(x: number, y: number) {
      const v = read().view;
      const L = Math.max(7, 0.65 * v.scale);
      // Generous: birds hop, so the hit area is wider than the bird and at least a fingertip.
      const reach = Math.max(14, L * 1.5);
      let best = -1, bestD = reach;
      birds.forEach((b, i) => {
        if (b.mode !== "ground") return;
        const d = Math.hypot(v.offX + b.x * v.scale - x, v.offY + b.y * v.scale - y);
        if (d < bestD) {
          best = i;
          bestD = d;
        }
      });
      return best;
    },
    // Startle a bird and its flock-mates at the same perch; they fly off and come back later.
    scare(i: number) {
      const b0 = birds[i];
      if (!b0) return;
      for (const b of birds) {
        if (b.home !== b0.home || b.mode !== "ground") continue;
        const a = b === b0 ? Math.atan2(b.y - b.home[1], b.x - b.home[0]) + (rand() - 0.5) : rand() * Math.PI * 2;
        const speed = 18 + rand() * 10;
        b.vx = Math.cos(a) * speed;
        b.vy = Math.sin(a) * speed;
        b.a = a;
        b.mode = "leaving";
        b.t = 0;
        b.awayFor = 5 + rand() * 5;
      }
      kick();
    },
    // For tests: where each bird is on screen and what it is doing.
    debugBirds() {
      const v = read().view;
      return birds.map((b) => ({ x: v.offX + b.x * v.scale, y: v.offY + b.y * v.scale, mode: b.mode }));
    },
    dispose() {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", vis);
    },
  };
}

// A short synthesized songbird chirp: a few quick rising and falling whistles.
let audio: AudioContext | null = null;
export function chirp() {
  try {
    audio ??= new AudioContext();
    const t0 = audio.currentTime + 0.01;
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i++) {
      const t = t0 + i * 0.11;
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = "sine";
      const base = 2800 + Math.random() * 900;
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.6, t + 0.04);
      o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + 0.1);
    }
  } catch {
    // No audio available; the bird still flies.
  }
}
