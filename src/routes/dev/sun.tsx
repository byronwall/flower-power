import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { PlanView } from "../../components/PlanView";
import { loadProperties } from "../../model/library";
import type { Point, Property } from "../../model/property";
import type { View } from "../../render/paint";
import { seasonLabels, seasons, type SunSeason } from "../../sun/solar";
import { classOf, hoursAt, sunClassOfArea, sunHours, type SunGrid } from "../../sun/sun";

// Dev check for the sun model: a heat map of direct-sun hours over the real plan.
export default function SunCheck() {
  const [list] = createResource(loadProperties);
  return (
    <Show when={list()} fallback={<p class="status">{list.error ? String(list.error.message) : "Loading…"}</p>}>
      {(l) => <Check properties={l()} />}
    </Show>
  );
}

const stops: [number, number[]][] = [
  [0, [28, 30, 88, 0.74]],
  [3, [98, 62, 150, 0.52]],
  [6, [240, 186, 56, 0.14]],
  [12, [255, 206, 64, 0.3]],
];

function ramp(h: number) {
  let i = 1;
  while (i < stops.length - 1 && h > stops[i][0]) i++;
  const [h0, a] = stops[i - 1];
  const [h1, b] = stops[i];
  const t = Math.max(0, Math.min(1, (h - h0) / (h1 - h0)));
  return a.map((v, k) => v + (b[k] - v) * t);
}

// Smooths the grid K times finer and draws a dark line where the sun class changes.
const K = 4;

function heatImage(g: SunGrid) {
  const w = g.cols * K, h = g.rows * K;
  const at = (c: number, r: number) => g.hours[Math.min(g.rows - 1, Math.max(0, r)) * g.cols + Math.min(g.cols - 1, Math.max(0, c))];
  const fine = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const fx = (x + 0.5) / K - 0.5, fy = (y + 0.5) / K - 0.5;
      const c = Math.floor(fx), r = Math.floor(fy), tx = fx - c, ty = fy - r;
      const corners = [at(c, r), at(c + 1, r), at(c, r + 1), at(c + 1, r + 1)];
      // Inside a building the cell stays empty; next to one, use the lit neighbors.
      if (Number.isNaN(at(Math.round(fx), Math.round(fy)))) fine[y * w + x] = NaN;
      else {
        const wts = [(1 - tx) * (1 - ty), tx * (1 - ty), (1 - tx) * ty, tx * ty];
        let sum = 0, tot = 0;
        corners.forEach((v, k) => !Number.isNaN(v) && ((sum += v * wts[k]), (tot += wts[k])));
        fine[y * w + x] = sum / tot;
      }
    }
  const band = (v: number) => (v >= 6 ? 2 : v >= 3 ? 1 : 0);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(w, h);
  fine.forEach((v, i) => {
    if (Number.isNaN(v)) return;
    const x = i % w, y = (i - x) / w;
    const right = x + 1 < w ? fine[i + 1] : v, down = y + 1 < h ? fine[i + w] : v;
    const edge = (!Number.isNaN(right) && band(right) !== band(v)) || (!Number.isNaN(down) && band(down) !== band(v));
    const [r, gr, b, a] = edge ? [40, 30, 70, 0.8] : ramp(v);
    img.data.set([r, gr, b, a * 255], i * 4);
  });
  ctx.putImageData(img, 0, 0);
  return c.toDataURL();
}

