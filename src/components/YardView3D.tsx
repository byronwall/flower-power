import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";
import { plantsById } from "../model/library";
import type { Point, Property } from "../model/property";
import type { Weather } from "../render/life";
import type { ViewTime } from "../render/look";
import type { CameraView, Pick } from "../render/yard3d";

type Yard = ReturnType<typeof import("../render/yard3d").createYard>;

type Props = {
  property: Property;
  time: ViewTime;
  weather?: Weather;
  selected: Pick | null;
  onPick: (ref: Pick | null) => void;
  onDropPlant: (plantId: string, at: Point) => void;
  children?: JSX.Element;
};

const VIEWS: { id: CameraView; name: string; title: string }[] = [
  { id: "overview", name: "Overview", title: "The whole yard from above the garden" },
  { id: "top", name: "From above", title: "Straight down, like the plan" },
  { id: "eye", name: "Eye level", title: "Stand in the garden and look back at the house" },
];

// What a picked thing is called, for the hover label.
function nameOf(property: Property, ref: Pick) {
  if (ref.col === "house") return "House";
  const list = (property as unknown as Record<string, { id: string; kind?: string; plantId?: string; name?: string }[]>)[ref.col];
  const item = list?.find((o) => o.id === ref.id);
  if (!item) return "";
  if (item.plantId) return plantsById.get(item.plantId)?.commonName ?? "";
  const kind = (item.kind ?? "").replace(/-/g, " ");
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

// The 3D yard. three.js loads only when this view is first shown, so the plan alone stays light.
export function YardView3D(props: Props) {
  let box!: HTMLDivElement;
  const [yard, setYard] = createSignal<Yard>();
  const [spin, setSpin] = createSignal(false);
  const [failed, setFailed] = createSignal("");
  const [moved, setMoved] = createSignal(false);
  const [view, setView] = createSignal<CameraView>("overview");
  const [tip, setTip] = createSignal<{ text: string; x: number; y: number } | null>(null);

  onMount(async () => {
    try {
      const { createYard } = await import("../render/yard3d");
      const y = createYard(box, {
        onPick: (ref) => props.onPick(ref),
        onHover: (ref, x, yy) => {
          const text = ref && nameOf(props.property, ref);
          const r = box.getBoundingClientRect();
          setTip(text ? { text, x: x - r.left, y: yy - r.top } : null);
        },
      });
      setYard(y);
      onCleanup(() => y.dispose());
    } catch {
      setFailed("The 3D view can't start in this browser. The 2D plan still has everything; try another browser to see 3D.");
    }
  });

  createEffect(() => {
    const y = yard();
    if (y) y.update(props.property, props.time, props.selected, props.weather ?? "sunny");
  });
  createEffect(() => yard()?.setSpin(spin()));

  return (
    <div
      class="yard3d"
      ref={box}
      onPointerDown={() => setMoved(true)}
      onDragOver={(e) => {
        if (e.dataTransfer?.types.includes("text/plant")) e.preventDefault();
      }}
      onDrop={(e) => {
        const id = e.dataTransfer?.getData("text/plant");
        const at = id && yard()?.groundAt(e.clientX, e.clientY);
        if (!id || !at) return;
        e.preventDefault();
        props.onDropPlant(id, at);
      }}
    >
      <Show when={failed()}>
        <p class="yard3d-failed">{failed()}</p>
      </Show>
      <Show when={!yard() && !failed()}>
        <p class="yard3d-loading">Loading the 3D yard…</p>
      </Show>
      <Show when={tip()}>
        {(t) => (
          <p class="yard3d-tip" style={{ transform: `translate(${t().x + 14}px, ${t().y + 12}px)` }}>
            {t().text}
          </p>
        )}
      </Show>
      <div class="yard3d-views" role="radiogroup" aria-label="Camera">
        <For each={VIEWS}>
          {(v) => (
            <button
              type="button"
              role="radio"
              aria-checked={view() === v.id}
              title={v.title}
              onClick={() => {
                setView(v.id);
                yard()?.setView(v.id);
              }}
            >
              {v.name}
            </button>
          )}
        </For>
      </div>
      <div class="yard3d-controls">
        <button type="button" aria-pressed={spin()} onClick={() => setSpin(!spin())} title="Turn slowly all the way around">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M13 8a5 5 0 11-1.6-3.7M13 2.5v2.8h-2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {spin() ? "Stop spinning" : "Spin 360°"}
        </button>
      </div>
      <p class="yard3d-hint" classList={{ used: moved() }}>Drag to turn · Scroll or pinch to get closer · Right-drag or Shift-drag to move</p>
      {props.children}
    </div>
  );
}
