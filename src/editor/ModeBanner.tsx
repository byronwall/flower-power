import { Show } from "solid-js";
import { plantsById } from "../model/library";
import { label } from "./Inspector";
import type { Editor } from "./state";

// A pill floating over the plan that says what the active tool is and how to use it.
// It is the one place a person looks when unsure what a click will do.
export function ModeBanner(props: { editor: Editor }) {
  const ed = props.editor;
  const info = () => {
    const t = ed.tool();
    if (t.mode !== "draw") return null;
    const what = t.col === "plantings" ? plantsById.get(t.plantId!)?.commonName ?? t.kind : label(t.kind);
    const verb = t.col === "plantings" ? (t.type === "region" ? "Filling an area with" : t.type === "row" ? "Planting a row of" : "Placing") : "Drawing";
    const how =
      t.shape === "point"
        ? "Click the plan where it should go."
        : t.shape === "outline"
          ? "Click around the area to outline it. Double-click or press Enter to finish."
          : "Click along the line. Double-click or press Enter to finish.";
    return { verb, what, how };
  };

  return (
    <Show
      when={info()}
      fallback={
        <Show when={!ed.selected()}>
          <div class="mode-banner idle" role="status">
            Drag a plant from the left onto the plan, or click anything on the plan to edit it.
          </div>
        </Show>
      }
    >
      {(i) => (
        <div class="mode-banner" role="status">
          <span class="mode-dot" aria-hidden="true" />
          <span>
            <strong>
              {i().verb} {i().what}
            </strong>
            <span class="mode-how">{i().how}</span>
          </span>
          <button type="button" onClick={() => ed.setTool({ mode: "select" })} title="Cancel (Esc)">
            Cancel <kbd>Esc</kbd>
          </button>
        </div>
      )}
    </Show>
  );
}
