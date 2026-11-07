import { useSearchParams } from "@solidjs/router";
import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { PlanView } from "../../components/PlanView";
import type { ImportRaw } from "../../ai/importShape";
import type { Property } from "../../model/property";
import type { ViewTime } from "../../render/look";

// Dev page for the import eval: every case of one iteration, with the model's trace over the aerial,
// the converted plan in the real renderer (aerial underlay optional), and the scores.
// Data comes from tmp/import-eval/<iteration>/, written by scripts/eval-import.ts.

type Row = { case: string; run: number; pass: boolean; scaleErr: number; houseIoU: number; lotErr: number; plants: number; treesOk: boolean; beds: number; fails: string; tokens: number; calls: number; sec: number; error?: string };
type Stat = { median: number; worst: number };
type Summary = { iter: string; model: string; passed: number; runs: number; calls: number; tokens: { input: number; output: number }; scaleErr: Stat; houseIoU: Stat; lotErr: Stat; rows: Row[]; byCase: { case: string; passed: number; runs: number }[] };
type Truth = { name: string; tags?: string[]; variant?: string; houseBoxPx: number[]; lotFt2?: number; trees?: [number, number] };
type Run = { row: Row; truth: Truth; raw: ImportRaw; property: Property; aerial: { file: string; width: number; height: number }; photos: number };

