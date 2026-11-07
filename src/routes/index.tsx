import { createEffect, createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import { YardView3D } from "../components/YardView3D";
import { Mascot } from "../components/Mascot";
import { Tour } from "../components/Tour";
import { EditLayer } from "../editor/EditLayer";
import { ImportButton, importPhotos, ImportProgress, ScaleBanner } from "../editor/ImportFlow";
import { Inspector } from "../editor/Inspector";
import { ModeBanner } from "../editor/ModeBanner";
import { createEditor, droppedPlanting, itemOf, newId, pointsOf, withPoints, type Item } from "../editor/state";
import { draggingPlant, PlantGallery } from "../gallery/PlantGallery";
import { Toolbar } from "../editor/Toolbar";
import { loadProperties, plantsById, saveProperty } from "../model/library";
import type { Property } from "../model/property";
import type { ViewTime } from "../render/look";
import type { Weather } from "../render/life";

export default function Home() {
  const [list, { mutate }] = createResource(loadProperties);
  return (
    <Show when={list()} fallback={<p class="status">{list.error ? String(list.error.message) : "Loading the plan…"}</p>}>
      {(l) => <Planner properties={l()} onSaved={(p) => mutate(l().some((x) => x.id === p.id) ? l().map((x) => (x.id === p.id ? p : x)) : [...l(), p])} />}
    </Show>
  );
}

function Planner(props: { properties: Property[]; onSaved: (p: Property) => void }) {
  const ed = createEditor(props.properties[0]);
  const [time, setTime] = createSignal<ViewTime>({ month: 6, year: 3 });
  const [weather, setWeather] = createSignal<Weather>("sunny");
  // The tour plays once on a first visit, and any time from the welcome card.
  const [tour, setTour] = createSignal(false);
  onMount(() => {
    try {
      if (!localStorage.getItem("fp.toured")) setTour(true);
    } catch {
      // No storage: don't force the tour on every visit.
    }
  });
  const closeTour = () => {
    setTour(false);
    try {
      localStorage.setItem("fp.toured", "1");
    } catch {
      // Ignore.
    }
  };
  const [status, setStatus] = createSignal("");
  const [preview, setPreview] = createSignal<string | null>(null);
  const [photo, setPhoto] = createSignal({ on: true, opacity: 0.55 });
  const [importing, setImporting] = createSignal(0);
  const [importError, setImportError] = createSignal("");
  const [scaleBasis, setScaleBasis] = createSignal<string | null>(null);
  const [dropping, setDropping] = createSignal(false);
  const isNew = () => !props.properties.some((p) => p.id === ed.property().id);
  // Side panels can fold away to give the plan the whole window. Remembered per browser.
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("fp.panels") ?? "{}") as { plants?: boolean; details?: boolean };
    } catch {
      return {};
    }
  })();
  // In narrow windows the panels are drawers over the plan, closed until asked for.
  const narrow = () => typeof window !== "undefined" && window.innerWidth < 1000;
  const [showPlants, setShowPlants] = createSignal(saved.plants ?? !narrow());
  // Which view of the yard: the 2D plan, the 3D model, or both side by side.
  type ViewMode = "2d" | "3d" | "both";
  const [mode, setMode] = createSignal<ViewMode>(
    (() => {
      try {
        const v = localStorage.getItem("fp.view");
        return v === "3d" || v === "both" ? v : "2d";
      } catch {
        return "2d";
      }
    })(),
  );
  // The 3D view loads the first time it is shown, then stays so switching back is instant.
  const [used3d, setUsed3d] = createSignal(false);
  createEffect(() => {
    if (mode() !== "2d") setUsed3d(true);
    try {
      localStorage.setItem("fp.view", mode());
    } catch {
      // Storage may be blocked; the choice lasts for this visit.
    }
  });
  const [showDetails, setShowDetails] = createSignal(saved.details ?? !narrow());
  createEffect(() => {
    try {
      localStorage.setItem("fp.panels", JSON.stringify({ plants: showPlants(), details: showDetails() }));
    } catch {
      // Storage may be blocked; panels still work for this visit.
    }
  });
  // Opening something to look at brings its panel back.
  createEffect(() => {
    if (ed.selected() || preview()) setShowDetails(true);
  });
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

  // A copy of the selected thing, a few feet down and to the right.
  function duplicate() {
    const ref = ed.selected();
    if (!ref || ref.col === "house") return;
    const item = itemOf(ed.property(), ref) as Item | undefined;
    if (!item) return;
    const id = newId(ed.property(), "plantId" in item ? item.plantId : ref.id.replace(/-\d+$/, ""));
    const moved = withPoints({ ...item, id }, pointsOf(item).map(([x, y]) => [x + 3, y + 3]));
    ed.add(ref.col, moved as Item);
  }

  function pick(id: string) {
    if (ed.dirty() && !window.confirm("Discard unsaved changes?")) return;
    ed.load(props.properties.find((p) => p.id === id)!);
    setScaleBasis(null);
  }

  // The result opens as a new, unsaved property. A failure leaves the current plan as it was.
  async function runImport(files: File[]) {
    if (importing()) return;
    if (ed.dirty() && !window.confirm("Discard unsaved changes?")) return;
    const ids = new Set(props.properties.map((p) => p.id));
    let n = 1;
    while (ids.has(`new-lot-${n}`)) n++;
    setImportError("");
    setScaleBasis(null);
    setImporting(files.length);
    try {
      const res = await importPhotos(files, `New lot ${n}`);
      ed.load(res.property);
      ed.setDirty(true);
      setPhoto({ ...photo(), on: true });
      setScaleBasis(res.raw.scaleBasis);
    } catch (e) {
      setImportError((e as Error).message);
    } finally {
      setImporting(0);
    }
  }

  const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files") ?? false;

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
        if (narrow()) {
          setShowPlants(false);
          setShowDetails(false);
        }
      } else if (!typing && mod && e.key.toLowerCase() === "d" && ed.selected()) {
        e.preventDefault();
        duplicate();
      } else if (!typing && !mod && e.key.startsWith("Arrow") && ed.selected()) {
        // Nudge: 1 ft, Shift for 5 ft, Alt for a tenth.
        e.preventDefault();
        const step = e.shiftKey ? 5 : e.altKey ? 0.1 : 1;
        const [dx, dy] = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key] ?? [0, 0];
        ed.updateItem(ed.selected()!, (item) => withPoints(item, pointsOf(item).map(([x, y]) => [Math.round((x + dx) * 10) / 10, Math.round((y + dy) * 10) / 10])));
      } else if (!typing && !mod && e.key === "\\") {
        const open = showPlants() || showDetails();
        setShowPlants(!open);
        setShowDetails(!open);
      }
    };
    window.addEventListener("keydown", key);
    onCleanup(() => window.removeEventListener("keydown", key));
  });

  return (
    <div
      class="app"
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (!e.relatedTarget) setDropping(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropping(false);
        runImport([...e.dataTransfer!.files]);
      }}
    >
      <header class="app-bar">
        <span class="brand">
          <Mascot size={44} plantId="purple-coneflower" class="brand-mascot" />
          <span class="wordmark">Flower Power</span>
        </span>
        <label class="property-pick">
          <span class="eyebrow">Plan</span>
          <select id="property" value={ed.property().id} onChange={(e) => pick(e.currentTarget.value)} aria-label="Property">
            <For each={props.properties}>
              {(p) => (
                <option value={p.id} selected={p.id === ed.property().id}>
                  {p.name}
                </option>
              )}
            </For>
            <Show when={isNew()}>
              <option value={ed.property().id} selected>
                {ed.property().name} (unsaved)
              </option>
            </Show>
          </select>
        </label>
        <ImportButton onFiles={runImport} disabled={!!importing()} />
        <Show when={ed.property().underlay}>
          <div class="photo-controls">
            <label class="check">
              <input id="photo-toggle" type="checkbox" checked={photo().on} onChange={(e) => setPhoto({ ...photo(), on: e.currentTarget.checked })} />
              Photo
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={photo().opacity}
              disabled={!photo().on}
              onInput={(e) => setPhoto({ ...photo(), opacity: Number(e.currentTarget.value) })}
              aria-label="Photo opacity"
            />
          </div>
        </Show>
        <div class="file-actions">
          <div class="btn-group">
            <button type="button" class="icon-btn" onClick={ed.undo} disabled={!ed.canUndo()} title={ed.canUndo() ? "Undo (⌘Z)" : "Nothing to undo yet"} aria-label="Undo">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M6 4L2.5 7.5 6 11M3 7.5h6.5a3.5 3.5 0 010 7H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="icon-btn" onClick={ed.redo} disabled={!ed.canRedo()} title={ed.canRedo() ? "Redo (⇧⌘Z)" : "Nothing to redo"} aria-label="Redo">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M10 4l3.5 3.5L10 11M13 7.5H6.5a3.5 3.5 0 000 7H8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
          <button type="button" class="primary" disabled={!ed.dirty()} onClick={save} title={ed.dirty() ? "Save (⌘S)" : "Nothing to save yet"}>
            Save
          </button>
          <span class="status-text" classList={{ dirty: ed.dirty() }} role="status">
            <Show when={ed.dirty() || status()}>
              <span class="status-dot" aria-hidden="true" />
              {ed.dirty() ? "Unsaved" : status()}
            </Show>
          </span>
        </div>
        <Toolbar editor={ed} />
      </header>
      <main class="app-main" classList={{ "drawer-open": showPlants() || showDetails() }}>
        <Show when={importing()}>
          <ImportProgress count={importing()} />
        </Show>
        <Show when={dropping()}>
          <div class="drop-hint">Drop an aerial and any listing photos to start a new plan</div>
        </Show>
        <Show when={showPlants() || showDetails()}>
          <div
            class="drawer-scrim"
            aria-hidden="true"
            onClick={() => {
              setShowPlants(false);
              setShowDetails(false);
            }}
          />
        </Show>
        <Show when={showPlants()}>
          <PlantGallery
            editor={ed}
            time={time()}
            previewing={preview()}
            onPreview={(id) => {
              ed.setSelected(null);
              setPreview(preview() === id ? null : id);
            }}
          />
        </Show>
        <div class="plan-wrap">
          <div class="view-bar">
            <button
              type="button"
              class="panel-toggle icon-btn"
              aria-pressed={showPlants()}
              onClick={() => setShowPlants(!showPlants())}
              title={showPlants() ? "Hide the plant list (\\ hides both panels)" : "Show the plant list"}
              aria-label={showPlants() ? "Hide the plant list" : "Show the plant list"}
            >
              <PanelIcon side="left" />
            </button>
            <div class="card-group view-cards" role="radiogroup" aria-label="View">
              <For each={[
                { id: "2d" as const, name: "2D Plan", title: "Top-down plan for laying out and editing" },
                { id: "3d" as const, name: "3D View", title: "Walk around the yard: drag to turn, scroll to get closer" },
                { id: "both" as const, name: "Side by side", title: "Plan and 3D together; edits show in both" },
              ]}>
                {(v) => (
                  <button type="button" role="radio" class="view-card" aria-checked={mode() === v.id} onClick={() => setMode(v.id)} title={`${v.name}: ${v.title}`} aria-label={v.name}>
                    <ViewIcon id={v.id} />
                    <span class="view-name">{v.name}</span>
                  </button>
                )}
              </For>
            </div>
            <TimeBar part="year" time={time()} onChange={setTime} />
            <button
              type="button"
              class="panel-toggle icon-btn"
              aria-pressed={showDetails()}
              onClick={() => setShowDetails(!showDetails())}
              title={showDetails() ? "Hide the details panel" : "Show the details panel"}
              aria-label={showDetails() ? "Hide the details panel" : "Show the details panel"}
            >
              <PanelIcon side="right" />
            </button>
            <div class="bar-row">
              <TimeBar part="season" time={time()} onChange={setTime} />
              <div class="card-group weather-cards" role="radiogroup" aria-label="Weather on the plan">
                <For each={WEATHERS}>
                  {(w) => (
                    <button
                      type="button"
                      role="radio"
                      class="time-card weather-card"
                      aria-checked={weather() === w.id}
                      aria-label={w.name}
                      title={`${w.name} on the 2D plan`}
                      onClick={() => setWeather(w.id)}
                    >
                      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d={w.icon} />
                      </svg>
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>
          <Show when={importError()}>
            <div class="import-banner error" role="alert">
              <span>The import failed: {importError()} Your plan is unchanged.</span>
              <span class="spacer" />
              <button type="button" onClick={() => setImportError("")}>
                Dismiss
              </button>
            </div>
          </Show>
          <Show when={scaleBasis() !== null}>
            <ScaleBanner editor={ed} basis={scaleBasis()!} onClose={() => setScaleBasis(null)} />
          </Show>
          <div class="views" classList={{ split: mode() === "both" }}>
            <div class="view-slot" classList={{ hidden: mode() === "3d" }}>
              <PlanView
                property={ed.property()}
                time={time()}
                weather={weather()}
                photoOpacity={photo().on ? photo().opacity : 0}
                overlay={(view) => <EditLayer editor={ed} view={view} time={time()} />}
                onBackgroundClick={() => {
                  ed.setSelected(null);
                  setPreview(null);
                }}
                onDragPlantOver={(at) => {
                  const id = draggingPlant();
                  ed.setGhost(at && id ? { plantId: id, at } : null);
                }}
                onDropPlant={(id, at) => {
                  const plant = plantsById.get(id);
                  ed.setGhost(null);
                  if (plant) ed.add("plantings", droppedPlanting(ed.property(), plant, at));
                }}
              >
                <ModeBanner editor={ed} />
              </PlanView>
            </div>
            <Show when={used3d()}>
              <div class="view-slot" classList={{ hidden: mode() === "2d" }}>
                <YardView3D
                  property={ed.property()}
                  time={time()}
                  selected={ed.selected()}
                  onPick={(ref) => {
                    ed.setSelected(ref as never);
                    if (!ref) setPreview(null);
                  }}
                  onDropPlant={(id, at) => {
                    const plant = plantsById.get(id);
                    if (plant) ed.add("plantings", droppedPlanting(ed.property(), plant, at));
                  }}
                />
              </div>
            </Show>
          </div>
        </div>
        <Show when={showDetails()}>
          <Inspector editor={ed} time={time()} preview={preview()} onClosePreview={() => setPreview(null)} onPreview={(id) => setPreview(id)} onTour={() => setTour(true)} />
        </Show>
      </main>
      <Show when={tour()}>
        <Tour onClose={closeTour} />
      </Show>
    </div>
  );
}

