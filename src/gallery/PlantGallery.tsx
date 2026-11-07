import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import type { Editor } from "../editor/state";
import { label } from "../editor/Inspector";
import { plants } from "../model/library";
import type { Plant } from "../model/plant";
import { lookOf, type ViewTime } from "../render/look";
import { drawPlant } from "../render/plants";

const CATEGORIES = ["tree", "shrub", "perennial", "grass", "groundcover", "annual"] as const;

// Bloom colors grouped into families a person would name.
const FAMILIES = [
  { id: "white", name: "White", test: (h: number, s: number, l: number) => l > 0.82 || s < 0.15 },
  { id: "yellow", name: "Yellow and orange", test: (h: number) => h >= 20 && h < 65 },
  { id: "pink", name: "Pink and red", test: (h: number) => h >= 300 || h < 20 },
  { id: "purple", name: "Purple and blue", test: (h: number) => h >= 200 && h < 300 },
] as const;

function family(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d) h = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
  h = (h + 360) % 360;
  return FAMILIES.find((f) => f.test(h, s, l))?.id ?? "other";
}

export function PlantGallery(props: { editor: Editor; time: ViewTime }) {
  const [query, setQuery] = createSignal("");
  const [category, setCategory] = createSignal<string>("");
  const [sun, setSun] = createSignal<string>("");
  const [color, setColor] = createSignal<string>("");
  const [bloomingNow, setBloomingNow] = createSignal(false);

  const shown = createMemo(() =>
    plants.filter((p) => {
      const q = query().trim().toLowerCase();
      if (q && !`${p.commonName} ${p.botanicalName}`.toLowerCase().includes(q)) return false;
      if (category() && p.category !== category()) return false;
      if (sun() && !p.sun.includes(sun() as Plant["sun"][number])) return false;
      if (color() && !p.bloom?.colors.some((c) => family(c) === color())) return false;
      if (bloomingNow() && !p.bloom?.months.includes(props.time.month)) return false;
      return true;
    }),
  );

  const place = (p: Plant, type: "single" | "region" | "row") =>
    props.editor.setTool({
      mode: "draw",
      col: "plantings",
      kind: p.id,
      plantId: p.id,
      type,
      shape: type === "single" ? "point" : type === "region" ? "outline" : "path",
    });

  const activeTool = () => {
    const t = props.editor.tool();
    return t.mode === "draw" && t.col === "plantings" ? `${t.plantId}:${t.type}` : "";
  };

  return (
    <aside class="gallery">
      <header>
        <span class="eyebrow">Plants · {shown().length} of {plants.length}</span>
        <input id="plant-search" type="search" placeholder="Search plants" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
        <div class="chips" role="group" aria-label="Kind of plant">
          <button type="button" aria-pressed={!category()} onClick={() => setCategory("")}>
            All
          </button>
          <For each={CATEGORIES}>
            {(c) => (
              <button type="button" aria-pressed={category() === c} onClick={() => setCategory(category() === c ? "" : c)}>
                {label(c)}
              </button>
            )}
          </For>
        </div>
        <div class="filters">
          <select id="filter-sun" aria-label="Sun" value={sun()} onChange={(e) => setSun(e.currentTarget.value)}>
            <option value="">Any sun</option>
            <option value="full">Full sun</option>
            <option value="part">Part sun</option>
            <option value="shade">Shade</option>
          </select>
          <select id="filter-color" aria-label="Bloom color" value={color()} onChange={(e) => setColor(e.currentTarget.value)}>
            <option value="">Any bloom color</option>
            <For each={FAMILIES}>{(f) => <option value={f.id}>{f.name}</option>}</For>
          </select>
        </div>
        <label class="check">
          <input id="filter-blooming" type="checkbox" checked={bloomingNow()} onChange={(e) => setBloomingNow(e.currentTarget.checked)} />
          Blooming in the month shown
        </label>
      </header>
      <ul class="plant-list">
        <For each={shown()} fallback={<li class="muted">No plants match these filters.</li>}>
          {(p) => (
            <li
              class="plant-card"
              draggable="true"
              onDragStart={(e) => {
                e.dataTransfer!.setData("text/plant", p.id);
                e.dataTransfer!.effectAllowed = "copy";
              }}
            >
              <PlantThumb plant={p} time={props.time} />
              <div class="plant-info">
                <strong>{p.commonName}</strong>
                <span class="botanical">{p.botanicalName}</span>
                <span class="tags">
                  {label(p.category)} · {p.size.heightFt} ft · {p.sun.map(label).join("/")}
                  <Show when={p.nativeToIndiana}> · Native</Show>
                </span>
                <span class="place">
                  <Show when={p.placement !== "region"}>
                    <button type="button" aria-pressed={activeTool() === `${p.id}:single`} onClick={() => place(p, "single")}>
                      Place
                    </button>
                  </Show>
                  <Show when={p.placement !== "single"}>
                    <button type="button" aria-pressed={activeTool() === `${p.id}:region`} onClick={() => place(p, "region")}>
                      Region
                    </button>
                  </Show>
                  <Show when={p.category === "shrub" || p.category === "grass" || p.category === "perennial"}>
                    <button type="button" aria-pressed={activeTool() === `${p.id}:row`} onClick={() => place(p, "row")}>
                      Row
                    </button>
                  </Show>
                </span>
              </div>
            </li>
          )}
        </For>
      </ul>
    </aside>
  );
}

// The plant drawn by the plan painter, at mature size and the month shown.
function PlantThumb(props: { plant: Plant; time: ViewTime }) {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement>();
  const SIZE = 56;
  createEffect(() => {
    const c = canvas();
    if (c) draw(c, props.time.month);
  });
  const draw = (canvas: HTMLCanvasElement, month: number) => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.height = SIZE * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const time = { month, year: 5 };
    const look = lookOf(props.plant, time, true) ?? lookOf(props.plant, { month: 7, year: 5 }, true)!;
    const scale = (SIZE * 0.8) / look.spreadFt;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (dpr * SIZE) / 2, (dpr * SIZE) / 2);
    drawPlant({ ctx, px: (n) => n / scale }, props.plant, [0, 0], look, 17);
  };
  return <canvas class="thumb" ref={setCanvas} style={{ width: `${SIZE}px`, height: `${SIZE}px` }} />;
}
