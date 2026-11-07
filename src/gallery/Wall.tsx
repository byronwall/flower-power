import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import { bounds } from "../render/geometry";
import type { GalleryGarden } from "./community";
import { layoutWall, TOP_N, type Tile } from "./layout";
import { averageStars } from "./rank";
import { ASPECT, clearWanted, hold, levelFor, startPainting, thumb, want } from "./thumbs";

// Center in cells, and pixels per cell height. Cells are portrait, ASPECT wide by 1 tall, to suit lots.
type Camera = { x: number; y: number; z: number };
const GAP = 0.07; // share of a cell left between tiles
const MAX_TILE_PX = 760;

// The Best wall: the top 10 gardens as watercolor tiles, #1 biggest and in the middle.
// Drag to pan, scroll to zoom around the cursor, click a garden to fly in and open it.
export function Wall(props: { gardens: GalleryGarden[]; onOpen: (g: GalleryGarden) => void; hidden?: boolean }) {
  let box!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  const [size, setSize] = createSignal({ w: 0, h: 0 });
  const [cam, setCam] = createSignal<Camera>({ x: 0, y: 0, z: 40 });
  const [hover, setHover] = createSignal<Tile<GalleryGarden> | null>(null);
  // Until the viewer pans or zooms, the wall refits whenever the window changes size.
  let userMoved = false;
  const tiles = createMemo(() => layoutWall(props.gardens, ASPECT / 1.4));
  const rankOf = createMemo(() => new Map(props.gardens.map((g, i) => [g.id, i])));
  const extent = createMemo(() => {
    const t = tiles();
    return {
      minX: Math.min(...t.map((a) => a.x)),
      minY: Math.min(...t.map((a) => a.y)),
      maxX: Math.max(...t.map((a) => a.x + a.span)),
      maxY: Math.max(...t.map((a) => a.y + a.span)),
    };
  });

  const fitZ = () => {
    const e = extent(), s = size();
    return Math.min(s.w / ((e.maxX - e.minX + 1) * ASPECT), s.h / (e.maxY - e.minY + 1));
  };
  const clampZ = (z: number) => Math.min(MAX_TILE_PX, Math.max(fitZ() * 0.8, z));
  const fit = () => {
    const e = extent();
    setCam({ x: (e.minX + e.maxX) / 2, y: (e.minY + e.maxY) / 2, z: fitZ() });
  };

  const toScreen = (x: number, y: number, c = cam()) => [(x - c.x) * c.z * ASPECT + size().w / 2, (y - c.y) * c.z + size().h / 2] as const;
  const toWorld = (sx: number, sy: number, c = cam()) => [(sx - size().w / 2) / (c.z * ASPECT) + c.x, (sy - size().h / 2) / c.z + c.y] as const;
  const tileAt = (sx: number, sy: number) => {
    const [x, y] = toWorld(sx, sy);
    return tiles().find((t) => x >= t.x && x < t.x + t.span && y >= t.y && y < t.y + t.span) ?? null;
  };

  onMount(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box);
    const stop = startPainting(() => draw());
    onCleanup(() => {
      ro.disconnect();
      stop();
    });
  });

  createEffect(() => {
    if (size().w > 0 && size().h > 0 && !userMoved) fit();
  });

  createEffect(() => {
    const { w, h } = size();
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    draw();
  });
  createEffect(() => {
    cam();
    hover();
    void props.hidden;
    draw();
  });

  function draw() {
    if (!canvas || props.hidden) return;
    const { w, h } = size();
    if (!w || !h) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    const c = cam();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#ebe5d6";
    ctx.fillRect(0, 0, w, h);
    clearWanted();
    const cx = w / 2, cy = h / 2;
    for (const t of tiles()) {
      const [sx, sy] = toScreen(t.x + GAP / 2, t.y + GAP / 2, c);
      const ph = (t.span - GAP) * c.z;
      const pw = ph * ASPECT;
      if (sx > w || sy > h || sx + pw < 0 || sy + ph < 0) continue;
      const g = t.item;
      // Ask for a picture: tiles near the middle of the screen get painted first.
      const priority = Math.hypot(sx + pw / 2 - cx, sy + ph / 2 - cy) / Math.max(w, h);
      const level = levelFor(ph);
      want(g.property, 0, priority);
      if (level > 0) want(g.property, level, priority + 0.5);
      tileCard(ctx, t, sx, sy, pw, ph, hover() === t);
    }
  }

  function tileCard(ctx: CanvasRenderingContext2D, t: Tile<GalleryGarden>, x: number, y: number, px: number, ph: number, hot: boolean) {
    const g = t.item;
    const r = Math.min(6, px * 0.04);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, px, ph, r);
    ctx.fillStyle = "#f4f0e6";
    ctx.shadowColor = "rgba(47, 51, 41, 0.12)";
    ctx.shadowBlur = px > 60 ? 6 : 0;
    ctx.shadowOffsetY = px > 60 ? 1 : 0;
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, px, ph, r);
    ctx.clip();
    const img = thumb(g.id, levelFor(ph));
    if (img) ctx.drawImage(img, x, y, px, ph);
    else placeholder(ctx, g, x, y, px, ph);
    // Caption strip once the tile is big enough to read: name and stats, or just stars on narrow tiles.
    if (px >= 64 && ph >= 96) {
      const fs = Math.min(15, Math.max(11, px * 0.055));
      const wide = px >= 140;
      const strip = fs * 2.9;
      const pad = fs * 0.6;
      ctx.fillStyle = "rgba(251, 249, 244, 0.92)";
      ctx.fillRect(x, y + ph - strip, px, strip);
      ctx.fillStyle = "#2f3329";
      ctx.font = `600 ${fs}px Figtree, system-ui, sans-serif`;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(ellipsize(ctx, g.title, px - pad * 2), x + pad, y + ph - strip + fs * 1.3);
      ctx.font = `400 ${fs * 0.88}px Figtree, system-ui, sans-serif`;
      ctx.fillStyle = "#6c7064";
      const stats = wide ? `★ ${averageStars(g).toFixed(1)} · ${g.saves} ${g.saves === 1 ? "save" : "saves"} · ${g.owner}` : `★ ${averageStars(g).toFixed(1)} · ${g.saves}`;
      ctx.fillText(ellipsize(ctx, stats, px - pad * 2), x + pad, y + ph - strip + fs * 2.45);
    }
    // Rank for the very best, so the top of the wall reads as a leaderboard.
    const rank = rankOf().get(g.id) ?? 99;
    if (rank < TOP_N && px >= 60) {
      const fs = Math.min(14, Math.max(10, px * 0.05));
      const label = `#${rank + 1}`;
      ctx.font = `700 ${fs}px Figtree, system-ui, sans-serif`;
      const bw = ctx.measureText(label).width + fs;
      ctx.fillStyle = rank === 0 ? "#b0457a" : "rgba(47, 51, 41, 0.78)";
      ctx.beginPath();
      ctx.roundRect(x + fs * 0.5, y + fs * 0.5, bw, fs * 1.6, fs * 0.8);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillText(label, x + fs, y + fs * 1.72);
    }
    ctx.restore();
    if (hot) {
      ctx.save();
      ctx.strokeStyle = "#45704f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - 1, y - 1, px + 2, ph + 2, r + 1);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Before a garden is painted: its lot and house in flat color, so the wall never looks empty.
  function placeholder(ctx: CanvasRenderingContext2D, g: GalleryGarden, x: number, y: number, px: number, ph: number) {
    const lot = bounds(g.property.lot.outline);
    const s = Math.min((px * 0.92) / lot.w, (ph * 0.92) / lot.h);
    const ox = x + (px - lot.w * s) / 2, oy = y + (ph - lot.h * s) / 2;
    ctx.fillStyle = "#c9d6aa";
    ctx.fillRect(ox, oy, lot.w * s, lot.h * s);
    const house = bounds(g.property.house.outline);
    ctx.fillStyle = "#d9cfbd";
    ctx.fillRect(ox + house.minX * s, oy + house.minY * s, house.w * s, house.h * s);
  }

  // Interaction ------------------------------------------------------------
  let drag: { x: number; y: number; cam: Camera; moved: boolean } | null = null;
  let flight = 0;
  // Where the viewer was before flying into a garden, so coming back returns there.
  let beforeFlight: Camera | null = null;
  const [grabbing, setGrabbing] = createSignal(false);

  const local = (e: MouseEvent) => {
    const r = box.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  function zoomAt(sx: number, sy: number, factor: number) {
    userMoved = true;
    const c = cam();
    const z = clampZ(c.z * factor);
    const [wx, wy] = toWorld(sx, sy, c);
    // Keep the point under the cursor still.
    setCam({ z, x: wx - (sx - size().w / 2) / (z * ASPECT), y: wy - (sy - size().h / 2) / z });
  }

  function flyTo(t: Tile<GalleryGarden>, then: () => void) {
    cancelAnimationFrame(flight);
    const from = cam();
    beforeFlight = from;
    const z = clampZ((Math.min(size().w / ASPECT, size().h) * 0.86) / t.span);
    const to = { x: t.x + t.span / 2, y: t.y + t.span / 2, z };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCam(to);
      return then();
    }
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 420);
      const e = 1 - Math.pow(1 - k, 3);
      // Zoom in log space so the flight feels even.
      setCam({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, z: Math.exp(Math.log(from.z) + (Math.log(to.z) - Math.log(from.z)) * e) });
      if (k < 1) flight = requestAnimationFrame(step);
      else then();
    };
    flight = requestAnimationFrame(step);
  }

  onCleanup(() => cancelAnimationFrame(flight));
  createEffect(() => {
    if (!props.hidden && beforeFlight) {
      setCam(beforeFlight);
      beforeFlight = null;
    }
  });

  return (
    <div class="wall" ref={box} classList={{ hidden: props.hidden }}>
      <canvas
        ref={canvas}
        style={{ width: `${size().w}px`, height: `${size().h}px`, cursor: grabbing() ? "grabbing" : hover() ? "pointer" : "grab" }}
        role="img"
        aria-label={`The top ${props.gardens.length} public gardens, number 1 in the middle`}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          const [x, y] = local(e);
          drag = { x, y, cam: cam(), moved: false };
        }}
        onPointerMove={(e) => {
          const [x, y] = local(e);
          if (drag) {
            if (!drag.moved && Math.hypot(x - drag.x, y - drag.y) > 4) {
              drag.moved = true;
              userMoved = true;
              setGrabbing(true);
            }
            if (drag.moved) {
              setCam({ ...drag.cam, x: drag.cam.x - (x - drag.x) / (drag.cam.z * ASPECT), y: drag.cam.y - (y - drag.y) / drag.cam.z });
              setHover(null);
              hold(200);
              return;
            }
          }
          setHover(tileAt(x, y));
        }}
        onPointerUp={(e) => {
          const d = drag;
          drag = null;
          setGrabbing(false);
          if (!d || d.moved) return;
          const [x, y] = local(e);
          const t = tileAt(x, y);
          if (t) flyTo(t, () => props.onOpen(t.item));
        }}
        onPointerLeave={() => setHover(null)}
        onWheel={(e) => {
          e.preventDefault();
          hold(200);
          const [x, y] = local(e);
          const before = cam().z;
          zoomAt(x, y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
          // At the closest zoom, scrolling in further opens the garden under the cursor.
          const t = tileAt(x, y);
          if (e.deltaY < 0 && t && before === cam().z && cam().z * t.span >= Math.min(size().w / ASPECT, size().h) * 0.8) flyTo(t, () => props.onOpen(t.item));
        }}
      />
      <div class="wall-controls">
        <button type="button" class="icon-btn" title="Zoom out" aria-label="Zoom out" onClick={() => zoomAt(size().w / 2, size().h / 2, 1 / 1.5)}>
          −
        </button>
        <button type="button" class="icon-btn" title="Zoom in" aria-label="Zoom in" onClick={() => zoomAt(size().w / 2, size().h / 2, 1.5)}>
          +
        </button>
        <button
          type="button"
          onClick={() => {
            userMoved = false;
            fit();
          }}
          title="Fit all ten gardens"
        >
          Fit
        </button>
      </div>
      <Show when={hover()}>
        {(t) => (
          <p class="wall-hint" aria-live="polite">
            <strong>{t().item.title}</strong> by {t().item.owner} · ★ {averageStars(t().item).toFixed(1)} from {t().item.stars.count} · {t().item.saves} saves · click to open
          </p>
        )}
      </Show>
    </div>
  );
}

function ellipsize(ctx: CanvasRenderingContext2D, s: string, max: number) {
  if (ctx.measureText(s).width <= max) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(s.slice(0, mid) + "…").width <= max) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo) + "…";
}
