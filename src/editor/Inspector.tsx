import { createSignal, For, Show, type JSX } from "solid-js";
import { plants, plantsById } from "../model/library";
import { edgeKinds, featureKinds, fenceKinds, structureKinds, surfaceKinds, type Property } from "../model/property";
import { itemOf, type Editor, type Ref } from "./state";
import { crowding } from "./spacing";
import { Mascot } from "../components/Mascot";
import { TourReel } from "../components/Tour";
import { PlantPicture } from "../gallery/PlantPicture";
import type { Plant } from "../model/plant";
import { monthNames, type ViewTime } from "../render/look";
import { captionOf } from "../render/portrait";

const KINDS: Partial<Record<Ref["col"], readonly string[]>> = {
  surfaces: surfaceKinds,
  structures: structureKinds,
  edges: edgeKinds,
  fences: fenceKinds,
  features: featureKinds,
};

const NAMES: Record<Ref["col"], string> = {
  house: "House",
  surfaces: "Surface",
  structures: "Structure",
  edges: "Edge",
  fences: "Fence",
  features: "Feature",
  plantings: "Planting",
};

export const label = (s: string) => s.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());

type InspectorProps = {
  editor: Editor;
  time: ViewTime;
  // A plant clicked in the gallery, shown when nothing on the plan is selected.
  preview?: string | null;
  onClosePreview?: () => void;
  onPreview?: (id: string) => void;
  onTour?: () => void;
  extra?: (ref: Ref) => JSX.Element;
};

export function Inspector(props: InspectorProps) {
  const ed = props.editor;
  const current = () => {
    const ref = ed.selected();
    const item = ref && itemOf(ed.property(), ref);
    return ref && item ? { ref, item: item as any } : null;
  };
  const set = (field: string, value: unknown) => {
    const c = current();
    if (c) ed.updateItem(c.ref, (x) => ({ ...x, [field]: value }));
  };

  return (
    <aside class="inspector">
      <Show
        when={current()}
        fallback={
          <Show when={props.preview ? plantsById.get(props.preview) : undefined} fallback={<GettingStarted onTour={props.onTour} />}>
            {(p) => <PlantPreview plant={p()} time={props.time} onClose={() => props.onClosePreview?.()} onPreview={props.onPreview} />}
          </Show>
        }
      >
        {(c) => (
          <>
            <header>
              <CloseButton onClick={() => ed.setSelected(null)} />
              <span class="eyebrow">{NAMES[c().ref.col]}</span>
              <h2>{c().ref.col === "plantings" ? plantsById.get(c().item.plantId)?.commonName ?? c().item.plantId : label(c().item.kind ?? "House")}</h2>
            </header>
            <Show when={KINDS[c().ref.col]}>
              {(kinds) => (
                <Field label="Kind">
                  <select id="inspector-kind" value={c().item.kind} onChange={(e) => set("kind", e.currentTarget.value)}>
                    <For each={kinds()}>{(k) => <option value={k}>{label(k)}</option>}</For>
                  </select>
                </Field>
              )}
            </Show>
            <Show when={"heightFt" in c().item}>
              <Field label="Height (ft)">
                <input id="inspector-height" type="number" min="0.5" step="0.5" value={c().item.heightFt} onChange={(e) => set("heightFt", Number(e.currentTarget.value) || c().item.heightFt)} />
              </Field>
            </Show>
            <Show when={c().ref.col === "plantings"}>
              <PlantingFields editor={ed} planting={c().item} set={set} time={props.time} />
            </Show>
            {props.extra?.(c().ref)}
            <p class="hint-line">
              Drag it on the plan to move it. Arrow keys nudge it; ⌘D makes a copy.
            </p>
            <Show when={c().ref.col !== "house"}>
              <button type="button" class="danger" onClick={() => ed.remove(c().ref)} title="Delete (⌫). Undo with ⌘Z.">
                Delete
              </button>
            </Show>
          </>
        )}
      </Show>
    </aside>
  );
}

