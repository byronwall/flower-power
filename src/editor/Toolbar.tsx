import { For } from "solid-js";
import { edgeKinds, featureKinds, fenceKinds, structureKinds, surfaceKinds } from "../model/property";
import { label } from "./Inspector";
import type { Collection, Editor } from "./state";

const GROUPS: { col: Collection; name: string; kinds: readonly string[]; shape: "outline" | "path" | "point" }[] = [
  { col: "surfaces", name: "Surface", kinds: surfaceKinds, shape: "outline" },
  { col: "structures", name: "Structure", kinds: structureKinds, shape: "outline" },
  { col: "fences", name: "Fence", kinds: fenceKinds, shape: "path" },
  { col: "edges", name: "Edge", kinds: edgeKinds, shape: "path" },
  { col: "features", name: "Feature", kinds: featureKinds, shape: "point" },
];

export function Toolbar(props: { editor: Editor }) {
  const ed = props.editor;
  const active = (col: Collection) => {
    const t = ed.tool();
    return t.mode === "draw" && t.col === col ? t.kind : "";
  };
  const hint = () => {
    const t = ed.tool();
    if (t.mode === "select") return "Drag to move. Drag a dot to reshape.";
    if (t.shape === "point") return "Click the plan to place it. Esc cancels.";
    return "Click to add points. Double-click or Enter to finish. Esc cancels.";
  };
  return (
    <div class="toolbar">
      <button type="button" aria-pressed={ed.tool().mode === "select"} onClick={() => ed.setTool({ mode: "select" })}>
        Select
      </button>
      <For each={GROUPS}>
        {(g) => (
          <select
            id={`add-${g.col}`}
            aria-label={`Add ${g.name.toLowerCase()}`}
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
      <span class="hint">{hint()}</span>
    </div>
  );
}
