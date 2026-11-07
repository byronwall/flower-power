import { createSignal, onCleanup, Show } from "solid-js";
import type { Property } from "../model/property";
import { bounds } from "../render/geometry";
import { scaleProperty, type Editor } from "./state";

export type ImportResult = { property: Property; raw: { imageWidthFt: number; scaleBasis: string } };

// One aerial plus any listing photos. The aerial is the file named like one, else the first image.
export async function importPhotos(files: File[], name: string): Promise<ImportResult> {
  const imgs = files.filter((f) => f.type === "image/jpeg" || f.type === "image/png");
  if (!imgs.length) throw new Error("Add an aerial image (JPEG or PNG).");
  const aerial = imgs.find((f) => /aerial|satellite|overhead/i.test(f.name)) ?? imgs[0];
  const form = new FormData();
  form.set("name", name);
  form.set("aerial", aerial);
  for (const f of imgs) if (f !== aerial) form.append("photos", f);
  const res = await fetch("/api/ai/import", { method: "POST", body: form });
  const body = await res.json().catch(() => ({ error: `The import failed with status ${res.status}.` }));
  if (!res.ok || body.error) throw new Error(body.error ?? `The import failed with status ${res.status}.`);
  return body;
}

export function ImportButton(props: { onFiles: (files: File[]) => void; disabled: boolean }) {
  let input!: HTMLInputElement;
  return (
    <>
      <button type="button" disabled={props.disabled} onClick={() => input.click()} title="Pick one aerial image and any listing photos, or drop them on the plan">
        New from photos
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        multiple
        hidden
        onChange={(e) => {
          const files = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = "";
          if (files.length) props.onFiles(files);
        }}
      />
    </>
  );
}

const EXPECTED_S = 30;

export function ImportProgress(props: { count: number }) {
  const start = Date.now();
  const [secs, setSecs] = createSignal(0);
  const timer = setInterval(() => setSecs(Math.round((Date.now() - start) / 1000)), 1000);
  onCleanup(() => clearInterval(timer));
  return (
    <div class="import-progress" role="status">
      <div>
        <strong>Tracing the lot from {props.count === 1 ? "the aerial" : `${props.count} images`}…</strong>
        <div class="track">
          <div class="fill" style={{ width: `${Math.min(95, (secs() / EXPECTED_S) * 100)}%` }} />
        </div>
        <span class="muted">
          {secs()} s. This usually takes about {EXPECTED_S} s.
        </span>
      </div>
    </div>
  );
}

// After an import: the size the AI used, as one editable number. A change rescales the plan and photo in one undo step.
export function ScaleBanner(props: { editor: Editor; basis: string; onClose: () => void }) {
  const ed = props.editor;
  const houseW = () => Math.round(bounds(ed.property().house.outline).w);
  const lot = () => bounds(ed.property().lot.outline);
  const aerialW = () => {
    const u = ed.property().underlay;
    return u ? Math.round(u.sizePx[0] * u.ftPerPx) : 0;
  };
  const guesses = () => ed.property().plantings.filter((p) => p.guess).length;
  const rescale = (value: number) => {
    if (!(value > 0) || !houseW()) return;
    ed.update((p) => scaleProperty(p, value / bounds(p.house.outline).w));
  };
  return (
    <div class="import-banner" role="region" aria-label="Check the scale">
      <label>
        House ≈{" "}
        <input id="scale-house" type="number" min="5" step="1" value={houseW()} onChange={(e) => rescale(Number(e.currentTarget.value))} aria-label="House width in feet" /> ft
        wide
      </label>
      <span class="muted">
        Aerial ≈ {aerialW()} ft wide, lot ≈ {Math.round(lot().w)} × {Math.round(lot().h)} ft.
      </span>
      <span class="muted basis" title={props.basis}>
        The AI's first estimate: {props.basis}
      </span>
      <Show when={guesses()}>
        <span class="guess-count">
          {guesses()} {guesses() === 1 ? "plant is a guess" : "plants are guesses"} (dashed)
        </span>
      </Show>
      <button type="button" onClick={props.onClose}>
        Looks right
      </button>
    </div>
  );
}
