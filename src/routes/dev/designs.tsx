import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { PlanView } from "../../components/PlanView";
import { Ghost, opLabel, opTone } from "../../design/Ghost";
import { applyOps, type Design, type Review } from "../../model/design";
import type { Point, Property } from "../../model/property";
import type { ViewTime } from "../../render/look";

// Dev contact page for the design engine. It reads the newest eval run from tmp/design-eval/latest.json.
// Each design draws in the real PlanView, with the ghost overlay of its ops and the reasons beside it.

type Row = { style: string; raw: number; kept: number; changes: number; fit: number; dialBad: number; hardBad: number; scopeBad: number; safetyBad: number; dropped: string[] };
type Result = {
  case: { id: string; goals: string; dial: string; scope?: Point[] };
  property: Property;
  review: Review | null;
  designs: Design[];
  score: { summary: Record<string, string | number | boolean>; rows: Row[] };
  usage: { total_tokens: number };
  errors: string[];
};
type EvalFile = { model: string; at: string; plants: number; results: Result[] };

async function loadEval(): Promise<EvalFile | null> {
  "use server";
  const { readFile } = await import("node:fs/promises");
  const text = await readFile("tmp/design-eval/latest.json", "utf8").catch(() => null);
  return text ? JSON.parse(text) : null;
}

const time: ViewTime = { month: 6, year: 3 };

export default function DesignsDev() {
  const [data] = createResource(loadEval);
  const [pick, setPick] = createSignal(0);
  const current = () => data()?.results[pick()];
  return (
    <div class="dev-designs">
      <nav class="dd-cases">
        <h1>Design engine</h1>
        <Show when={data()} fallback={<p class="muted">Run pnpm tsx scripts/eval-design.ts first.</p>}>
          {(d) => (
            <>
              <p class="muted">
                {d().model} · {d().plants} plants · {new Date(d().at).toLocaleString()}
              </p>
              <For each={d().results}>
                {(r, i) => (
                  <button type="button" classList={{ on: pick() === i() }} onClick={() => setPick(i())}>
                    <span class={r.score.summary.pass ? "dd-pass" : "dd-fail"}>{r.score.summary.pass ? "pass" : "fail"}</span> {r.case.id}
                    <br />
                    <span class="muted">
                      survival {r.score.summary.survival} · overlap {r.score.summary.meanOverlap} · fit {r.score.summary.fit}
                    </span>
                  </button>
                )}
              </For>
            </>
          )}
        </Show>
      </nav>
      <main class="dd-main">
        <Show when={current()}>{(r) => <CaseView r={r()} />}</Show>
      </main>
    </div>
  );
}

function CaseView(props: { r: Result }) {
  const s = () => props.r.score.summary;
  return (
    <>
      <header class="dd-head">
        <h2>{props.r.case.id}</h2>
        <p class="muted">
          Goals: {props.r.case.goals} · dial: {props.r.case.dial} · {props.r.designs.length} designs · {props.r.usage.total_tokens} tokens
          {s().fails ? ` · fails: ${s().fails}` : ""}
        </p>
        <For each={props.r.errors}>{(e) => <p class="dev-error">{e}</p>}</For>
      </header>
      <Show when={props.r.review}>
        {(rv) => (
          <section>
            <p>{rv().summary}</p>
            <div class="dd-review">
              <Spots title="What works" list={rv().works} />
              <Spots title="What doesn't" list={rv().doesnt} />
              <Spots title="Empty spots" list={rv().empty} />
            </div>
          </section>
        )}
      </Show>
      <div class="dd-grid">
        <article class="dd-card">
          <header>
            <h3>As it is</h3>
            <p class="muted">{props.r.property.name}</p>
          </header>
          <PlanView property={props.r.property} time={time} overlay={() => <Ghost base={props.r.property} ops={[]} scope={props.r.case.scope} />} />
          <div />
        </article>
        <For each={props.r.designs}>{(d, i) => <DesignCard base={props.r.property} d={d} row={props.r.score.rows[i()]} />}</For>
      </div>
    </>
  );
}

function Spots(props: { title: string; list: Review["works"] }) {
  return (
    <div>
      <h3>{props.title}</h3>
      <ul>
        <For each={props.list}>{(x) => <li>{x.note}</li>}</For>
      </ul>
    </div>
  );
}

function DesignCard(props: { base: Property; d: Design; row?: Row }) {
  const [sel, setSel] = createSignal<number>();
  const after = createMemo(() => applyOps(props.base, props.d.ops));
  return (
    <article class="dd-card">
      <header>
        <h3>
          {props.d.name} <span class="muted">· {props.d.style}</span>
        </h3>
        <p>{props.d.summary}</p>
        <Show when={props.row}>
          {(r) => (
            <p class="dd-stats">
              {r().kept} of {r().raw} ops kept · {r().changes} changes · goal fit {Math.round(r().fit * 100)}%
              {r().dialBad + r().hardBad + r().scopeBad + r().safetyBad ? ` · ${r().dialBad + r().hardBad + r().scopeBad + r().safetyBad} rule breaks` : ""}
            </p>
          )}
        </Show>
      </header>
      <PlanView property={after()} time={time} overlay={() => <Ghost base={props.base} ops={props.d.ops} scope={props.d.scope} selected={sel()} onPick={setSel} />} />
      <div class="dd-ops">
        <ul>
          <For each={props.d.ops}>
            {(o, i) => (
              <li onMouseEnter={() => setSel(i())} onMouseLeave={() => setSel(undefined)}>
                <span class={`dd-tag ${opTone(o.op)}`}>{o.op}</span> {opLabel(props.base, o)}
                <span class="muted"> · {o.reason}</span>
              </li>
            )}
          </For>
        </ul>
        <Show when={props.d.dropped?.length}>
          <h3 class="dd-dropped">Dropped by the checks</h3>
          <ul class="dd-dropped">
            <For each={props.d.dropped}>{(x) => <li>{x}</li>}</For>
          </ul>
        </Show>
      </div>
    </article>
  );
}
