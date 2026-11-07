import { createEffect, createMemo, createSignal, For, Match, Show, Switch } from "solid-js";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import type { Property } from "../model/property";
import { bounds } from "../render/geometry";
import type { ViewTime } from "../render/look";
import { paint } from "../render/paint";
import { DEMO_ID, type GalleryGarden } from "./community";
import { CommunityStats, GardenView, RateAndSave } from "./GardenView";
import { averageStars, bestGardens, rankGardens, RATINGS_TO_RANK } from "./rank";
import type { GalleryStore, LocalStore, SavedCopy } from "./store";
import { THUMB_TIME } from "./thumbs";
import { Wall } from "./Wall";

export type GalleryTab = "best" | "new" | "mine";

type Props = {
  store: GalleryStore;
  time: ViewTime;
  tab: GalleryTab;
  gardenId: string | null;
  onTab: (t: GalleryTab) => void;
  onOpenGarden: (id: string | null) => void;
  // Your own designs, and opening a saved garden as your own copy in the designer.
  designs: Property[];
  onEditCopy: (copy: SavedCopy) => void;
};

export function GalleryBar(props: { tab: GalleryTab; onTab: (t: GalleryTab) => void; store: GalleryStore; demo?: LocalStore; time: ViewTime; onTime: (t: ViewTime) => void }) {
  const newCount = () => props.store.gardens().filter((g) => g.stars.count < RATINGS_TO_RANK && !props.store.isMine(g.id)).length;
  const tabs = () => [
    { id: "best" as const, name: "Best", note: "Top 10 by stars and saves" },
    { id: "new" as const, name: "New", note: `${newCount()} waiting for ratings` },
    { id: "mine" as const, name: "Mine", note: `${props.store.saved().length} saved` },
  ];
  return (
    <nav class="gallery-bar" aria-label="Gallery">
      <div class="tabs" role="tablist">
        <For each={tabs()}>
          {(t) => (
            <button type="button" role="tab" aria-selected={props.tab === t.id} onClick={() => props.onTab(t.id)}>
              {t.name}
              <span class="tab-note">{t.note}</span>
            </button>
          )}
        </For>
      </div>
      <Show when={props.demo}>{(s) => <DemoBar store={s()} onTab={props.onTab} />}</Show>
      <div class="gallery-time" title="The season and year for the garden you open">
        <TimeBar part="season" time={props.time} onChange={props.onTime} />
        <TimeBar part="year" time={props.time} onChange={props.onTime} />
      </div>
    </nav>
  );
}

// Demo only (?demo=1): follow one new garden from New into Best.
function DemoBar(props: { store: LocalStore; onTab: (t: GalleryTab) => void }) {
  const g = () => props.store.gardens().find((x) => x.id === DEMO_ID);
  const rank = () => {
    const gs = props.store.gardens().filter((x) => x.stars.count >= RATINGS_TO_RANK);
    const i = rankGardens(gs).findIndex((x) => x.id === DEMO_ID);
    return i < 0 ? null : i + 1;
  };
  const status = () => {
    const x = g();
    if (!x) return "";
    if (x.stars.count < RATINGS_TO_RANK) return `In New: needs ${RATINGS_TO_RANK - x.stars.count} more ${RATINGS_TO_RANK - x.stars.count === 1 ? "rating" : "ratings"} to rank`;
    const r = rank()!;
    return r <= 10 ? `On Best at #${r}` : `Ranked #${r}: not in the top 10 yet`;
  };
  return (
    <Show when={g()}>
      {(x) => (
        <div class="demo-bar" role="status">
          <span class="demo-tag">Demo</span>
          <span>
            <strong>{x().title}</strong> · ★ {averageStars(x()).toFixed(1)} from {x().stars.count} · {x().saves} saves · {status()}
          </span>
          <button type="button" onClick={() => props.store.simulate(DEMO_ID, { sum: 294, count: 30, saves: 140 })} title="Add 30 ratings averaging 9.8 stars and 140 saves from made-up neighbors">
            Simulate 30 neighbors
          </button>
          <button type="button" class="link-btn muted" onClick={() => props.store.resetDemo(DEMO_ID)}>
            Reset demo
          </button>
        </div>
      )}
    </Show>
  );
}