function PanelIcon(props: { side: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.4" />
      <path d={props.side === "left" ? "M6 3v10" : "M10 3v10"} stroke="currentColor" stroke-width="1.4" />
    </svg>
  );
}

const WEATHERS: { id: Weather; name: string; icon: string }[] = [
  { id: "sunny", name: "Sunny", icon: "M8 5a3 3 0 110 6 3 3 0 010-6zM8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M12.6 3.4l-1 1M4.4 11.6l-1 1" },
  { id: "cloudy", name: "Cloudy", icon: "M4.5 12.5h7a3 3 0 00.3-6 4 4 0 00-7.6 1.1A2.5 2.5 0 004.5 12.5z" },
  { id: "rain", name: "Rain", icon: "M4.5 9.5h7a2.7 2.7 0 00.3-5.4 3.6 3.6 0 00-6.9 1A2.2 2.2 0 004.5 9.5zM5.5 11.5l-.8 2M8.5 11.5l-.8 2M11.5 11.5l-.8 2" },
  { id: "snow", name: "Snow", icon: "M8 2v12M2.8 5l10.4 6M2.8 11l10.4-6M6.6 3.2L8 4.4l1.4-1.2M6.6 12.8L8 11.6l1.4 1.2" },
];

function ViewIcon(props: { id: "2d" | "3d" | "both" }) {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">
      {props.id === "2d" ? (
        <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      ) : props.id === "3d" ? (
        <path d="M8 1.8l5.5 3.1v6.2L8 14.2l-5.5-3.1V4.9zM8 8l5.5-3.1M8 8v6.2M8 8L2.5 4.9" />
      ) : (
        <path d="M1.8 3h5.4v10H1.8zM8.8 5.5l2.7-1.6 2.7 1.6v5l-2.7 1.6-2.7-1.6z" />
      )}
    </svg>
  );
}
