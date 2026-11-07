import { For, Show, type JSX } from "solid-js";
import { plantsById } from "../model/library";
import { edgeKinds, featureKinds, fenceKinds, structureKinds, surfaceKinds, type Property } from "../model/property";
import { itemOf, type Editor, type Ref } from "./state";

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

export function Inspector(props: { editor: Editor; extra?: (ref: Ref) => JSX.Element }) {
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
      <Show when={current()} fallback={<p class="muted">Select something on the plan to see and change its details.</p>}>
        {(c) => (
          <>
            <header>
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
              <PlantingFields editor={ed} planting={c().item} set={set} />
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

function PlantingFields(props: { editor: Editor; planting: Property["plantings"][number]; set: (f: string, v: unknown) => void }) {
  const plant = () => plantsById.get(props.planting.plantId);
  return (
    <>
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
      <Show when={plant()}>
        {(p) => (
          <dl class="facts">
            <dt>Mature size</dt>
            <dd>
              {p().size.heightFt} ft tall, {p().size.spreadFt} ft wide in {p().size.yearsToMature} yr
            </dd>
            <dt>Sun</dt>
            <dd>{p().sun.map(label).join(", ")}</dd>
            <dt>Blooms</dt>
            <dd>{p().bloom ? p().bloom!.months.map((m) => "JFMAMJJASOND"[m - 1]).join(" ") : "No flowers to speak of"}</dd>
          </dl>
        )}
      </Show>
    </>
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