export function Gallery(props: Props) {
  const gardens = createMemo(() => props.store.gardens());
  const ranked = createMemo(() => bestGardens(gardens()));
  const byId = createMemo(() => new Map(gardens().map((g) => [g.id, g])));
  const open = () => (props.gardenId ? byId().get(props.gardenId) ?? null : null);
  // The top 10 refresh whenever you look at Best, so a garden you just rated can join it,
  // but they don't reshuffle while you're inside one of them.
  const [wallGardens, setWallGardens] = createSignal<GalleryGarden[]>([]);
  createEffect(() => {
    if (props.tab === "best" && !props.gardenId) setWallGardens(ranked());
  });
  const wallItems = createMemo(() => wallGardens().map((g) => byId().get(g.id) ?? g));

  return (
    <div class="gallery-main">
      <Show when={wallGardens().length}>
        <Wall gardens={wallItems()} onOpen={(g) => props.onOpenGarden(g.id)} hidden={props.tab !== "best" || !!open()} />
      </Show>
      <Switch>
        <Match when={open()}>
          {(g) => (
            <GardenView
              garden={g()}
              store={props.store}
              time={props.time}
              onBack={() => props.onOpenGarden(null)}
              onOpenGarden={(id) => props.onOpenGarden(id)}
              backLabel={props.tab === "best" ? "Back to the wall" : props.tab === "new" ? "Back to New" : "Back to Mine"}
            />
          )}
        </Match>
        <Match when={props.tab === "new"}>
          <NewGardens store={props.store} gardens={gardens()} time={props.time} onOpen={(id) => props.onOpenGarden(id)} />
        </Match>
        <Match when={props.tab === "mine"}>
          <Mine store={props.store} designs={props.designs} onOpen={(id) => props.onOpenGarden(id)} onEditCopy={props.onEditCopy} />
        </Match>
      </Switch>
    </div>
  );
}

// New public gardens, a few at a time: look, give stars, and decide whether to save.
function NewGardens(props: { store: GalleryStore; gardens: GalleryGarden[]; time: ViewTime; onOpen: (id: string) => void }) {
  // Newest first; the list is fixed for the visit so rated gardens don't jump away mid-review.
  const [queue] = createSignal(
    props.gardens
      .filter((g) => g.stars.count < RATINGS_TO_RANK && !props.store.isMine(g.id))
      .sort((a, b) => a.ageDays - b.ageDays)
      .map((g) => g.id),
  );
  const [i, setI] = createSignal(0);
  const byId = createMemo(() => new Map(props.gardens.map((g) => [g.id, g])));
  const current = () => byId().get(queue()[i()]);
  const rated = () => queue().filter((id) => props.store.myRating(id) != null).length;
  const go = (d: number) => setI(Math.min(queue().length - 1, Math.max(0, i() + d)));

  return (
    <div class="new-gardens">
      <Show when={current()} fallback={<p class="empty-state">No new gardens right now. Check back soon.</p>}>
        {(g) => (
          <>
            <aside class="garden-side">
              <header>
                <span class="eyebrow">
                  New garden {i() + 1} of {queue().length} · you've rated {rated()}
                </span>
                <h2>{g().title}</h2>
                <span class="byline">
                  by {g().owner} · published {g().ageDays === 0 ? "today" : `${g().ageDays} ${g().ageDays === 1 ? "day" : "days"} ago`}
                </span>
              </header>
              <CommunityStats garden={g()} />
              <RateAndSave store={props.store} garden={g()} />
              <div class="new-nav">
                <button type="button" onClick={() => go(-1)} disabled={i() === 0}>
                  ← Previous
                </button>
                <button type="button" class="primary" onClick={() => go(1)} disabled={i() >= queue().length - 1}>
                  Next garden →
                </button>
              </div>
              <button type="button" class="link-btn" onClick={() => props.onOpen(g().id)}>
                Open with its plant list
              </button>
            </aside>
            <div class="plan-wrap">
              <PlanView property={g().property} time={props.time} />
            </div>
          </>
        )}
      </Show>
    </div>
  );
}

