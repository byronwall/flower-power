import { createSignal, For, Show } from "solid-js";
import { plants } from "../model/library";
import type { Dial, Goals, Op } from "../model/design";
import type { Point, Property } from "../model/property";
import { centroid } from "../render/geometry";
import type { ViewTime } from "../render/look";
import type { Editor } from "../editor/state";
import { fetchDesigns, fetchReview, type Designs, type Style } from "./designs";
import { opLabel, opTone } from "./Ghost";
import { Thumb } from "./Thumb";

// The design ideas panel: goals, the change dial, a review of the yard, design cards, and the ops to accept.

const CHIPS: { group: string; items: string[] }[] = [
  { group: "Feel", items: ["calm", "cheerful", "romantic", "wild", "tidy"] },
  { group: "Colors", items: ["blue", "purple", "white", "pink", "yellow", "orange", "red"] },
  { group: "Wildlife", items: ["songbirds", "butterflies", "pollinators", "hummingbirds", "native plants"] },
  { group: "Safety", items: ["safe for kids", "safe for dogs", "low effort"] },
];
const STYLES: { id: Style; name: string }[] = [
  { id: "cottage", name: "Cottage" },
  { id: "prairie", name: "Prairie" },
  { id: "modern", name: "Modern" },
  { id: "formal", name: "Formal" },
  { id: "woodland", name: "Woodland" },
];
const DIALS: { id: Dial; name: string; hint: string }[] = [
  { id: "light", name: "Light touch", hint: "Keep everything. Add to empty ground." },
  { id: "refresh", name: "Refresh", hint: "Keep trees. Replace up to 40% of plantings." },
  { id: "redo", name: "Redo", hint: "Start fresh on plantings. Keep hardscape." },
];

type Props = {
  editor: Editor;
  designs: Designs;
  time: ViewTime;
  scope: Point[] | null;
  picking: boolean;
  onPickArea: (on: boolean) => void;
  onScope: (scope: Point[] | null) => void;
  hover: Op | null;
  onHover: (op: Op | null) => void;
  onClose: () => void;
};