function Check(props: { properties: Property[] }) {
  const [id, setId] = createSignal(props.properties[0].id);
  const [heading, setHeading] = createSignal(props.properties[0].headingDeg);
  const [season, setSeason] = createSignal<SunSeason>("growing");
  const [probe, setProbe] = createSignal<Point | null>(null);
  let view: View = { scale: 1, offX: 0, offY: 0 };

  const base = () => props.properties.find((p) => p.id === id())!;
  const property = createMemo(() => ({ ...base(), headingDeg: heading() }));
  const run = createMemo(() => {
    const t0 = performance.now();
    const g = sunHours(property(), { season: season() });
    return { g, ms: performance.now() - t0 };
  });
  const image = createMemo(() => heatImage(run().g));
  const beds = createMemo(() =>
    property().surfaces.filter((s) => s.kind === "mulch").map((s) => ({ id: s.id, cls: sunClassOfArea(property(), s.outline, { season: season() }) })),
  );

  // PlanView builds the overlay once and hands it a live view, so everything below reads signals inside JSX.
  const overlay = (v: View) => {
    view = v;
    const g = () => run().g;
    return (
      <>
        <defs>
          <clipPath id="sun-lot">
            <polygon points={property().lot.outline.map((p) => p.join(",")).join(" ")} />
          </clipPath>
        </defs>
        <image
          href={image()}
          x={g().minX}
          y={g().minY}
          width={g().cols * g().cell}
          height={g().rows * g().cell}
          preserveAspectRatio="none"
          clip-path="url(#sun-lot)"
        />
      </>
    );
  };

  const probeText = () => {
    const at = probe();
    if (!at) return "Point at the plan to read the hours.";
    const h = hoursAt(run().g, at);
    if (Number.isNaN(h)) return `(${at[0].toFixed(0)}, ${at[1].toFixed(0)}) ft: inside a building or off the lot`;
    return `(${at[0].toFixed(0)}, ${at[1].toFixed(0)}) ft: ${h.toFixed(1)} h of direct sun, ${classOf(h)}`;
  };

  return (
    <div class="app" style={{ height: "100vh", display: "flex", "flex-direction": "column" }}>
      <header class="app-bar" style={{ display: "flex", gap: "16px", "align-items": "center", "flex-wrap": "wrap", padding: "10px 16px" }}>
        <strong>Sun check</strong>
        <label>
          Plan{" "}
          <select value={id()} onChange={(e) => (setId(e.currentTarget.value), setHeading(base().headingDeg))}>
            <For each={props.properties}>{(p) => <option value={p.id}>{p.name}</option>}</For>
          </select>
        </label>
        <label>
          Season{" "}
          <select value={season()} onChange={(e) => setSeason(e.currentTarget.value as SunSeason)}>
            <For each={[...seasons]}>{(s) => <option value={s}>{seasonLabels[s]}</option>}</For>
          </select>
        </label>
        <label style={{ display: "flex", gap: "8px", "align-items": "center" }}>
          Plan top faces
          <input type="range" min="0" max="345" step="15" value={heading()} onInput={(e) => setHeading(+e.currentTarget.value)} />
          <span style={{ width: "3.5em" }}>{heading()}°</span>
        </label>
        <span style={{ color: "var(--muted)" }}>Computed in {run().ms.toFixed(0)} ms</span>
      </header>
      <div style={{ flex: 1, display: "flex", "min-height": 0 }}>
        <div
          style={{ flex: 1, display: "flex", "min-width": 0 }}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setProbe([(e.clientX - r.left - view.offX) / view.scale, (e.clientY - r.top - view.offY) / view.scale]);
          }}
          onMouseLeave={() => setProbe(null)}
        >
          <PlanView property={property()} time={{ month: season() === "equinox" ? 3 : 6, year: 5 }} overlay={overlay} />
        </div>
        <aside style={{ width: "260px", padding: "16px", "border-left": "1px solid var(--line)", background: "var(--panel)", display: "flex", "flex-direction": "column", gap: "14px" }}>
          <div>
            <h3 style={{ margin: "0 0 8px" }}>Direct sun per day</h3>
            <div style={{ height: "12px", "border-radius": "3px", background: `linear-gradient(90deg, ${[0, 1.5, 3, 4.5, 6, 9, 12].map((h) => `rgba(${ramp(h).slice(0, 3).join(",")},${Math.max(0.35, ramp(h)[3])})`).join(",")})` }} />
            <div style={{ display: "flex", "justify-content": "space-between", "font-size": "12px", color: "var(--muted)" }}>
              <span>0 h</span>
              <span>3 h</span>
              <span>6 h</span>
              <span>12 h</span>
            </div>
            <p style={{ "font-size": "13px", margin: "6px 0 0" }}>Shade under 3 h · part 3–6 h · full 6 h or more</p>
          </div>
          <p style={{ "font-size": "13px", margin: 0 }}>{probeText()}</p>
          <div>
            <h3 style={{ margin: "0 0 6px" }}>Beds</h3>
            <For each={beds()} fallback={<p style={{ "font-size": "13px" }}>No mulch beds on this plan.</p>}>
              {(b) => (
                <div style={{ display: "flex", "justify-content": "space-between", "font-size": "13px" }}>
                  <span>{b.id}</span>
                  <strong>{b.cls}</strong>
                </div>
              )}
            </For>
          </div>
        </aside>
      </div>
    </div>
  );
}
