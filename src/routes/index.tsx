import { createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import { EditLayer } from "../editor/EditLayer";
import { Inspector } from "../editor/Inspector";
import { createEditor } from "../editor/state";
import { Toolbar } from "../editor/Toolbar";
import { loadProperties, saveProperty } from "../model/library";
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
      }
    };
    window.addEventListener("keydown", key);
    onCleanup(() => window.removeEventListener("keydown", key));
  });

  return (
    <div class="app">
      <header class="app-bar">
        <span class="brand">Flower Power</span>
        <select id="property" value={ed.property().id} onChange={(e) => pick(e.currentTarget.value)} aria-label="Property">
          <For each={props.properties}>{(p) => <option value={p.id}>{p.name}</option>}</For>
        </select>
        <div class="file-actions">
          <button type="button" onClick={ed.undo} title="Undo (Cmd+Z)">
            Undo
          </button>
          <button type="button" onClick={ed.redo} title="Redo (Shift+Cmd+Z)">
            Redo
          </button>
          <button type="button" class="primary" disabled={!ed.dirty()} onClick={save} title="Save (Cmd+S)">
            Save
          </button>
          <span class="status-text">{ed.dirty() ? "Unsaved changes" : status()}</span>
        </div>
        <TimeBar time={time()} onChange={setTime} />
      </header>
      <Toolbar editor={ed} />
      <main class="app-main">
        <PlanView property={ed.property()} time={time()} overlay={(view) => <EditLayer editor={ed} view={view} time={time()} />} />
        <Inspector editor={ed} />
      </main>
    </div>
  );
}
