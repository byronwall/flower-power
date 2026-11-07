import { createMemo, createSignal, For, Show } from "solid-js";
import { PlanView } from "../components/PlanView";
import { label, PlantFacts } from "../editor/Inspector";
import { plantsById } from "../model/library";
import type { Plant } from "../model/plant";
import type { Property } from "../model/property";
import type { ViewTime } from "../render/look";
import type { GalleryGarden } from "./community";
import { PlantPicture } from "./PlantPicture";
import { averageStars, RATINGS_TO_RANK } from "./rank";
import type { GalleryStore } from "./store";

// One public garden, view only: the full plan as the designer draws it, with no edit tools.
export function GardenView(props: { garden: GalleryGarden; store: GalleryStore; time: ViewTime; onBack: () => void; backLabel: string; onOpenGarden: (id: string) => void }) {
  const g = () => props.garden;
  return (
    <div class="garden-view">
      <aside class="garden-side">
        <button type="button" class="back" onClick={props.onBack}>
          ← {props.backLabel}
        </button>
        <header>
          <span class="eyebrow">View only</span>
          <h2>{g().title}</h2>
          <span class="byline">
            by {g().owner}
            <Show when={g().basedOn}>
              {(b) => (
                <>
                  {" · based on "}
                  <Show when={props.store.gardens().some((x) => x.id === b().id)} fallback={b().title}>
                    <button type="button" class="link-btn inline" onClick={() => props.onOpenGarden(b().id)}>
                      {b().title}
                    </button>
                  </Show>
                </>
              )}
            </Show>
          </span>
        </header>
        <CommunityStats garden={g()} />
        <Show when={!props.store.isMine(g().id)} fallback={<p class="garden-note own">This is your garden. Other people rate and save it here.</p>}>
          <RateAndSave store={props.store} garden={g()} />
        </Show>
        <PlantList property={g().property} time={props.time} />
        <Show when={!props.store.isMine(g().id)}>
          <p class="garden-note">To change this garden, save it, then choose Edit my copy in Mine.</p>
        </Show>
      </aside>
      <div class="plan-wrap">
        <PlanView property={g().property} time={props.time} />
      </div>
    </div>
  );
}

export function CommunityStats(props: { garden: GalleryGarden }) {
  return (
    <dl class="stats">
      <div>
        <dt>Stars</dt>
        <dd>
          <Show when={props.garden.stars.count} fallback="No ratings yet">
            <strong>★ {averageStars(props.garden).toFixed(1)}</strong> <span>from {props.garden.stars.count}</span>
          </Show>
        </dd>
      </div>
      <div>
        <dt>Saves</dt>
        <dd>
          <strong>{props.garden.saves}</strong>
        </dd>
      </div>
      <Show when={props.garden.stars.count < RATINGS_TO_RANK}>
        <p class="stats-note">New: needs {RATINGS_TO_RANK - props.garden.stars.count} more ratings to rank on Best.</p>
      </Show>
    </dl>
  );
}

// Stars from 1 to 10 and a Save yes/no switch. Used in the garden view and the New tab.
export function RateAndSave(props: { store: GalleryStore; garden: GalleryGarden }) {
  const mine = () => props.store.myRating(props.garden.id);
  const [hover, setHover] = createSignal<number | null>(null);
  const shown = () => hover() ?? mine() ?? 0;
  const saved = () => props.store.isSaved(props.garden.id);
  return (
    <div class="rate-save">
      <div class="rate">
        <span class="field-label">Your rating</span>
        <div class="stars" role="radiogroup" aria-label="Your rating, 1 to 10 stars" onPointerLeave={() => setHover(null)}>
          <For each={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}>
            {(n) => (
              <button
                type="button"
                role="radio"
                aria-checked={mine() === n}
                aria-label={`${n} of 10`}
                classList={{ on: n <= shown() }}
                onPointerEnter={() => setHover(n)}
                onClick={() => props.store.rate(props.garden.id, n)}
              >
                ★
              </button>
            )}
          </For>
          <span class="stars-value">{shown() ? `${shown()}/10` : "Not rated"}</span>
        </div>
      </div>
      <label class="save-switch">
        <span class="field-label">Save to Mine</span>
        <span class="switch-row">
          <input type="checkbox" role="switch" checked={saved()} onChange={(e) => props.store.setSaved(props.garden.id, e.currentTarget.checked)} />
          <span class="switch" aria-hidden="true" />
          <span>{saved() ? "Yes, saved" : "No"}</span>
        </span>
      </label>
    </div>
  );
}

function PlantList(props: { property: Property; time: ViewTime }) {
  const [open, setOpen] = createSignal<string | null>(null);
  // Each plant once, with how many plantings use it, biggest plants first.
  const list = createMemo(() => {
    const counts = new Map<string, number>();
    for (const p of props.property.plantings) counts.set(p.plantId, (counts.get(p.plantId) ?? 0) + 1);
    return [...counts.entries()]
      .map(([id, n]) => ({ plant: plantsById.get(id), n }))
      .filter((x): x is { plant: Plant; n: number } => !!x.plant)
      .sort((a, b) => b.plant.size.heightFt - a.plant.size.heightFt);
  });
  return (
    <section class="garden-plants">
      <span class="field-label">Plants in this garden · {list().length}</span>
      <ul>
        <For each={list()}>
          {(x) => (
            <li classList={{ open: open() === x.plant.id }}>
              <button type="button" onClick={() => setOpen(open() === x.plant.id ? null : x.plant.id)} aria-expanded={open() === x.plant.id}>
                <PlantPicture plant={x.plant} time={props.time} size={36} best />
                <span class="plant-name">
                  <strong>{x.plant.commonName}</strong>
                  <span>
                    {label(x.plant.category)} · {x.n} {x.n === 1 ? "planting" : "plantings"}
                  </span>
                </span>
              </button>
              <Show when={open() === x.plant.id}>
                <PlantFacts plant={x.plant} />
              </Show>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
