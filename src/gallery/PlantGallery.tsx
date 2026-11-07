import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { Editor } from "../editor/state";
import { label } from "../editor/Inspector";
import { plants, plantsById } from "../model/library";
import type { Plant } from "../model/plant";
import { monthNames, type ViewTime } from "../render/look";
import { PlantPicture } from "./PlantPicture";

// The plant being dragged from the list, so the plan can preview it before the drop.
export const [draggingPlant, setDraggingPlant] = createSignal<string | null>(null);

export const isInvasive = (p: Plant) => !!p.indianaStatus?.startsWith("invasive");

const CATEGORIES = ["tree", "shrub", "perennial", "grass", "groundcover", "vine", "annual"] as const;

// Bloom colors grouped into families a person would name.
const FAMILIES = [
  { id: "white", name: "White", swatch: "#f4f1e6", test: (h: number, s: number, l: number) => l > 0.82 || s < 0.15 },
  { id: "yellow", name: "Yellow & orange", swatch: "#eab42a", test: (h: number) => h >= 20 && h < 65 },
  { id: "pink", name: "Pink & red", swatch: "#d0456b", test: (h: number) => h >= 300 || h < 20 },
  { id: "purple", name: "Purple & blue", swatch: "#8a6fd0", test: (h: number) => h >= 200 && h < 300 },
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

// Everything behind the Filters button. Within a group any choice matches; across groups all must.
type Group = { id: string; name: string; icon: string; options: { id: string; name: string; swatch?: string }[]; test: (p: Plant, id: string, month: number) => boolean };
const GROUPS: Group[] = [
  {
    id: "sun",
    icon: "M8 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M13 3l-1 1M4 12l-1 1",
    name: "Sun",
    options: [
      { id: "full", name: "Full sun" },
      { id: "part", name: "Part sun" },
      { id: "shade", name: "Shade" },
    ],
    test: (p, id) => p.sun.includes(id as Plant["sun"][number]),
  },
  {
    id: "moisture",
    icon: "M8 1.8C8 1.8 3.5 7 3.5 10a4.5 4.5 0 009 0C12.5 7 8 1.8 8 1.8z",
    name: "Soil",
    options: [
      { id: "dry", name: "Dry" },
      { id: "medium", name: "Average" },
      { id: "wet", name: "Wet" },
    ],
    test: (p, id) => (p.moisture ?? (p.water === "low" ? ["dry"] : p.water === "high" ? ["wet"] : ["medium"])).includes(id as "dry"),
  },
  {
    id: "color",
    icon: "M8 8m-2 0a2 2 0 104 0 2 2 0 10-4 0M8 2.5a2.2 2.2 0 012 3M13.2 6.3a2.2 2.2 0 01-1.6 3.2M11.3 12.6a2.2 2.2 0 01-3.5.3M4.5 12.4a2.2 2.2 0 01-1.6-3M2.9 6.1a2.2 2.2 0 013.1-1.5",
    name: "Flowers",
    options: FAMILIES.map((f) => ({ id: f.id, name: f.name, swatch: f.swatch })),
    test: (p, id) => !!p.bloom?.colors.some((c) => family(c) === id),
  },
  {
    id: "wildlife",
    icon: "M2 9c2-4 6-5 9-3l3-1-1.5 2.5C12 11 8 13 4 11.5L2 13zM10.5 7.2h.01",
    name: "Good for",
    options: [
      { id: "pollinators", name: "Pollinators" },
      { id: "butterflies", name: "Butterflies" },
      { id: "hummingbirds", name: "Hummingbirds" },
      { id: "birds", name: "Birds" },
    ],
    test: (p, id) => p.wildlife.includes(id as Plant["wildlife"][number]),
  },
  {
    id: "more",
    icon: "M3 8h.01M8 8h.01M13 8h.01",
    name: "Also",
    options: [
      { id: "blooming", name: "Blooming now" },
      { id: "edible", name: "Edible" },
      { id: "evergreen", name: "Evergreen" },
    ],
    test: (p, id, month) => (id === "blooming" ? !!p.bloom?.months.includes(month) : id === "edible" ? !!p.edible : p.evergreen),
  },
];
const optionName = (g: string, o: string, month: number) => {
  if (g === "more" && o === "blooming") return `Blooming in ${monthNames[month - 1]}`;
  return GROUPS.find((x) => x.id === g)!.options.find((x) => x.id === o)!.name;
};

type Origin = "all" | "native" | "invasive";

export function PlantGallery(props: { editor: Editor; time: ViewTime; previewing?: string | null; onPreview?: (id: string) => void }) {
  const [query, setQuery] = createSignal("");
  const [category, setCategory] = createSignal<string>("");
  const [origin, setOrigin] = createSignal<Origin>("all");
  const [picked, setPicked] = createSignal<Record<string, string[]>>({});
  // Which filter card's popover is open, if any.
  const [open, setOpen] = createSignal<string | null>(null);

  const toggle = (g: string, o: string) => {
    const cur = picked()[g] ?? [];
    setPicked({ ...picked(), [g]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] });
  };
  const active = createMemo(() => Object.entries(picked()).flatMap(([g, os]) => os.map((o) => ({ g, o }))));
  const clearAll = () => {
    setQuery("");
    setCategory("");
    setPicked({});
  };

  const shown = createMemo(() =>
    plants.filter((p) => {
      const inv = isInvasive(p);
      if (origin() === "invasive" ? !inv : inv) return false;
      if (origin() === "native" && !p.nativeToIndiana) return false;
      const q = query().trim().toLowerCase();
      if (q && !`${p.commonName} ${p.botanicalName}`.toLowerCase().includes(q)) return false;
      // The invasive list hides the type and filter controls, so only the search applies there.
      if (origin() === "invasive") return true;
      if (category() && p.category !== category()) return false;
      for (const g of GROUPS) {
        const os = picked()[g.id];
        if (os?.length && !os.some((o) => g.test(p, o, props.time.month))) return false;
      }
      return true;
    }),
  );
  const poolSize = () => plants.filter((p) => (origin() === "invasive" ? isInvasive(p) : !isInvasive(p) && (origin() !== "native" || p.nativeToIndiana))).length;

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

  // The filters popover closes on Esc or a click outside it.
  let pop!: HTMLDivElement;
  let cards!: HTMLDivElement;
  onMount(() => {
    const away = (e: PointerEvent) => {
      if (open() && !pop?.contains(e.target as Node) && !cards.contains(e.target as Node)) setOpen(null);
    };
    const esc = (e: KeyboardEvent) => {
      if (open() && e.key === "Escape") {
        e.stopPropagation();
        const id = open();
        setOpen(null);
        cards.querySelector<HTMLButtonElement>(`[data-group="${id}"]`)?.focus();
      }
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc, true);
    onCleanup(() => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc, true);
    });
  });

  return (
    <aside class="gallery">
      <header>
        <div class="gallery-title">
          <h2>Plants</h2>
          <span class="count">
            {shown().length} of {poolSize()}
          </span>
        </div>
        <input id="plant-search" type="search" placeholder="Search by name…" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
        <div class="origin" role="radiogroup" aria-label="Where the plant comes from">
          <For
            each={[
              { id: "all" as const, name: "All plants", title: "Native and garden plants. Invasive plants are hidden." },
              { id: "native" as const, name: "Native", title: "Only plants native to Indiana" },
              { id: "invasive" as const, name: "Invasive", title: "Plants to remove, and what to grow instead" },
            ]}
          >
            {(o) => (
              <button type="button" role="radio" aria-checked={origin() === o.id} classList={{ warn: o.id === "invasive" }} onClick={() => setOrigin(o.id)} title={o.title}>
                {o.name}
              </button>
            )}
          </For>
        </div>
        <Show when={origin() !== "invasive"}>
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
          {/* One card per filter. Each shows its current value and opens its own small popover. */}
          <div class="filter-cards" ref={cards}>
            <For each={GROUPS}>
              {(g) => {
                const chosen = () => picked()[g.id] ?? [];
                const value = () =>
                  chosen().length === 0 ? "Any" : chosen().length === 1 ? optionName(g.id, chosen()[0], props.time.month) : `${chosen().length} picked`;
                return (
                  <button
                    type="button"
                    class="filter-card"
                    data-group={g.id}
                    classList={{ on: chosen().length > 0 }}
                    aria-expanded={open() === g.id}
                    aria-haspopup="dialog"
                    onClick={() => setOpen(open() === g.id ? null : g.id)}
                  >
                    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d={g.icon} />
                    </svg>
                    <span class="fc-text">
                      <span class="fc-name">{g.name}</span>
                      <span class="fc-value">{value()}</span>
                    </span>
                    <svg class="fc-caret" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true">
                      <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                );
              }}
            </For>
            <Show when={active().length > 0}>
              <button type="button" class="filter-card clear" onClick={() => setPicked({})} title="Remove every filter">
                <span class="fc-text">
                  <span class="fc-name">{active().length} on</span>
                  <span class="fc-value">Clear all</span>
                </span>
              </button>
            </Show>
          </div>
          <Show when={GROUPS.find((g) => g.id === open())}>
            {(g) => (
              <div class="filters-pop" ref={pop} role="dialog" aria-label={g().name}>
                <div class="filter-group" role="group" aria-label={g().name}>
                  <span class="filter-name">{g().name}</span>
                  <div class="filter-options">
                    <For each={g().options}>
                      {(o) => (
                        <button type="button" class="option" aria-pressed={(picked()[g().id] ?? []).includes(o.id)} onClick={() => toggle(g().id, o.id)}>
                          <Show when={o.swatch}>
                            <span class="swatch" style={{ background: o.swatch }} />
                          </Show>
                          {optionName(g().id, o.id, props.time.month)}
                        </button>
                      )}
                    </For>
                  </div>
                </div>
                <div class="filters-foot">
                  <span class="muted">
                    {shown().length} {shown().length === 1 ? "plant" : "plants"} match
                  </span>
                  <Show when={(picked()[g().id] ?? []).length > 0}>
                    <button type="button" class="link-btn" onClick={() => setPicked({ ...picked(), [g().id]: [] })}>
                      Clear
                    </button>
                  </Show>
                  <button type="button" class="primary" onClick={() => setOpen(null)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </Show>
        </Show>
      </header>
      <Show when={origin() === "invasive"}>
        <p class="invasive-note">
          These spread into Indiana's woods and fields. Don't plant them; if one is in your yard, remove it and grow a native instead.
        </p>
      </Show>
      <Show when={origin() !== "invasive" && shown().length > 0}>
        <p class="gallery-tip">Drag a plant onto the plan, or pick how to plant it.</p>
      </Show>
      <ul class="plant-list">
        <For
          each={shown()}
          fallback={
            <li class="empty">
              {query().trim() ? `No plants match "${query().trim()}".` : "No plants match these filters."}
              <button type="button" onClick={clearAll}>
                Clear filters
              </button>
            </li>
          }
        >
          {(p) => {
            const inv = isInvasive(p);
            return (
              <li
                class="plant-card"
                classList={{ previewing: props.previewing === p.id, invasive: inv }}
                draggable={inv ? "false" : "true"}
                title={inv ? "Click to see why, and what to plant instead." : "Click to see it larger. Drag onto the plan to plant it."}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("button")) props.onPreview?.(p.id);
                }}
                onDragStart={(e) => {
                  if (inv) return e.preventDefault();
                  e.dataTransfer!.setData("text/plant", p.id);
                  e.dataTransfer!.effectAllowed = "copy";
                  setDraggingPlant(p.id);
                }}
                onDragEnd={() => {
                  setDraggingPlant(null);
                  props.editor.setGhost(null);
                }}
              >
                <PlantPicture plant={p} time={props.time} size={64} best />
                <div class="plant-info">
                  <strong>{p.commonName}</strong>
                  <span class="botanical">{p.botanicalName}</span>
                  <span class="tags">
                    {label(p.category)} · {p.size.heightFt} ft · {p.sun.map(label).join("/")}
                  </span>
                  <Show when={inv}>
                    <span class="badges">
                      <span class="badge danger">{p.indianaStatus === "invasive_banned" ? "Banned in Indiana" : "Invasive in Indiana"}</span>
                    </span>
                    <Show when={p.alternatives?.length}>
                      <span class="instead">
                        Plant instead:{" "}
                        <For each={p.alternatives}>
                          {(id, i) => (
                            <>
                              {i() > 0 ? ", " : ""}
                              <button type="button" class="link-btn" onClick={() => props.onPreview?.(id)}>
                                {plantsById.get(id)?.commonName ?? id}
                              </button>
                            </>
                          )}
                        </For>
                      </span>
                    </Show>
                  </Show>
                  <Show when={!inv && (p.nativeToIndiana || p.bloom?.months.includes(props.time.month))}>
                    <span class="badges">
                      <Show when={p.bloom?.months.includes(props.time.month)}>
                        <span class="badge bloom" title={`Flowers in ${monthNames[props.time.month - 1]}`}>
                          <span class="swatch" style={{ background: p.bloom!.colors[0] }} />
                          In bloom
                        </span>
                      </Show>
                      <Show when={p.nativeToIndiana}>
                        <span class="badge" title="Native to Indiana">
                          Native
                        </span>
                      </Show>
                    </span>
                  </Show>
                  <Show when={!inv}>
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
                  </Show>
                </div>
              </li>
            );
          }}
        </For>
      </ul>
    </aside>
  );
}
