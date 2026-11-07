import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { PlanView } from "../../components/PlanView";
import { slug, toProperty, type Aerial, type ImportRaw } from "../../ai/importShape";
import { saveProperty } from "../../model/library";
import type { ViewTime } from "../../render/look";

// Dev page for the image import, apart from the main editor.
// Left: what the model traced, on its 0-1000 grid over the aerial. Right: the converted plan over the photo.

type Result = { run: string; raw: ImportRaw; aerial: Aerial; usage?: { input_tokens: number; output_tokens: number }; ms: number; model: string };

export default function ImportDev() {
  const [runs, { refetch }] = createResource<string[]>(() => fetch("/api/ai/import").then((r) => r.json()));
  const [name, setName] = createSignal("Imported lot");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [result, setResult] = createSignal<Result | null>(null);
  const [widthFt, setWidthFt] = createSignal(0);
  const [opacity, setOpacity] = createSignal(0.6);
  const [saved, setSaved] = createSignal("");
  const time: ViewTime = { month: 6, year: 3 };
  let aerialInput!: HTMLInputElement;
  let photosInput!: HTMLInputElement;

  // The width estimate is the one number a person may fix; the plan is rebuilt from the raw trace.
  const property = createMemo(() => {
    const r = result();
    if (!r) return null;
    try {
      return toProperty({ ...r.raw, imageWidthFt: widthFt() || r.raw.imageWidthFt }, { id: slug(name()), name: name(), aerial: r.aerial });
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  });

  async function send(form: FormData) {
    setBusy(true);
    setError("");
    setSaved("");
    form.set("name", name());
    try {
      const res = await fetch("/api/ai/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json);
      setWidthFt(Math.round(json.raw.imageWidthFt));
      refetch();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function run() {
    const form = new FormData();
    const aerial = aerialInput.files?.[0];
    if (!aerial) return setError("Pick an aerial image first.");
    form.set("aerial", aerial);
    for (const f of photosInput.files ?? []) form.append("photos", f);
    send(form);
  }

  function replay(run: string) {
    const form = new FormData();
    form.set("replay", run);
    send(form);
  }

  async function save() {
    const p = property();
    if (!p) return;
    try {
      await saveProperty(p);
      setSaved(`Saved as data/properties/${p.id}.json`);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div class="dev-import">
      <aside class="dev-side">
        <h1>Image import</h1>
        <p class="muted">Dev page. Upload an overhead aerial (north up) and any listing photos.</p>
        <label class="field">
          <span>Name</span>
          <input value={name()} onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        <label class="field">
          <span>Aerial</span>
          <input ref={aerialInput} type="file" accept="image/jpeg,image/png" />
        </label>
        <label class="field">
          <span>Photos</span>
          <input ref={photosInput} type="file" accept="image/jpeg,image/png" multiple />
        </label>
        <button type="button" class="primary" disabled={busy()} onClick={run}>
          {busy() ? "Tracing… (about a minute)" : "Run import"}
        </button>
        <Show when={error()}>
          <p class="dev-error">{error()}</p>
        </Show>
        <Show when={result()}>
          {(r) => (
            <section>
              <h2>Result</h2>
              <p class="muted">
                {r().model} · {r().usage ? `${r().usage!.input_tokens} in / ${r().usage!.output_tokens} out tokens` : ""} · {Math.round(r().ms / 1000)} s
              </p>
              <label class="field">
                <span>Aerial width (ft)</span>
                <input type="number" value={widthFt()} onInput={(e) => setWidthFt(Number(e.currentTarget.value))} />
              </label>
              <p class="muted">Scale basis: {r().raw.scaleBasis}</p>
              <Show when={property()}>
                {(p) => {
                  const xs = () => p().lot.outline.map((q) => q[0]);
                  const ys = () => p().lot.outline.map((q) => q[1]);
                  return (
                    <p class="muted">
                      Lot {Math.round(Math.max(...xs()))} × {Math.round(Math.max(...ys()))} ft · {p().surfaces.length} surfaces · {p().structures.length} structures · {p().fences.length} fences · {p().plantings.length} plantings
                    </p>
                  );
                }}
              </Show>
              <p class="muted">{r().raw.notes}</p>
              <label class="field">
                <span>Photo opacity</span>
                <input type="range" min="0" max="1" step="0.05" value={opacity()} onInput={(e) => setOpacity(Number(e.currentTarget.value))} />
              </label>
              <button type="button" onClick={save}>
                Save as property
              </button>
              <Show when={saved()}>
                <p class="muted">{saved()}</p>
              </Show>
            </section>
          )}
        </Show>
        <h2>Past runs</h2>
        <ul class="dev-runs">
          <For each={runs() ?? []} fallback={<li class="muted">None yet</li>}>
            {(r) => (
              <li>
                <button type="button" disabled={busy()} onClick={() => replay(r)}>
                  {r.replace(/-import$/, "")}
                </button>
              </li>
            )}
          </For>
        </ul>
      </aside>
      <Show when={result()} fallback={<div class="dev-empty muted">Run an import or replay a past run.</div>}>
        {(r) => (
          <>
            <figure class="dev-trace">
              <figcaption>What the model traced</figcaption>
              <Trace raw={r().raw} src={`/api/images/${r().aerial.name}`} />
            </figure>
            <figure class="dev-plan">
              <figcaption>Converted plan</figcaption>
              <Show when={property()}>
                {(p) => (
                  <PlanView
                    property={p()}
                    time={time}
                    overlay={() => (
                      <Show when={p().underlay}>
                        {(u) => <image href={`/api/images/${u().file}`} x={u().originFt[0]} y={u().originFt[1]} width={u().sizePx[0] * u().ftPerPx} height={u().sizePx[1] * u().ftPerPx} opacity={opacity()} preserveAspectRatio="none" />}
                      </Show>
                    )}
                  />
                )}
              </Show>
            </figure>
          </>
        )}
      </Show>
    </div>
  );
}

function Trace(props: { raw: ImportRaw; src: string }) {
  const pts = (o: { x: number; y: number }[]) => o.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg viewBox="0 0 1000 1000" class="dev-trace-svg">
      <image href={props.src} width="1000" height="1000" preserveAspectRatio="none" />
      <polygon points={pts(props.raw.lot)} fill="none" stroke="#ffd400" stroke-width="4" />
      <For each={props.raw.surfaces}>{(s) => <polygon points={pts(s.outline)} fill="none" stroke={s.kind === "lawn" ? "#34c759" : "#0a84ff"} stroke-width="3" />}</For>
      <For each={props.raw.structures}>{(s) => <polygon points={pts(s.outline)} fill="none" stroke="#af52de" stroke-width="3" />}</For>
      <For each={props.raw.beds}>{(b) => <polygon points={pts(b.outline)} fill="rgba(191,90,242,.25)" stroke="#bf5af2" stroke-width="3" />}</For>
      <polygon points={pts(props.raw.house.outline)} fill="rgba(255,59,48,.2)" stroke="#ff3b30" stroke-width="4" />
      <For each={props.raw.fences}>{(f) => <polyline points={pts(f.path)} fill="none" stroke="#ff9500" stroke-width="5" />}</For>
      <For each={props.raw.plants}>
        {(p) => (
          <g>
            <circle cx={p.at.x} cy={p.at.y} r="9" fill="#30d158" stroke="#000" />
            <text x={p.at.x + 12} y={p.at.y + 5} fill="#fff" stroke="#000" stroke-width="0.6" font-size="18">
              {p.plantId}
            </text>
          </g>
        )}
      </For>
    </svg>
  );
}