function PlantingFields(props: { editor: Editor; planting: Property["plantings"][number]; set: (f: string, v: unknown) => void; time: ViewTime }) {
  const plant = () => plantsById.get(props.planting.plantId);
  // Picking any plant, the guess or another one, means a person has checked it.
  const choose = (plantId: string) => {
    const s = props.editor.selected();
    if (s) props.editor.updateItem(s, (x) => ({ ...x, plantId, guess: undefined }));
  };
  const others = () => plants.filter((p) => p.category === plant()?.category && p.id !== props.planting.plantId).slice(0, 4);
  return (
    <>
      <Show when={plant()}>{(p) => <Picture plant={p()} time={props.time} />}</Show>

      <Show when={props.planting.guess}>
        <div class="guess-box">
          <strong>Guessed from the photos</strong>
          <p>Confirm or change: is this {plant() ? `a ${plant()!.commonName}` : "plant right"}?</p>
          <div class="guess-actions">
            <button type="button" class="primary" id="guess-confirm" onClick={() => choose(props.planting.plantId)}>
              Confirm
            </button>
            <For each={others()}>
              {(p) => (
                <button type="button" onClick={() => choose(p.id)}>
                  {p.commonName}
                </button>
              )}
            </For>
          </div>
          <span class="muted">Or pick any plant below.</span>
        </div>
      </Show>
      <Field label="Plant">
        <select id="inspector-plant" value={props.planting.plantId} onChange={(e) => choose(e.currentTarget.value)}>
          <For each={plants.filter((x) => !x.indianaStatus?.startsWith("invasive"))}>{(p) => <option value={p.id}>{p.commonName}</option>}</For>
        </select>
      </Field>
      <Field label="Placed as">
        <span>{label(props.planting.type)}</span>
      </Field>
      <Show when={props.planting.type === "single" && plant()}>
        {(p) => {
          const scale = () => (props.planting as { scale?: number }).scale ?? 1;
          return (
            <Field label="Width grown">
              <span class="with-unit">
                <input
                  id="inspector-width"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={Math.round(p().size.spreadFt * scale() * 10) / 10}
                  onChange={(e) => {
                    const v = Number(e.currentTarget.value);
                    if (v > 0) props.set("scale", Math.min(4, Math.max(0.2, v / p().size.spreadFt)) === 1 ? undefined : Math.min(4, Math.max(0.2, v / p().size.spreadFt)));
                  }}
                />
                <span>ft</span>
                <Show when={scale() !== 1}>
                  <button type="button" class="link-btn" onClick={() => props.set("scale", undefined)} title={`Back to the usual ${p().size.spreadFt} ft`}>
                    Reset
                  </button>
                </Show>
              </span>
            </Field>
          );
        }}
      </Show>
      <Show when={props.planting.type === "single" && crowding(props.editor.property(), props.planting.id)}>
        {(list) => (
          <Show when={list().length > 0}>
            <p class="warn">
              When grown, this will crowd {list().slice(0, 3).map((c) => `${c.name} (${c.overlapFt} ft overlap)`).join(", ")}. Move it apart or make it smaller.
            </p>
          </Show>
        )}
      </Show>
      <Show when={props.planting.type !== "single"}>
        <Field label="Spacing (ft)">
          <input
            id="inspector-spacing"
            type="number"
            min="0.5"
            step="0.5"
            value={(props.planting as { spacingFt?: number }).spacingFt ?? plant()?.size.spacingFt}
            onChange={(e) => props.set("spacingFt", Number(e.currentTarget.value) || undefined)}
          />
        </Field>
      </Show>
      <Show when={props.planting.type === "region"}>
        <button type="button" onClick={() => props.set("seed", Math.floor(Math.random() * 10000))}>
          Shuffle the layout
        </button>
      </Show>
      <label class="check">
        <input id="inspector-existing" type="checkbox" checked={props.planting.existing ?? false} onChange={(e) => props.set("existing", e.currentTarget.checked || undefined)} />
        Already in the yard at full size
      </label>
      <Show when={plant()}>{(p) => <PlantFacts plant={p()} />}</Show>
    </>
  );
}

// A large side-view illustration of the plant in the month shown.
export function Picture(props: { plant: Plant; time: ViewTime }) {
  return (
    <figure class="plant-preview">
      <PlantPicture plant={props.plant} time={props.time} size={300} class="preview-canvas" />
      <figcaption>
        {captionOf(props.plant, props.time.month)}
        <span class="preview-hint">Slide the month to see it through the year</span>
      </figcaption>
    </figure>
  );
}

export function PlantFacts(props: { plant: Plant }) {
  const p = () => props.plant;
  return (
    <dl class="facts">
      <dt>Mature size</dt>
      <dd>
        {p().size.heightFt} ft tall, {p().size.spreadFt} ft wide in {p().size.yearsToMature} yr
      </dd>
      <dt>Sun</dt>
      <dd>{p().sun.map(label).join(", ")}</dd>
      <dt>Blooms</dt>
      <dd>{p().bloom ? p().bloom!.months.map((m) => monthNames[m - 1]).join(", ") : "No flowers to speak of"}</dd>
      <dt>Native</dt>
      <dd>{p().nativeToIndiana ? "Yes, to Indiana" : "No"}</dd>
    </dl>
  );
}

