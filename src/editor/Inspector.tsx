import { For, Show, type JSX } from "solid-js";
import { plants, plantsById } from "../model/library";
import { edgeKinds, featureKinds, fenceKinds, structureKinds, surfaceKinds, type Property } from "../model/property";
import { itemOf, type Editor, type Ref } from "./state";
import { PlantPicture } from "../gallery/PlantPicture";
import type { Plant } from "../model/plant";
import { lookOf, monthNames, type ViewTime } from "../render/look";

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
          <Show when={props.preview ? plantsById.get(props.preview) : undefined} fallback={<GettingStarted />}>
            {(p) => <PlantPreview plant={p()} time={props.time} onClose={() => props.onClosePreview?.()} />}
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
            <Show when={c().ref.col !== "house"}>
              <button type="button" class="danger" onClick={() => ed.remove(c().ref)}>
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
  return (
    <>
      <Show when={plant()}>{(p) => <Picture plant={p()} time={props.time} />}</Show>
      <Field label="Plant">
        <select id="inspector-plant" value={props.planting.plantId} onChange={(e) => props.set("plantId", e.currentTarget.value)}>
          <For each={plants}>{(p) => <option value={p.id}>{p.commonName}</option>}</For>
        </select>
      </Field>
      <Field label="Placed as">
        <span>{label(props.planting.type)}</span>
      </Field>
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

// A large drawing of the plant, with a note when it is dormant in the month shown.
function Picture(props: { plant: Plant; time: ViewTime }) {
  const dormant = () => !lookOf(props.plant, { month: props.time.month, year: 5 }, true);
  return (
    <figure class="plant-preview">
      <PlantPicture plant={props.plant} time={props.time} size={300} class="preview-canvas" />
      <figcaption>
        {dormant() ? `Not showing in ${monthNames[props.time.month - 1]}, so drawn as in July` : `Full grown, in ${monthNames[props.time.month - 1]}`}
      </figcaption>
    </figure>
  );
}

function PlantFacts(props: { plant: Plant }) {
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
function PlantPreview(props: { plant: Plant; time: ViewTime; onClose: () => void }) {
  return (
    <>
      <header>
        <CloseButton onClick={props.onClose} />
        <span class="eyebrow">{label(props.plant.category)}</span>
        <h2>{props.plant.commonName}</h2>
        <span class="botanical">{props.plant.botanicalName}</span>
      </header>
      <Picture plant={props.plant} time={props.time} />
      <PlantFacts plant={props.plant} />
      <p class="preview-tip">Drag it from the list onto the plan, or use its buttons there to place it.</p>
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

// Shown when nothing is selected: the handful of things a first-time visitor needs to know.
function GettingStarted() {
  return (
    <div class="start">
      <h2>How to plan your yard</h2>
      <ol class="steps">
        <li>
          <strong>Add plants.</strong> Drag one from the list on the left onto the plan, or use <em>+ One</em>, <em>Fill area</em> or <em>Row</em>.
        </li>
        <li>
          <strong>Add paths, beds and more.</strong> Use the <em>Draw on the plan</em> menus at the top.
        </li>
        <li>
          <strong>Edit anything.</strong> Click it on the plan. Drag to move it, or drag its dots to reshape.
        </li>
        <li>
          <strong>See it grow.</strong> Slide the month and year at the top right to preview each season.
        </li>
      </ol>
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
        </dl>
      </div>
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
