import { createEffect, createMemo, createSignal, onCleanup, onMount, Show, untrack, type JSX } from "solid-js";
import type { Point, Property } from "../model/property";
import { bounds } from "../render/geometry";
import type { ViewTime } from "../render/look";
import { chirp, createLife, type Weather } from "../render/life";
import { paint, type View } from "../render/paint";

type Props = {
  property: Property;
  time: ViewTime;
  // Extra SVG drawn in plan feet, above the painting. The editor uses it.
  overlay?: (view: View) => JSX.Element;
  // HTML laid over the plan in screen space, such as the time controls.
  children?: JSX.Element;
  // A plant dragged from the gallery and dropped on the plan, at a point in feet.
  onDropPlant?: (plantId: string, at: Point) => void;
  // Where a dragged plant would land, or null when it leaves the plan.
  onDragPlantOver?: (at: Point | null) => void;
  // A click on empty ground that did not turn into a pan.
  onBackgroundClick?: () => void;
  // Weather shown over the plan, animated.
  weather?: Weather;
  // How strongly the property's aerial shows over the painting. 0 hides it.
  photoOpacity?: number;
};

// Room around the lot when fitted. The bottom leaves space for the scale bar and zoom controls.
const PAD = { x: 40, top: 40, bottom: 56 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 14;

// The camera is a point in plan feet at the middle of the view, and a zoom relative to "fit".
// Keeping it in feet means resizing the window or folding a panel never jumps the plan.
type Camera = { cx: number; cy: number; zoom: number };

export function PlanView(props: Props) {
  let box!: HTMLDivElement;
  let canvas!: HTMLCanvasElement;
  let lifeCanvas!: HTMLCanvasElement;
  const [size, setSize] = createSignal({ w: 0, h: 0 });
  // Only the lot's box matters for fitting, so moving a plant does not count as a change.
  const lot = createMemo(() => bounds(props.property.lot.outline), undefined, {
    equals: (a, b) => a.minX === b.minX && a.minY === b.minY && a.w === b.w && a.h === b.h,
  });
  const fitCam = (): Camera => ({ cx: lot().minX + lot().w / 2, cy: lot().minY + lot().h / 2, zoom: 1 });
  const [cam, setCam] = createSignal<Camera>(fitCam());
  const [panning, setPanning] = createSignal(false);
  // True for a moment after each wheel step, so a burst of wheel events paints once per frame.
  let zooming = false;
  let zoomTimer = 0;

  // A different property means a different lot: start fitted again.
  let lastId = props.property.id;
  createEffect(() => {
    if (props.property.id !== lastId) {
      lastId = props.property.id;
      setCam(fitCam());
    }
  });

  const fitScale = () => {
    const { w, h } = size();
    return Math.max(0.1, Math.min((w - PAD.x * 2) / lot().w, (h - PAD.top - PAD.bottom) / lot().h));
  };

  const view = createMemo<View>(
    () => {
      const { w, h } = size();
      const c = cam();
      const scale = fitScale() * c.zoom;
      // The fitted lot sits centered in the space between the padding, not the whole box.
      const midY = PAD.top + (h - PAD.top - PAD.bottom) / 2;
      return { scale, offX: w / 2 - c.cx * scale, offY: midY - c.cy * scale };
    },
    { scale: 1, offX: 0, offY: 0 },
    { equals: (a, b) => a.scale === b.scale && a.offX === b.offX && a.offY === b.offY },
  );
  // A live view for the overlay: it is built once and reads the current view as it changes,
  // so editing, panning and zooming never rebuild it (and never drop a drag in progress).
  const liveView: View = {
    get scale() {
      return view().scale;
    },
    get offX() {
      return view().offX;
    },
    get offY() {
      return view().offY;
    },
  };

  const toFt = (clientX: number, clientY: number): Point => {
    const r = box.getBoundingClientRect();
    const v = view();
    return [Math.round(((clientX - r.left - v.offX) / v.scale) * 10) / 10, Math.round(((clientY - r.top - v.offY) / v.scale) * 10) / 10];
  };

  // Zoom so the point under the cursor stays put.
  function zoomAt(factor: number, sx: number, sy: number) {
    const { w, h } = size();
    const v = view();
    const c = cam();
    const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, c.zoom * factor));
    const scale = fitScale() * zoom;
    const midY = PAD.top + (h - PAD.top - PAD.bottom) / 2;
    const fx = (sx - v.offX) / v.scale, fy = (sy - v.offY) / v.scale;
    setCam({ zoom, cx: fx - (sx - w / 2) / scale, cy: fy - (sy - midY) / scale });
  }

  const zoomCenter = (factor: number) => zoomAt(factor, size().w / 2, PAD.top + (size().h - PAD.top - PAD.bottom) / 2);
  const fit = () => setCam(fitCam());

  onMount(() => {
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box);

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = box.getBoundingClientRect();
      // Pinch on a trackpad arrives as ctrl+wheel with small deltas; a mouse wheel as large ones.
      const k = e.ctrlKey ? 0.012 : e.deltaMode === 1 ? 0.05 : 0.0022;
      zooming = true;
      clearTimeout(zoomTimer);
      zoomTimer = window.setTimeout(() => (zooming = false), 120);
      zoomAt(Math.exp(-e.deltaY * k), e.clientX - r.left, e.clientY - r.top);
    };
    box.addEventListener("wheel", wheel, { passive: false });

    let space = false;
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, select, textarea")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === " " && (e.target as HTMLElement).closest("button")) return;
      if (e.key === "=" || e.key === "+") zoomCenter(1.25);
      else if (e.key === "-" || e.key === "_") zoomCenter(0.8);
      else if (e.key === "0") fit();
      else if (e.key === " " && e.type === "keydown") {
        space = true;
        box.classList.add("space-pan");
        e.preventDefault();
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        space = false;
        box.classList.remove("space-pan");
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", keyUp);

    // Drag on empty ground (or hold space, or use the middle button) to pan.
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      const ground = t.classList.contains("edit-bg") && !t.closest(".edit-layer.drawing");
      if (!(e.button === 1 || space || (e.button === 0 && (ground || t === canvas)))) return;
      e.preventDefault();
      e.stopPropagation();
      const start = { x: e.clientX, y: e.clientY, c: cam() };
      let moved = false;
      try {
        box.setPointerCapture(e.pointerId);
      } catch {
        // Pointer already gone; the drag still works from bubbling moves.
      }
      const move = (m: PointerEvent) => {
        const dx = m.clientX - start.x, dy = m.clientY - start.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        if (!moved) setPanning(true);
        moved = true;
        const s = view().scale;
        setCam({ ...start.c, cx: start.c.cx - dx / s, cy: start.c.cy - dy / s });
      };
      const up = () => {
        box.removeEventListener("pointermove", move);
        box.removeEventListener("pointerup", up);
        box.removeEventListener("pointercancel", up);
        setPanning(false);
        if (!moved && ground) props.onBackgroundClick?.();
      };
      box.addEventListener("pointermove", move);
      box.addEventListener("pointerup", up);
      box.addEventListener("pointercancel", up);
    };
    box.addEventListener("pointerdown", down, { capture: true });

    // Weather, fish, and birds on their own canvas over the plan.
    const life = createLife(lifeCanvas, () => ({ property: props.property, view: view(), weather: props.weather ?? "sunny", width: size().w, height: size().h }));
    if (import.meta.env.DEV) (window as unknown as { __life: typeof life }).__life = life;
    createEffect(() => {
      props.weather;
      props.property;
      view();
      life.refresh();
    });
    // A click on a bird startles it (and its flock) into flight, with a chirp. It wins over panning and selecting.
    const local = (e: PointerEvent | MouseEvent) => {
      const r = box.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const birdDown = (e: PointerEvent) => {
      if (!box.contains(e.target as Node) || e.button !== 0) return;
      const i = life.birdAt(...local(e));
      if (i < 0) return;
      e.stopPropagation();
      e.preventDefault();
      life.scare(i);
      chirp();
    };
    const birdHover = (e: PointerEvent) => box.classList.toggle("over-bird", life.birdAt(...local(e)) >= 0);
    window.addEventListener("pointerdown", birdDown, { capture: true });
    box.addEventListener("pointermove", birdHover);
    onCleanup(() => {
      life.dispose();
      window.removeEventListener("pointerdown", birdDown, { capture: true });
      box.removeEventListener("pointermove", birdHover);
    });

    onCleanup(() => {
      ro.disconnect();
      box.removeEventListener("wheel", wheel);
      box.removeEventListener("pointerdown", down, { capture: true });
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", keyUp);
    });
  });

  // Repaint at most once a frame while panning or zooming; otherwise paint right away.
  let frame = 0;
  createEffect(() => {
    const { w, h } = size();
    const v = view();
    const property = props.property, time = props.time;
    if (!w || !h) return;
    const draw = () => {
      frame = 0;
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      paint(canvas, property, time, v);
    };
    if (frame) cancelAnimationFrame(frame);
    if (panning() || zooming) frame = requestAnimationFrame(draw);
    else draw();
  });

  const pct = () => Math.round(cam().zoom * 100);

  return (
    <div
      class="plan-view"
      classList={{ panning: panning() }}
      ref={box}
      onDragOver={(e) => {
        if (!e.dataTransfer?.types.includes("text/plant")) return;
        e.preventDefault();
        props.onDragPlantOver?.(toFt(e.clientX, e.clientY));
      }}
      onDragLeave={(e) => {
        if (!box.contains(e.relatedTarget as Node)) props.onDragPlantOver?.(null);
      }}
      onDrop={(e) => {
        const id = e.dataTransfer?.getData("text/plant");
        props.onDragPlantOver?.(null);
        if (!id || !props.onDropPlant) return;
        e.preventDefault();
        props.onDropPlant(id, toFt(e.clientX, e.clientY));
      }}
    >
      <canvas ref={canvas} style={{ width: `${size().w}px`, height: `${size().h}px` }} />
      <svg class="plan-overlay" width={size().w} height={size().h}>
        <g transform={`translate(${view().offX} ${view().offY}) scale(${view().scale})`}>
          <Show when={props.property.underlay && props.photoOpacity ? props.property.underlay : undefined}>
            {(u) => (
              <image
                class="underlay"
                href={`/api/images/${u().file}`}
                x={u().originFt[0]}
                y={u().originFt[1]}
                width={u().sizePx[0] * u().ftPerPx}
                height={u().sizePx[1] * u().ftPerPx}
                opacity={props.photoOpacity}
                preserveAspectRatio="none"
              />
            )}
          </Show>
          {untrack(() => props.overlay?.(liveView))}
        </g>
        <PlanMarks property={props.property} view={view()} height={size().h} />
      </svg>
      <canvas class="life-canvas" ref={lifeCanvas} style={{ width: `${size().w}px`, height: `${size().h}px` }} aria-hidden="true" />
      <div class="zoom-controls" role="group" aria-label="Zoom">
        <button type="button" class="icon-btn" onClick={() => zoomCenter(0.8)} title="Zoom out (−)" aria-label="Zoom out">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3.5 8h9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
        <button type="button" class="zoom-pct" onClick={fit} title="Fit the whole lot (0)" aria-label={`Zoom ${pct()}%, fit to lot`}>
          {pct()}%
        </button>
        <button type="button" class="icon-btn" onClick={() => zoomCenter(1.25)} title="Zoom in (+)" aria-label="Zoom in">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M3.5 8h9M8 3.5v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
        <button type="button" class="icon-btn" onClick={fit} title="Fit the whole lot (0)" aria-label="Fit the whole lot">
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      {props.children}
    </div>
  );
}

// North arrow and scale bar, drawn in screen pixels like the title block of a site plan.
function PlanMarks(props: { property: Property; view: View; height: number }) {
  const bar = () => {
    const target = 160 / props.view.scale;
    const ft = [1, 2, 5, 10, 20, 25, 50, 100].find((v) => v >= target / 2) ?? 100;
    return { ft, px: ft * props.view.scale };
  };
  return (
    <g class="plan-marks" transform={`translate(24 ${props.height - 28})`}>
      <g transform={`translate(${bar().px * 2 + 48} -14) rotate(${-props.property.headingDeg})`}>
        <circle r="13" />
        <path d="M0 -11 L5 6 L0 2 L-5 6 Z" />
        <text y="-17" text-anchor="middle">N</text>
      </g>
      <rect width={bar().px} height="5" class="bar-dark" />
      <rect x={bar().px} width={bar().px} height="5" class="bar-light" />
      <text y="-6">0</text>
      <text x={bar().px} y="-6" text-anchor="middle">{bar().ft}</text>
      <text x={bar().px * 2} y="-6" text-anchor="middle">{bar().ft * 2} ft</text>
    </g>
  );
}