// A plant picked in the gallery, before it is on the plan.
function PlantPreview(props: { plant: Plant; time: ViewTime; onClose: () => void; onPreview?: (id: string) => void }) {
  const invasive = () => !!props.plant.indianaStatus?.startsWith("invasive");
  return (
    <>
      <header>
        <CloseButton onClick={props.onClose} />
        <span class="eyebrow">{label(props.plant.category)}</span>
        <h2>{props.plant.commonName}</h2>
        <span class="botanical">{props.plant.botanicalName}</span>
      </header>
      <Show when={invasive()}>
        <div class="invasive-card">
          <strong>{props.plant.indianaStatus === "invasive_banned" ? "Banned from sale in Indiana" : "Invasive in Indiana"}</strong>
          <span>
            {props.plant.indianaStatus === "invasive_banned"
              ? "It's on Indiana's Terrestrial Plant Rule. Don't plant it; remove it if it's in your yard."
              : "It's on the Indiana Invasive Species Council list. It spreads into wild areas, so grow a native instead."}
          </span>
          <span class="hint-line">From the app's Indiana plant list. For the current rule, check the Indiana DNR at in.gov/dnr.</span>
          <Show when={props.plant.alternatives?.length}>
            <span class="instead">
              Plant instead:{" "}
              <For each={props.plant.alternatives}>
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
        </div>
      </Show>
      <Picture plant={props.plant} time={props.time} />
      <PlantFacts plant={props.plant} />
      <Show when={!invasive()}>
        <p class="preview-tip">Drag it from the list onto the plan, or use its buttons there to place it.</p>
      </Show>
      <Show when={!props.plant.verified}>
        <p class="hint-line">These details are typical values, not yet checked against the sources.</p>
      </Show>
    </>
  );
}

function CloseButton(props: { onClick: () => void }) {
  return (
    <button type="button" class="icon-btn close" onClick={props.onClick} title="Close (Esc)" aria-label="Close details">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </button>
  );
}

// Shown when nothing is selected: Sprout, one line of guidance, and the tour playing on a loop.
// The step-by-step instructions live in the animated tour, so they don't fill the panel.
function GettingStarted(props: { onTour?: () => void }) {
  const [keys, setKeys] = createSignal(false);
  return (
    <div class="start welcome">
      <Mascot size={110} caption />
      <p>Drag plants in from the list, then click anything on the plan to change it.</p>
      <TourReel onExpand={() => props.onTour?.()} />
      <button type="button" class="link-btn" aria-expanded={keys()} onClick={() => setKeys(!keys())}>
        {keys() ? "Hide keyboard shortcuts" : "Keyboard shortcuts"}
      </button>
      <Show when={keys()}>
      <div class="shortcuts">
          <span class="eyebrow">Shortcuts</span>
          <dl>
            <dt>
              <kbd>⌘</kbd> <kbd>Z</kbd>
            </dt>
            <dd>Undo</dd>
            <dt>
              <kbd>⇧</kbd> <kbd>⌘</kbd> <kbd>Z</kbd>
            </dt>
            <dd>Redo</dd>
            <dt>
              <kbd>⌘</kbd> <kbd>S</kbd>
            </dt>
            <dd>Save</dd>
            <dt>
              <kbd>Delete</kbd>
            </dt>
            <dd>Remove selected</dd>
            <dt>
              <kbd>Esc</kbd>
            </dt>
            <dd>Cancel or deselect</dd>
            <dt>
              <kbd>←</kbd> <kbd>→</kbd>
            </dt>
            <dd>Nudge 1 ft (⇧ for 5 ft)</dd>
            <dt>
              <kbd>⌘</kbd> <kbd>D</kbd>
            </dt>
            <dd>Duplicate selected</dd>
            <dt>
              <kbd>+</kbd> <kbd>−</kbd> <kbd>0</kbd>
            </dt>
            <dd>Zoom in, out, fit</dd>
            <dt>
              <kbd>\</kbd>
            </dt>
            <dd>Hide or show both panels</dd>
          </dl>
        </div>
      </Show>
    </div>
  );
}

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <label class="field">
      <span>{props.label}</span>
      {props.children}
    </label>
  );
}
