import { createEffect, createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import { EditLayer } from "../editor/EditLayer";
import { Inspector } from "../editor/Inspector";
import { ModeBanner } from "../editor/ModeBanner";
import { createEditor, droppedPlanting } from "../editor/state";
import { PlantGallery } from "../gallery/PlantGallery";
import { Toolbar } from "../editor/Toolbar";
import { loadProperties, plantsById, saveProperty } from "../model/library";
import type { Property } from "../model/property";
import type { ViewTime } from "../render/look";

export default function Home() {
  const [list, { mutate }] = createResource(loadProperties);
  return (
    <Show when={list()} fallback={<p class="status">{list.error ? String(list.error.message) : "Loading the plan…"}</p>}>
      {(l) => <Planner properties={l()} onSaved={(p) => mutate(l().map((x) => (x.id === p.id ? p : x)))} />}
    </Show>
  );
}

function Planner(props: { properties: Property[]; onSaved: (p: Property) => void }) {
  const ed = createEditor(props.properties[0]);
  const [time, setTime] = createSignal<ViewTime>({ month: 6, year: 3 });
  const [status, setStatus] = createSignal("");
  const [preview, setPreview] = createSignal<string | null>(null);
  // Selecting something on the plan replaces a gallery preview.
  createEffect(() => {
    if (ed.selected()) setPreview(null);
  });

  async function save() {
    setStatus("Saving…");
    try {
      await saveProperty(ed.property());
      props.onSaved(ed.property());
      ed.setDirty(false);
      setStatus("Saved");
    } catch (e) {
      setStatus((e as Error).message);
    }
  }

  function pick(id: string) {
    if (ed.dirty() && !window.confirm("Discard unsaved changes?")) return;
    ed.load(props.properties.find((p) => p.id === id)!);
  }

  onMount(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest("input, select, textarea");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? ed.redo() : ed.undo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (!typing && (e.key === "Delete" || e.key === "Backspace") && ed.selected()) {
        ed.remove(ed.selected()!);
      } else if (!typing && e.key === "Escape" && ed.tool().mode === "select") {
        ed.setSelected(null);
        setPreview(null);
      }
    };
    window.addEventListener("keydown", key);
    onCleanup(() => window.removeEventListener("keydown", key));
  });

  return (
    <div class="app">
      <header class="app-bar">
        <span class="brand">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <g fill="var(--bloom)">
              <circle cx="12" cy="6.5" r="3.6" />
              <circle cx="17.5" cy="10.5" r="3.6" />
              <circle cx="15.4" cy="16.8" r="3.6" />
              <circle cx="8.6" cy="16.8" r="3.6" />
              <circle cx="6.5" cy="10.5" r="3.6" />
            </g>
            <circle cx="12" cy="12" r="3" fill="#f2c14e" />
          </svg>
          Flower Power
        </span>
        <label class="property-pick">
          <span class="eyebrow">Plan</span>
          <select id="property" value={ed.property().id} onChange={(e) => pick(e.currentTarget.value)} aria-label="Property">
            <For each={props.properties}>{(p) => <option value={p.id}>{p.name}</option>}</For>
          </select>
        </label>
        <div class="file-actions">
          <div class="btn-group">
            <button type="button" class="icon-btn" onClick={ed.undo} disabled={!ed.canUndo()} title="Undo (⌘Z)" aria-label="Undo">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M6 4L2.5 7.5 6 11M3 7.5h6.5a3.5 3.5 0 010 7H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="icon-btn" onClick={ed.redo} disabled={!ed.canRedo()} title="Redo (⇧⌘Z)" aria-label="Redo">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M10 4l3.5 3.5L10 11M13 7.5H6.5a3.5 3.5 0 000 7H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <button type="button" class="primary" disabled={!ed.dirty()} onClick={save} title="Save (⌘S)">
            Save
          </button>
          <span class="status-text" classList={{ dirty: ed.dirty() }}>
            <span class="status-dot" aria-hidden="true" />
            {ed.dirty() ? "Unsaved changes" : status() || "All changes saved"}
          </span>
        </div>
        <TimeBar time={time()} onChange={setTime} />
      </header>
      <Toolbar editor={ed} />
      <main class="app-main">
        <PlantGallery
          editor={ed}
          time={time()}
          previewing={preview()}
          onPreview={(id) => {
            ed.setSelected(null);
            setPreview(preview() === id ? null : id);
          }}
        />
        <div class="plan-wrap">
          <ModeBanner editor={ed} />
          <PlanView
          property={ed.property()}
          time={time()}
          overlay={(view) => <EditLayer editor={ed} view={view} time={time()} />}
          onDropPlant={(id, at) => {
            const plant = plantsById.get(id);
            if (plant) ed.add("plantings", droppedPlanting(ed.property(), plant, at));
          }}
          />
        </div>
        <Inspector editor={ed} time={time()} preview={preview()} onClosePreview={() => setPreview(null)} />
      </main>
    </div>
  );
}
