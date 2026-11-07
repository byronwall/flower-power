import { createSignal } from "solid-js";
import { applyOps, diff, type Design, type Dial, type Goals, type Op, type Review } from "../model/design";
import type { Point, Property } from "../model/property";
import type { Editor } from "../editor/state";

// Design ideas in the editor. The property on disk is the yard as it is (the base) plus its designs.
// The editor always shows one plan: the base, or the base with the active design's ops applied.
// Edits while a design is active belong to that design: they are saved as diff(base, shown).

export type Style = "cottage" | "prairie" | "modern" | "formal" | "woodland";

const strip = (p: Property): Property => {
  const { designs, activeDesignId, ...rest } = p;
  return rest;
};

const target = (o: Op) => ("id" in o ? o.id : o.item.id);

// diff() has no reasons, so each op keeps the reason of an earlier op on the same item.
function withReasons(ops: Op[], old: Op[]) {
  const why = new Map(old.map((o) => [target(o), o.reason]));
  return ops.map((o) => ({ ...o, reason: why.get(target(o)) ?? o.reason }));
}

export function createDesigns(ed: Editor) {
  const [base, setBase] = createSignal<Property>(strip(ed.property()));
  const [designs, setDesigns] = createSignal<Design[]>([]);
  const [activeId, setActiveId] = createSignal<string | undefined>();
  const [review, setReview] = createSignal<Review | null>(null);
  const active = () => designs().find((d) => d.id === activeId());

  // Opens a saved property: the editor shows its active design, if it has one.
  function open(p: Property) {
    const b = strip(p);
    const ds = p.designs ?? [];
    const a = ds.find((d) => d.id === p.activeDesignId);
    setBase(b);
    setDesigns(ds);
    setActiveId(a?.id);
    setReview(ds.find((d) => d.review)?.review ?? null);
    ed.load(a ? applyOps(b, a.ops) : b);
  }

  // Folds the editor's plan back into the base or the active design.
  function commit() {
    const shown = strip(ed.property());
    const a = active();
    if (!a) {
      setBase(shown);
      return;
    }
    const ops = withReasons(diff(base(), shown), [...a.ops, ...(a.pending ?? [])]);
    setDesigns(designs().map((d) => (d.id === a.id ? { ...d, ops } : d)));
  }

  function activate(id: string | undefined) {
    if (id === activeId()) return;
    commit();
    setActiveId(id);
    const a = active();
    ed.load(a ? applyOps(base(), a.ops) : base());
    // Switching is a change to save, since the active design is stored on the property.
    ed.setDirty(true);
  }

  const setPending = (id: string, fn: (ops: Op[]) => Op[]) => setDesigns(designs().map((d) => (d.id === id ? { ...d, pending: fn(d.pending ?? []) } : d)));

  function accept(ops: Op[]) {
    const a = active();
    if (!a || !ops.length) return;
    ed.update((p) => applyOps(p, ops));
    setDesigns(designs().map((d) => (d.id === a.id ? { ...d, ops: [...d.ops, ...ops], pending: (d.pending ?? []).filter((o) => !ops.includes(o)) } : d)));
  }

  function reject(ops: Op[]) {
    const a = active();
    if (!a) return;
    setPending(a.id, (list) => list.filter((o) => !ops.includes(o)));
    ed.setDirty(true);
  }

  // New designs from the engine. For area rework they build on the active design's accepted ops.
  function addDesigns(made: Design[], onTopOf?: Design) {
    commit();
    const prior = onTopOf ? (designs().find((d) => d.id === onTopOf.id)?.ops ?? []) : [];
    // Keep ops change nothing, so only real changes wait for a decision.
    const added = made.map((d) => ({ ...d, review: review() ?? undefined, ops: prior, pending: d.ops.filter((o) => o.op !== "keep") }));
    setDesigns([...designs(), ...added]);
    ed.setDirty(true);
    if (added[0]) activate(added[0].id);
  }

  function removeDesign(id: string) {
    if (id === activeId()) activate(undefined);
    setDesigns(designs().filter((d) => d.id !== id));
    ed.setDirty(true);
  }

  // The property to save: the base plus every design, with the editor's edits folded in.
  function forSave(): Property {
    commit();
    return { ...base(), designs: designs(), activeDesignId: activeId() };
  }

  // The plan a design card shows: accepted and pending ops together.
  function preview(d: Design | undefined): Property {
    if (!d) return base();
    const shown = d.id === activeId() ? strip(ed.property()) : applyOps(base(), d.ops);
    return applyOps(shown, d.pending ?? []);
  }

  return { base, designs, active, activeId, review, setReview, open, commit, activate, accept, reject, addDesigns, removeDesign, forSave, preview };
}

export type Designs = ReturnType<typeof createDesigns>;

// Client calls for the design engine route.
async function post(body: object) {
  const res = await fetch("/api/ai/design", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `The design engine failed with status ${res.status}.`);
  return json;
}

export async function fetchReview(property: Property, goals: Goals): Promise<Review> {
  return (await post({ action: "review", property: strip(property), goals })).review;
}

export async function fetchDesigns(property: Property, goals: Goals, dial: Dial, styles: Style[], scope?: Point[]): Promise<Design[]> {
  return (await post({ action: "designs", property: strip(property), goals, dial, styles, scope })).designs;
}