const files = (p: string) => `/dev/files/${p}`;
const getJson = <T,>(p: string): Promise<T> => fetch(files(p)).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${p}: ${r.status}`))));
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function EvalDev() {
  const [params, setParams] = useSearchParams();
  const [iters] = createResource(() => getJson<string[]>("import-eval").then((xs) => xs.filter((x) => !x.includes("."))));
  const iter = () => (params.iter as string) || iters()?.at(-1) || "";
  const [summary] = createResource(iter, (i) => (i ? getJson<Summary>(`import-eval/${i}/summary.json`) : Promise.resolve(null)));
  const [underlay, setUnderlay] = createSignal(params.underlay !== "0");
  const [opacity, setOpacity] = createSignal(0.35);
  const cases = createMemo(() => (summary()?.byCase ?? []).filter((c) => !params.case || (params.case as string).split(",").includes(c.case)));

  return (
    <div class="ev">
      <style>{css}</style>
      <header class="ev-head">
        <h1>Import eval</h1>
        <select value={iter()} onChange={(e) => setParams({ iter: e.currentTarget.value })}>
          <For each={iters() ?? []}>{(i) => <option value={i}>{i}</option>}</For>
        </select>
        <label>
          <input type="checkbox" checked={underlay()} onChange={(e) => setUnderlay(e.currentTarget.checked)} /> Aerial underlay
        </label>
        <label>
          Opacity <input type="range" min="0" max="1" step="0.05" value={opacity()} onInput={(e) => setOpacity(Number(e.currentTarget.value))} />
        </label>
        <Show when={summary()}>
          {(s) => (
            <div class="ev-stats">
              <b class={s().passed / s().runs >= 0.9 ? "ok" : "bad"}>
                {s().passed}/{s().runs} pass ({pct(s().passed / s().runs)})
              </b>
              <span>Scale err median {pct(s().scaleErr.median)}, worst {pct(s().scaleErr.worst)}</span>
              <span>House IoU median {s().houseIoU.median.toFixed(2)}, worst {s().houseIoU.worst.toFixed(2)}</span>
              <span>Lot err median {pct(s().lotErr.median)}, worst {pct(s().lotErr.worst)}</span>
              <span class="muted">
                {s().model} · {s().calls} calls · {Math.round(s().tokens.input / 1000)}k in / {Math.round(s().tokens.output / 1000)}k out
              </span>
            </div>
          )}
        </Show>
      </header>
      <main class="ev-grid">
        <For each={cases()}>{(c) => <CaseCard iter={iter()} name={c.case} passed={c.passed} runs={c.runs} underlay={underlay()} opacity={opacity()} run={Number(params.run) || 1} />}</For>
      </main>
    </div>
  );
}

function CaseCard(props: { iter: string; name: string; passed: number; runs: number; underlay: boolean; opacity: number; run: number }) {
  const [run, setRun] = createSignal(Math.min(props.run, props.runs));
  const [data] = createResource(() => `import-eval/${props.iter}/${props.name}-${run()}.json`, (p) => getJson<Run>(p).catch(() => null));
  const time: ViewTime = { month: 6, year: 3 };
  const src = (d: Run) => files(`listings/${props.name}/${d.aerial.file}`);
  return (
    <section class="ev-card">
      <div class="ev-card-head">
        <h2>{props.name}</h2>
        <span class={`ev-badge ${props.passed === props.runs ? "ok" : props.passed ? "warn" : "bad"}`}>
          {props.passed}/{props.runs}
        </span>
        <div class="ev-runs">
          <For each={Array.from({ length: props.runs }, (_, i) => i + 1)}>
            {(r) => (
              <button type="button" classList={{ on: r === run() }} onClick={() => setRun(r)}>
                run {r}
              </button>
            )}
          </For>
        </div>
      </div>
      <Show when={data()} fallback={<p class="muted ev-missing">{data.loading ? "Loading…" : "No result for this run (error)."}</p>}>
        {(d) => (
          <>
            <p class="ev-tags muted">
              {d().truth.name} · {(d().truth.tags ?? []).join(", ")}
              {d().truth.variant ? ` · variant: ${d().truth.variant}` : ""} · {d().photos} photos · {d().aerial.width}×{d().aerial.height}
            </p>
            <div class="ev-pair">
              <Trace run={d()} src={src(d())} />
              <div class="ev-plan">
                <PlanView
                  property={d().property}
                  time={time}
                  overlay={() => (
                    <Show when={props.underlay && d().property.underlay}>
                      {(u) => <image href={src(d())} x={u().originFt[0]} y={u().originFt[1]} width={u().sizePx[0] * u().ftPerPx} height={u().sizePx[1] * u().ftPerPx} opacity={props.opacity} preserveAspectRatio="none" />}
                    </Show>
                  )}
                />
              </div>
            </div>
            <Metrics run={d()} />
          </>
        )}
      </Show>
    </section>
  );
}

function Metrics(props: { run: Run }) {
  const r = () => props.run.row;
  const p = () => props.run.property;
  const lot = () => {
    const xs = p().lot.outline.map((q) => q[0]);
    const ys = p().lot.outline.map((q) => q[1]);
    return `${Math.round(Math.max(...xs))}×${Math.round(Math.max(...ys))} ft`;
  };
  return (
    <div class="ev-metrics">
      <span classList={{ bad: r().scaleErr > 0.25 }}>scale {pct(r().scaleErr)}</span>
      <span classList={{ bad: r().houseIoU < 0.5 }}>house IoU {r().houseIoU.toFixed(2)}</span>
      <span classList={{ bad: r().lotErr > 0.35 }}>lot {pct(r().lotErr)}</span>
      <span>lot {lot()}</span>
      <span classList={{ warn: !r().treesOk }}>
        {r().plants} trees{props.run.truth.trees ? ` (want ${props.run.truth.trees.join("-")})` : ""}
      </span>
      <span>{r().beds} beds</span>
      <span>
        {p().surfaces.length} surf · {p().structures.length} struct · {p().fences.length} fence
      </span>
      <Show when={r().fails}>
        <span class="bad">fails: {r().fails}</span>
      </Show>
      <span class="muted">
        {r().calls} call{r().calls > 1 ? "s" : ""} · {Math.round(r().tokens / 1000)}k tok · {r().sec}s
      </span>
    </div>
  );
}

// The model's trace on its 0-1000 grid over the aerial, with the hand-labeled house box dashed.
function Trace(props: { run: Run; src: string }) {
  const raw = () => props.run.raw;
  const a = () => props.run.aerial;
  const pts = (o: { x: number; y: number }[]) => o.map((p) => `${p.x},${p.y}`).join(" ");
  const box = () => {
    const [x0, y0, x1, y1] = props.run.truth.houseBoxPx;
    const sx = 1000 / a().width;
    const sy = 1000 / a().height;
    return { x: x0 * sx, y: y0 * sy, w: (x1 - x0) * sx, h: (y1 - y0) * sy };
  };
  return (
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" class="ev-trace" style={{ "aspect-ratio": `${a().width} / ${a().height}` }}>
      <image href={props.src} width="1000" height="1000" preserveAspectRatio="none" />
      <polygon points={pts(raw().lot)} fill="none" stroke="#ffd400" stroke-width="5" />
      <For each={raw().surfaces}>{(s) => <polygon points={pts(s.outline)} fill="none" stroke={s.kind === "lawn" ? "#34c759" : "#0a84ff"} stroke-width="3" />}</For>
      <For each={raw().structures}>{(s) => <polygon points={pts(s.outline)} fill="none" stroke="#af52de" stroke-width="3" />}</For>
      <For each={raw().beds}>{(b) => <polygon points={pts(b.outline)} fill="rgba(191,90,242,.25)" stroke="#bf5af2" stroke-width="3" />}</For>
      <polygon points={pts(raw().house.outline)} fill="rgba(255,59,48,.2)" stroke="#ff3b30" stroke-width="4" />
      <rect x={box().x} y={box().y} width={box().w} height={box().h} fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="10 7" />
      <For each={raw().fences}>{(f) => <polyline points={pts(f.path)} fill="none" stroke="#ff9500" stroke-width="5" />}</For>
      <For each={raw().plants}>{(p) => <circle cx={p.at.x} cy={p.at.y} r="9" fill="#30d158" stroke="#000" stroke-width="2" />}</For>
    </svg>
  );
}

const css = `
.ev { min-height: 100vh; background: #f6f4ef; color: #222; font: 13px system-ui, sans-serif; }
.ev-head { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; padding: 10px 16px; background: #fff; border-bottom: 1px solid #ddd; }
.ev-head h1 { font-size: 16px; margin: 0; }
.ev-stats { display: flex; flex-wrap: wrap; gap: 4px 14px; }
.ev .muted { color: #777; }
.ev .ok { color: #1e7d32; }
.ev .warn { color: #a66b00; }
.ev .bad { color: #b3261e; }
.ev-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 640px), 1fr)); gap: 14px; padding: 14px 16px; }
.ev-card { background: #fff; border: 1px solid #ddd; border-radius: 6px; padding: 10px 12px; min-width: 0; }
.ev-card-head { display: flex; align-items: center; gap: 8px; }
.ev-card-head h2 { font-size: 14px; margin: 0; }
.ev-badge { font-weight: 600; }
.ev-runs { margin-left: auto; display: flex; gap: 4px; }
.ev-runs button { font-size: 11px; padding: 2px 6px; border: 1px solid #ccc; background: #fafafa; border-radius: 4px; cursor: pointer; }
.ev-runs button.on { background: #222; color: #fff; border-color: #222; }
.ev-tags { margin: 4px 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ev-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: start; }
.ev-trace { width: 100%; display: block; background: #000; }
.ev-plan { position: relative; aspect-ratio: 1; display: flex; border: 1px solid #eee; }
.ev-metrics { display: flex; flex-wrap: wrap; gap: 2px 12px; margin-top: 8px; }
.ev-missing { padding: 40px 0; text-align: center; }
`;
