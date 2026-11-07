import { createSignal, Show } from "solid-js";
import type { Plant } from "../model/plant";
import type { ViewTime } from "../render/look";
import { PlantPicture } from "./PlantPicture";

export const photoOf = (plant: Plant) => plant.images?.photos[0];

// The plant's real photo. Falls back to the plan drawing when the plant has no photo
// or the photo does not load, so a broken link never leaves an empty box.
export function PlantPhoto(props: { plant: Plant; time: ViewTime; size: number; class?: string; drawingClass?: string }) {
  const [failed, setFailed] = createSignal<string>();
  const photo = () => {
    const p = photoOf(props.plant);
    return p && p.url !== failed() ? p : undefined;
  };
  return (
    <Show when={photo()} keyed fallback={<PlantPicture plant={props.plant} time={props.time} size={props.size} class={props.drawingClass} />}>
      {(p) => (
        <img
          class={props.class ?? "thumb photo"}
          src={p.url}
          alt={props.plant.commonName}
          title={`Photo: ${p.author}, ${p.license}`}
          width={props.size}
          height={props.size}
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(p.url)}
        />
      )}
    </Show>
  );
}
