import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import type { Point, Property } from "../model/property";
import type { ViewTime } from "../render/look";
import type { Pick } from "../render/yard3d";

type Yard = ReturnType<typeof import("../render/yard3d").createYard>;

type Props = {
  property: Property;
  time: ViewTime;
  selected: Pick | null;
  onPick: (ref: Pick | null) => void;
  onDropPlant: (plantId: string, at: Point) => void;
  children?: JSX.Element;
};

// The 3D yard. three.js loads only when this view is first shown, so the plan alone stays light.
export function YardView3D(props: Props) {
  let box!: HTMLDivElement;
  const [yard, setYard] = createSignal<Yard>();
  const [spin, setSpin] = createSignal(false);
  const [failed, setFailed] = createSignal("");
  const [moved, setMoved] = createSignal(false);

  onMount(async () => {
    try {
      const { createYard } = await import("../render/yard3d");
      const y = createYard(box, { onPick: (ref) => props.onPick(ref) });
      setYard(y);
      onCleanup(() => y.dispose());
    } catch {
      setFailed("The 3D view can't start in this browser. The 2D plan still has everything; try another browser to see 3D.");
    }
  });

  createEffect(() => {
    const y = yard();
    if (y) y.update(props.property, props.time, props.selected);
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
      <div class="yard3d-controls">
        <button type="button" aria-pressed={spin()} onClick={() => setSpin(!spin())} title="Turn slowly all the way around">
          <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
            <path d="M13 8a5 5 0 11-1.6-3.7M13 2.5v2.8h-2.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {spin() ? "Stop spinning" : "Spin 360°"}
        </button>
        <button type="button" onClick={() => yard()?.resetView()} title="Back to the starting view">
          Reset view
        </button>
      </div>
      <p class="yard3d-hint" classList={{ used: moved() }}>Drag to turn · Scroll or pinch to get closer · Right-drag or Shift-drag to move</p>
      {props.children}
    </div>
  );
}
