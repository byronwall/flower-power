import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { plants, plantsById } from "../model/library";
import type { Plant } from "../model/plant";

type M = ReturnType<typeof import("../render/mascot3d").createMascot>;

// Sprout, the app's mascot: a potted plant from the database with googly eyes.
// Click (or press Enter) and it hops and comes back as another plant.
export function Mascot(props: { size: number; plantId?: string; caption?: boolean; class?: string }) {
  let gl!: HTMLSpanElement;
  let m: M | undefined;
  const [plant, setPlant] = createSignal<Plant>();
  const [ready, setReady] = createSignal(false);

  const another = (not?: string) => {
    // Sprout never dresses up as an invasive plant.
    const pool = plants.filter((p) => p.id !== not && !p.indianaStatus?.startsWith("invasive"));
    return pool[Math.floor(Math.random() * pool.length)];
  };

  onMount(async () => {
    const first = (props.plantId && plantsById.get(props.plantId)) || another();
    try {
      const { createMascot } = await import("../render/mascot3d");
      m = createMascot(gl, first);
      setPlant(first);
      setReady(true);
    } catch {
      // No WebGL: the fallback flower stays.
    }
    onCleanup(() => m?.dispose());
  });

  const swap = () => {
    if (!m) return;
    const next = another(plant()?.id);
    m.swapTo(next);
    // The name changes when it lands back in the pot.
    setTimeout(() => setPlant(next), 380);
  };

  return (
    <div class={`mascot ${props.class ?? ""}`}>
      <button
        type="button"
        class="mascot-stage"
        style={{ width: `${props.size}px`, height: `${props.size}px` }}
        onClick={swap}
        aria-label={plant() ? `Sprout the mascot, dressed as ${plant()!.commonName}. Click for another plant.` : "Sprout the mascot"}
        title={plant() ? `${plant()!.commonName} says hi! Click me.` : undefined}
      >
        {/* three.js owns this element's contents. */}
        <span class="mascot-gl" ref={gl} />
        <Show when={!ready()}>
          <span class="mascot-fallback" aria-hidden="true" style={{ "font-size": `${Math.round(props.size * 0.42)}px` }}>
            🌼
          </span>
        </Show>
      </button>
      <Show when={props.caption && plant()}>
        {(p) => (
          <p class="mascot-caption">
            Hi! Today I'm {/^[aeiou]/i.test(p().commonName) ? "an" : "a"} <strong>{p().commonName.toLowerCase()}</strong>.
            <span>Click me to try on another plant.</span>
          </p>
        )}
      </Show>
    </div>
  );
}
