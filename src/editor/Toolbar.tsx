import { For } from "solid-js";
import { edgeKinds, featureKinds, fenceKinds, structureKinds, surfaceKinds } from "../model/property";
import { label } from "./Inspector";
import type { Collection, Editor } from "./state";

// Each group says in plain words what it is for, since "surface" or "edge" alone means little.
const GROUPS: { col: Collection; name: string; about: string; kinds: readonly string[]; shape: "outline" | "path" | "point" }[] = [
  { col: "surfaces", name: "Ground", about: "Lawn, patio, paths, gravel, mulch, driveway or pond", kinds: surfaceKinds, shape: "outline" },
  { col: "structures", name: "Building", about: "Deck, pergola, shed or raised bed", kinds: structureKinds, shape: "outline" },
  { col: "fences", name: "Fence", about: "Solid, semi-open or open fence along a line", kinds: fenceKinds, shape: "path" },
  { col: "edges", name: "Edging", about: "Edging, border or seat wall between areas", kinds: edgeKinds, shape: "path" },
  { col: "features", name: "Feature", about: "Birdbath, feeder, bench, fire pit or water feature", kinds: featureKinds, shape: "point" },
];

export function Toolbar(props: { editor: Editor }) {
  const ed = props.editor;
  const active = (col: Collection) => {
    const t = ed.tool();
    return t.mode === "draw" && t.col === col ? t.kind : "";
  };
  return (
    <div class="toolbar">
      <button
        type="button"
        class="tool-select"
        aria-label="Select and move"
        aria-pressed={ed.tool().mode === "select"}
        onClick={() => ed.setTool({ mode: "select" })}
        title="Click things on the plan to edit them. Drag to move, drag a dot to reshape."
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 2l10 5.5-4.5 1L6.5 13z" fill="currentColor" />
        </svg>
        <span class="tool-select-label">Select</span>
      </button>
      <span class="toolbar-sep" aria-hidden="true" />
      <span class="toolbar-label">Draw on the plan</span>
      <For each={GROUPS}>
        {(g) => (
          <select
            id={`add-${g.col}`}
            aria-label={`Add ${g.name.toLowerCase()}: ${g.about}`}
            title={g.about}
            classList={{ active: !!active(g.col) }}
            value={active(g.col)}
            onChange={(e) => {
              const kind = e.currentTarget.value;
              if (kind) ed.setTool({ mode: "draw", col: g.col, kind, shape: g.shape });
            }}
          >
            <option value="">+ {g.name}</option>
            <For each={g.kinds}>{(k) => <option value={k}>{label(k)}</option>}</For>
          </select>
        )}
      </For>
    </div>
  );
}
