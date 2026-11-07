import { createMemo, createSignal, For, Show } from "solid-js";
import type { Editor } from "../editor/state";
import { label } from "../editor/Inspector";
import { plants } from "../model/library";
import type { Plant } from "../model/plant";
import { monthNames, type ViewTime } from "../render/look";
import { PlantPicture } from "./PlantPicture";

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

export function PlantGallery(props: { editor: Editor; time: ViewTime; previewing?: string | null; onPreview?: (id: string) => void }) {
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
        <div class="gallery-title">
          <h2>Plants</h2>
          <span class="count">
            {shown().length} of {plants.length}
          </span>
        </div>
        <input id="plant-search" type="search" placeholder="Search by name…" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
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
            <option value="">Any color</option>
            <For each={FAMILIES}>{(f) => <option value={f.id}>{f.name}</option>}</For>
          </select>
        </div>
        <label class="check">
          <input id="filter-blooming" type="checkbox" checked={bloomingNow()} onChange={(e) => setBloomingNow(e.currentTarget.checked)} />
          Only plants blooming in {monthNames[props.time.month - 1]}
        </label>
      </header>
      <p class="gallery-tip">Drag a plant onto the plan, or pick how to plant it.</p>
      <ul class="plant-list">
        <For
          each={shown()}
          fallback={
            <li class="empty">
              No plants match these filters.
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("");
                  setSun("");
                  setColor("");
                  setBloomingNow(false);
                }}
              >
                Clear filters
              </button>
            </li>
          }
        >
          {(p) => (
            <li
              class="plant-card"
              classList={{ previewing: props.previewing === p.id }}
              draggable="true"
              title="Click to see it larger. Drag onto the plan to plant it."
              onClick={(e) => {
                if (!(e.target as HTMLElement).closest("button")) props.onPreview?.(p.id);
              }}
              onDragStart={(e) => {
                e.dataTransfer!.setData("text/plant", p.id);
                e.dataTransfer!.effectAllowed = "copy";
              }}
            >
              <PlantPicture plant={p} time={props.time} size={56} />
              <div class="plant-info">
                <strong>{p.commonName}</strong>
                <span class="botanical">{p.botanicalName}</span>
                <span class="tags">
                  {label(p.category)} · {p.size.heightFt} ft · {p.sun.map(label).join("/")}
                </span>
                <Show when={p.nativeToIndiana || p.bloom?.months.includes(props.time.month)}>
                  <span class="badges">
                    <Show when={p.bloom?.months.includes(props.time.month)}>
                      <span class="badge bloom" title={`Flowers in ${monthNames[props.time.month - 1]}`}>
                        <span class="swatch" style={{ background: p.bloom!.colors[0] }} />
                        In bloom
                      </span>
                    </Show>
                    <Show when={p.nativeToIndiana}>
                      <span class="badge" title="Native to Indiana">Native</span>
                    </Show>
                  </span>
                </Show>
                <span class="place">
                  <Show when={p.placement !== "region"}>
                    <button type="button" aria-pressed={activeTool() === `${p.id}:single`} onClick={() => place(p, "single")} title="Click the plan to place one plant">
                      + One
                    </button>
                  </Show>
                  <Show when={p.placement !== "single"}>
                    <button type="button" aria-pressed={activeTool() === `${p.id}:region`} onClick={() => place(p, "region")} title="Outline an area on the plan to fill it with this plant">
                      Fill area
                    </button>
                  </Show>
                  <Show when={p.category === "shrub" || p.category === "grass" || p.category === "perennial"}>
                    <button type="button" aria-pressed={activeTool() === `${p.id}:row`} onClick={() => place(p, "row")} title="Draw a line on the plan to plant a row, like a hedge">
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