// Your personal gallery: your own designs, each with a Public switch, and the gardens you saved.
function Mine(props: { store: GalleryStore; designs: Property[]; onOpen: (id: string) => void; onEditCopy: (c: SavedCopy) => void }) {
  return (
    <div class="mine">
      <section>
        <h2>Your designs</h2>
        <p class="section-note">Private until you turn Public on. The gallery never shows your address or aerial photo.</p>
        <ul class="saved-grid">
          <For each={props.designs}>{(d) => <DesignCard design={d} store={props.store} onOpen={props.onOpen} />}</For>
        </ul>
      </section>
      <section>
        <h2>Saved gardens</h2>
        <p class="section-note">Copies of public gardens you saved. They stay here even if the owner changes or hides the original.</p>
        <Show when={props.store.saved().length} fallback={<p class="empty-state">Nothing saved yet. Flip Save to Yes on any garden in Best or New.</p>}>
          <ul class="saved-grid">
            <For each={props.store.saved()}>{(c) => <SavedCard copy={c} store={props.store} onOpen={props.onOpen} onEdit={() => props.onEditCopy(c)} />}</For>
          </ul>
        </Show>
      </section>
    </div>
  );
}

function DesignCard(props: { design: Property; store: GalleryStore; onOpen: (id: string) => void }) {
  const isPublic = () => props.store.isPublic(props.design.id);
  const based = () => props.store.copiedFrom(props.design.id);
  return (
    <li class="saved-card">
      <div class="saved-open static">
        <GardenThumb property={props.design} size={176} />
        <span class="saved-title">{props.design.name}</span>
        <span class="saved-meta">
          {isPublic() ? "Public: in the gallery" : "Private: only you"}
          <Show when={based()}>{(b) => <> · based on {b().title}</>}</Show>
        </span>
      </div>
      <div class="card-actions">
        <label class="save-switch">
          <span class="switch-row">
            <input
              type="checkbox"
              role="switch"
              checked={isPublic()}
              onChange={(e) => (e.currentTarget.checked ? props.store.publish(props.design) : props.store.unpublish(props.design.id))}
            />
            <span class="switch" aria-hidden="true" />
            <span>Public</span>
          </span>
        </label>
        <Show when={isPublic()}>
          <button type="button" class="link-btn" onClick={() => props.onOpen(props.store.publicIdOf(props.design.id))}>
            See it in the gallery
          </button>
        </Show>
      </div>
    </li>
  );
}

function SavedCard(props: { copy: SavedCopy; store: GalleryStore; onOpen: (id: string) => void; onEdit: () => void }) {
  // The original may be gone if its owner turned Public off; your copy stays either way.
  const original = () => props.store.gardens().some((g) => g.id === props.copy.from.id);
  return (
    <li class="saved-card">
      <div class="saved-open static">
        <GardenThumb property={props.copy.property} size={176} />
        <span class="saved-title">{props.copy.from.title}</span>
        <span class="saved-meta">
          by {props.copy.from.owner} · saved {new Date(props.copy.savedAt).toLocaleDateString()}
          <Show when={!original()}> · no longer public</Show>
        </span>
      </div>
      <div class="card-actions">
        <button type="button" class="primary" onClick={props.onEdit} title="Open your own copy in the designer to change it">
          Edit my copy
        </button>
        <Show when={original()}>
          <button type="button" class="link-btn" onClick={() => props.onOpen(props.copy.from.id)}>
            View original
          </button>
        </Show>
        <button type="button" class="link-btn muted" onClick={() => props.store.setSaved(props.copy.from.id, false)}>
          Remove
        </button>
      </div>
    </li>
  );
}

export function GardenThumb(props: { property: Property; size: number }) {
  let canvas!: HTMLCanvasElement;
  createEffect(() => {
    const dpr = window.devicePixelRatio || 1;
    const s = props.size;
    canvas.width = canvas.height = Math.round(s * dpr);
    const lot = bounds(props.property.lot.outline);
    const scale = Math.min((s * 0.94) / lot.w, (s * 0.94) / lot.h);
    paint(canvas, props.property, THUMB_TIME, { scale, offX: (s - lot.w * scale) / 2 - lot.minX * scale, offY: (s - lot.h * scale) / 2 - lot.minY * scale });
  });
  return <canvas ref={canvas} class="garden-thumb" style={{ width: `${props.size}px`, height: `${props.size}px` }} aria-hidden="true" />;
}