export function DesignPanel(props: Props) {
  const ds = props.designs;
  const first = ds.designs()[0]?.goals;
  const [text, setText] = createSignal(first?.text ?? "");
  const [chips, setChips] = createSignal<string[]>(first?.chips ?? []);
  const [favorites, setFavorites] = createSignal<string[]>(first?.favorites ?? []);
  const [hardscape, setHardscape] = createSignal(first?.hardscape ?? false);
  const [dial, setDial] = createSignal<Dial>(ds.active()?.dial ?? "refresh");
  const [styles, setStyles] = createSignal<Style[]>(["cottage", "prairie", "modern", "formal"]);
  const [busy, setBusy] = createSignal("");
  const [error, setError] = createSignal("");
  const goals = (): Goals => ({ text: text(), chips: chips(), favorites: favorites(), hardscape: hardscape() });
  const toggle = <T,>(list: T[], x: T) => (list.includes(x) ? list.filter((y) => y !== x) : [...list, x]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }

  const reviewYard = () => run("Reading your yard…", async () => void ds.setReview(await fetchReview(ds.base(), goals())));
  const makeDesigns = () => run(`Drawing ${styles().length} designs…`, async () => {
    ds.addDesigns(await fetchDesigns(ds.base(), goals(), dial(), styles()));
    cards.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  // Area rework starts from the plan on screen, so it builds on the active design.
  const rework = () =>
    run("Reworking the area…", async () => {
      const onTopOf = ds.active();
      ds.commit();
      const made = await fetchDesigns(props.editor.property(), goals(), dial(), styles().slice(0, 3), props.scope!);
      ds.addDesigns(made.map((d) => ({ ...d, name: `${d.name} (area)` })), onTopOf);
      props.onScope(null);
    });

  // The selected bed, as a box with a little room around it.
  const selectedBed = () => {
    const ref = props.editor.selected();
    if (!ref || ref.col !== "plantings") return null;
    const item = props.editor.property().plantings.find((x) => x.id === ref.id);
    if (!item || item.type === "single") return null;
    const pts = item.type === "region" ? item.outline : item.path;
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const [x0, y0, x1, y1] = [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3];
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as Point[];
  };

  const pending = () => ds.active()?.pending ?? [];
  let cards!: HTMLElement;

  return (
    <aside class="inspector design-panel" aria-label="Design ideas">
      <header>
        <span class="eyebrow">Design ideas</span>
        <h2>What do you want from your yard?</h2>
        <button type="button" class="close icon-btn" onClick={props.onClose} aria-label="Close design ideas" title="Close">
          ×
        </button>
      </header>

      <details class="dp-fold" open={!ds.designs().length}>
        <summary>Goals and style</summary>
      <section class="dp-goals">
        <textarea rows="2" placeholder="A shady place to read, color all summer, room for the kids to run…" value={text()} onInput={(e) => setText(e.currentTarget.value)} aria-label="Goals in your words" />
        <For each={CHIPS}>
          {(g) => (
            <div class="dp-chips" role="group" aria-label={g.group}>
              <span class="dp-group">{g.group}</span>
              <For each={g.items}>
                {(c) => (
                  <button type="button" class="chip" aria-pressed={chips().includes(c)} onClick={() => setChips(toggle(chips(), c))}>
                    {c}
                  </button>
                )}
              </For>
            </div>
          )}
        </For>
        <div class="dp-chips" role="group" aria-label="Favorite plants">
          <span class="dp-group">Favorites</span>
          <For each={favorites()}>
            {(id) => (
              <button type="button" class="chip" aria-pressed="true" onClick={() => setFavorites(toggle(favorites(), id))} title="Remove">
                {plants.find((p) => p.id === id)?.commonName ?? id} ×
              </button>
            )}
          </For>
          <select
            class="dp-fav"
            value=""
            aria-label="Add a favorite plant"
            onChange={(e) => {
              if (e.currentTarget.value) setFavorites(toggle(favorites(), e.currentTarget.value));
              e.currentTarget.value = "";
            }}
          >
            <option value="">+ plant</option>
            <For each={plants}>{(p) => <option value={p.id}>{p.commonName}</option>}</For>
          </select>
        </div>
        <label class="check">
          <input type="checkbox" checked={hardscape()} onChange={(e) => setHardscape(e.currentTarget.checked)} />
          Open to a new patio, path, or pergola
        </label>
      </section>
      </details>

      <section>
        <div class="dp-dial" role="radiogroup" aria-label="How much to change">
          <For each={DIALS}>
            {(d) => (
              <button type="button" role="radio" aria-checked={dial() === d.id} onClick={() => setDial(d.id)} title={d.hint}>
                {d.name}
              </button>
            )}
          </For>
        </div>
        <p class="hint-line">{DIALS.find((d) => d.id === dial())!.hint}</p>
        <div class="dp-chips" role="group" aria-label="Styles">
          <span class="dp-group">Styles</span>
          <For each={STYLES}>
            {(s) => (
              <button type="button" class="chip" aria-pressed={styles().includes(s.id)} onClick={() => setStyles(toggle(styles(), s.id))}>
                {s.name}
              </button>
            )}
          </For>
        </div>
        <div class="dp-actions">
          <button type="button" disabled={!!busy()} onClick={reviewYard}>
            Review my yard
          </button>
          <button type="button" class="primary" disabled={!!busy() || !styles().length} onClick={makeDesigns}>
            Make designs
          </button>
        </div>
      <Show when={busy()}>
          <p class="dp-busy" role="status">
            {busy()}
          </p>
        </Show>
        <Show when={error()}>
          <p class="dev-error" role="alert">
            {error()}
          </p>
        </Show>
      </section>

      <Show when={ds.review()}>
        {(rv) => (
          <details class="dp-fold dp-review" open={!ds.designs().length}>
            <summary>Your yard today</summary>
            <p>{rv().summary}</p>
            <Spots title="Works" list={rv().works} />
            <Spots title="Doesn't" list={rv().doesnt} />
            <Spots title="Empty spots (numbered on the plan)" list={rv().empty} />
          </details>
        )}
      </Show>

      <section ref={cards}>
        <h3>Designs</h3>
        <div class="dp-cards">
          <Card name="As it is" sub="Your yard today" on={!ds.activeId()} property={ds.base()} time={props.time} onPick={() => ds.activate(undefined)} />
          <For each={ds.designs()}>
            {(d) => (
              <Card
                name={d.name}
                sub={`${d.style} · ${d.dial}${d.pending?.length ? ` · ${d.pending.length} to review` : ""}`}
                on={ds.activeId() === d.id}
                property={ds.preview(d)}
                time={props.time}
                onPick={() => ds.activate(d.id)}
                onRemove={() => ds.removeDesign(d.id)}
              />
            )}
          </For>
        </div>
      </section>

      <Show when={ds.active()}>
        {(a) => (
          <section class="dp-ops">
            <h3>{a().name}</h3>
            <p class="muted">{a().summary}</p>
            <Show when={pending().length} fallback={<p class="hint-line">{a().ops.length} changes in this design. Edits you make now save to it.</p>}>
              <div class="dp-actions">
                <button type="button" class="primary" onClick={() => ds.accept(pending())}>
                  Accept all {pending().length}
                </button>
                <button type="button" onClick={() => ds.reject(pending())}>
                  Reject all
                </button>
              </div>
              <ul class="dp-oplist">
                <For each={pending()}>
                  {(o) => (
                    <li classList={{ on: props.hover === o }} onMouseEnter={() => props.onHover(o)} onMouseLeave={() => props.onHover(null)}>
                      <span class={`dd-tag ${opTone(o.op)}`}>{o.op === "addFeature" ? "add" : o.op}</span>
                      <span class="dp-op-text">
                        <b>{opLabel(props.editor.property(), o)}</b> <span class="muted">{o.reason}</span>
                      </span>
                      <span class="dp-op-btns">
                        <button type="button" class="icon-btn" aria-label={`Accept ${o.op} ${opLabel(props.editor.property(), o)}`} title="Accept" onClick={() => ds.accept([o])}>
                          ✓
                        </button>
                        <button type="button" class="icon-btn" aria-label={`Reject ${o.op} ${opLabel(props.editor.property(), o)}`} title="Reject" onClick={() => ds.reject([o])}>
                          ✕
                        </button>
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
            <Show when={a().dropped?.length}>
              <details class="dp-dropped">
                <summary>{a().dropped!.length} ideas did not fit and were left out</summary>
                <ul>
                  <For each={a().dropped}>{(x) => <li>{x}</li>}</For>
                </ul>
              </details>
            </Show>
          </section>
        )}
      </Show>

      <section class="dp-area">
        <h3>Rework one area</h3>
        <Show
          when={props.scope}
          fallback={
            <div class="dp-actions">
              <button type="button" aria-pressed={props.picking} onClick={() => props.onPickArea(!props.picking)}>
                {props.picking ? "Drag a box on the plan…" : "Select an area"}
              </button>
              <Show when={selectedBed()}>
                {(b) => (
                  <button type="button" onClick={() => props.onScope(b())}>
                    Use the selected bed
                  </button>
                )}
              </Show>
            </div>
          }
        >
          {(s) => (
            <div class="dp-actions">
              <span class="muted">Area near {centroid(s()).map(Math.round).join(", ")} ft</span>
              <button type="button" class="primary" disabled={!!busy()} onClick={rework}>
                Rework this area
              </button>
              <button type="button" onClick={() => props.onScope(null)}>
                Clear
              </button>
            </div>
          )}
        </Show>
      </section>
    </aside>
  );
}

function Spots(props: { title: string; list: { note: string }[] }) {
  return (
    <Show when={props.list.length}>
      <h4>{props.title}</h4>
      <ul>
        <For each={props.list}>{(x) => <li>{x.note}</li>}</For>
      </ul>
    </Show>
  );
}

function Card(props: { name: string; sub: string; on: boolean; property: Property; time: ViewTime; onPick: () => void; onRemove?: () => void }) {
  return (
    <div class="dp-card" classList={{ on: props.on }}>
      <button type="button" class="dp-card-main" aria-pressed={props.on} onClick={props.onPick} title={`Show ${props.name}`}>
        <Thumb property={props.property} time={props.time} width={132} height={150} />
        <span class="dp-card-name">{props.name}</span>
        <span class="dp-card-sub">{props.sub}</span>
      </button>
      <Show when={props.onRemove}>
        <button type="button" class="dp-card-x icon-btn" aria-label={`Delete ${props.name}`} title="Delete this design" onClick={props.onRemove}>
          ×
        </button>
      </Show>
    </div>
  );
}
