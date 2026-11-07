import { createMemo, createSignal, For, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { plantFiles, type PlantFile } from "./plant-files";
import "./dev.css";

// Dev only: every plant file with all its properties, its audit gaps, and live checks of its
// photo and source URLs. Reached at /dev/plants while running `pnpm dev`.

type Check = { state: "checking" } | { state: "ok" | "broken"; status: number; note: string };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const months = (m?: number[]) => (m?.length ? m.map((n) => MONTHS[n - 1] ?? n).join(", ") : "—");
const show = (v: unknown) => (v === undefined ? "—" : v === null ? "none" : Array.isArray(v) ? v.join(", ") || "—" : String(v));

export default function PlantViewer() {
  const files = plantFiles();
  const [checks, setChecks] = createStore<Record<string, Check>>({});
  const [query, setQuery] = createSignal("");
  const [onlyProblems, setOnlyProblems] = createSignal(false);
  const [running, setRunning] = createSignal(false);

  const urls = [...new Set(files.flatMap(urlsOf))];
  const broken = () => urls.filter((u) => checks[u]?.state === "broken").length;
  const hasProblem = (f: PlantFile) =>
    f.errors.length > 0 || f.missing.length > 0 || urlsOf(f).some((u) => checks[u]?.state === "broken");

  const shown = createMemo(() => {
    const q = query().trim().toLowerCase();
    return files.filter(
      (f) =>
        (!q || [f.file, f.data.commonName, f.data.botanicalName].some((s) => String(s ?? "").toLowerCase().includes(q))) &&
        (!onlyProblems() || hasProblem(f)),
    );
  });

  async function checkUrl(url: string, photo: boolean) {
    setChecks(url, { state: "checking" });
    try {
      const res = await fetch(`/api/dev/check-url?url=${encodeURIComponent(url)}`);
      const r = await res.json();
      if (!res.ok) return setChecks(url, { state: "broken", status: res.status, note: r.error ?? "Check failed" });
      const notImage = photo && r.ok && !String(r.contentType).startsWith("image/");
      setChecks(url, {
        state: r.ok && !notImage ? "ok" : "broken",
        status: r.status,
        note: r.error ?? (notImage ? `Not an image (${r.contentType || "no type"})` : r.contentType),
      });
    } catch (e) {
      setChecks(url, { state: "broken", status: 0, note: (e as Error).message });
    }
  }

  async function checkAll() {
    setRunning(true);
    const photoUrls = new Set(files.flatMap((f) => (f.data.images?.photos ?? []).map((p: any) => p.url)));
    const queue = [...urls];
    // A few at a time, so the sites are not flooded.
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        for (let u = queue.shift(); u; u = queue.shift()) await checkUrl(u, photoUrls.has(u));
      }),
    );
    setRunning(false);
  }

  return (
    <div class="dev">
      <header class="dev-bar">
        <div>
          <h1>Plant data</h1>
          <p class="dev-note">Dev only. Not part of the app.</p>
        </div>
        <dl class="dev-stats">
          <Stat label="Plants" value={files.length} />
          <Stat label="Schema errors" value={files.filter((f) => f.errors.length).length} bad />
          <Stat label="Audit complete" value={files.filter((f) => !f.errors.length && !f.missing.length).length} />
          <Stat label="Verified" value={files.filter((f) => f.data.verified === true).length} />
          <Stat label="With photos" value={files.filter((f) => f.data.images?.photos?.length).length} />
          <Stat label="Broken URLs" value={broken()} bad />
        </dl>
        <div class="dev-controls">
          <input type="search" placeholder="Filter by name or file" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
          <label>
            <input type="checkbox" checked={onlyProblems()} onChange={(e) => setOnlyProblems(e.currentTarget.checked)} /> Only plants with problems
          </label>
          <button onClick={checkAll} disabled={running()}>
            {running() ? "Checking…" : `Check all ${urls.length} URLs`}
          </button>
        </div>
      </header>
      <p class="dev-count">
        Showing {shown().length} of {files.length}
      </p>
      <main class="dev-grid">
        <For each={shown()}>{(f) => <PlantCard file={f} checks={checks} onCheck={checkUrl} />}</For>
      </main>
    </div>
  );
}

function urlsOf(f: PlantFile): string[] {
  const photos = (f.data.images?.photos ?? []).flatMap((p: any) => [p?.url, p?.sourceUrl]);
  return [...(f.data.sources ?? []).map((s: any) => s?.url), ...photos].filter(Boolean);
}

function Stat(props: { label: string; value: number; bad?: boolean }) {
  return (
    <div classList={{ "dev-stat": true, bad: !!props.bad && props.value > 0 }}>
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
    </div>
  );
}

function PlantCard(props: { file: PlantFile; checks: Record<string, Check>; onCheck: (url: string, photo: boolean) => void }) {
  const p = props.file.data;
  const photos: any[] = p.images?.photos ?? [];
  const size = p.size ?? {};

  return (
    <article class="dev-card">
      <div class="dev-photos">
        <Show when={photos.length} fallback={<div class="dev-nophoto">No photo</div>}>
          <For each={photos}>{(ph) => <Photo photo={ph} check={props.checks[ph.url]} onCheck={() => props.onCheck(ph.url, true)} />}</For>
        </Show>
      </div>
      <div class="dev-body">
        <h2>{show(p.commonName)}</h2>
        <p class="dev-sci">
          <i>{show(p.botanicalName)}</i> · <code>{props.file.file}</code>
        </p>
        <div class="dev-chips">
          <span classList={{ chip: true, good: p.verified === true }}>{p.verified ? "verified" : "draft"}</span>
          <For each={props.file.errors}>{(e) => <span class="chip bad">{e}</span>}</For>
          <For each={props.file.missing}>{(m) => <span class="chip warn">missing {m}</span>}</For>
        </div>

        <h3>Plant object</h3>
        <dl class="dev-props">
          <Prop label="Lifespan" value={p.lifespanYears ? `${p.lifespanYears[0]}–${p.lifespanYears[1]} years` : undefined} />
          <Prop label="Size" value={size.heightFt ? `${size.heightFt} ft tall, ${size.spreadFt} ft wide (${size.plantedSpreadFt} ft when planted, ${size.yearsToMature} yr to mature)` : undefined} />
          <Prop label="Spacing" value={size.spacingFt ? `${size.spacingFt} ft` : undefined} />
          <Prop label="Needs a mate" value={p.pollination ? (p.pollination.needsPartner ? `Yes${p.pollination.partner ? `: ${p.pollination.partner}` : ""}` : "No") : undefined} />
          <Prop label="Lifecycle" value={p.lifecycle} />
          <Prop label="Emerges" value={p.emerges === undefined ? undefined : p.emerges === null ? "Shows all year" : MONTHS[p.emerges - 1]} />
          <Prop label="How to plant" value={p.planting ? `${p.planting.method}${p.planting.depthIn !== undefined ? `, ${p.planting.depthIn} in deep` : ""}${p.planting.note ? ` (${p.planting.note})` : ""}` : undefined} />
          <Prop label="Sun" value={p.sun} />
          <Prop label="Water" value={p.water} />
          <Prop label="Plant in" value={months(p.plantingMonths)} />
        </dl>

        <h3>Color</h3>
        <dl class="dev-props">
          <div>
            <dt>Bloom</dt>
            <dd>
              {p.bloom ? <>{months(p.bloom.months)} <Swatches colors={p.bloom.colors} /></> : "none"}
            </dd>
          </div>
          <div>
            <dt>Fruit</dt>
            <dd>{p.fruit ? <>{months(p.fruit.months)} <Swatches colors={[p.fruit.color]} /></> : "none"}</dd>
          </div>
          <div>
            <dt>Foliage</dt>
            <dd class="dev-seasons">
              <For each={["spring", "summer", "fall", "winter"]}>
                {(s) => (
                  <span>
                    {s} <Swatches colors={[p.foliage?.[s]]} />
                  </span>
                )}
              </For>
            </dd>
          </div>
        </dl>

        <h3>Other</h3>
        <dl class="dev-props">
          <Prop label="Category" value={p.category} />
          <Prop label="Native to Indiana" value={p.nativeToIndiana} />
          <Prop label="Evergreen" value={p.evergreen} />
          <Prop label="Placement" value={p.placement} />
          <Prop label="Form" value={p.render?.form} />
          <Prop label="Zones" value={p.zones ? `${p.zones[0]}–${p.zones[1]}` : undefined} />
          <Prop label="Soil" value={p.soil} />
          <Prop label="Wildlife" value={p.wildlife} />
          <Prop label="Effort" value={p.effort} />
          <Prop label="Thorns / pet toxic / lift" value={`${show(p.thorns)} / ${show(p.toxicToPets)} / ${show(p.liftAndStore)}`} />
          <Prop label="Care" value={(p.care ?? []).map((c: any) => `${MONTHS[c.month - 1]}: ${c.task}`).join("; ") || undefined} />
        </dl>

        <h3>Sources</h3>
        <ul class="dev-links">
          <For each={p.sources ?? []}>
            {(s: any) => (
              <li>
                <a href={s.url} target="_blank" rel="noreferrer">{s.label || s.url}</a>
                <Status check={props.checks[s.url]} onCheck={() => props.onCheck(s.url, false)} />
              </li>
            )}
          </For>
        </ul>

        <details>
          <summary>Raw JSON</summary>
          <pre>{JSON.stringify(p, null, 2)}</pre>
        </details>
      </div>
    </article>
  );
}

function Photo(props: { photo: any; check?: Check; onCheck: () => void }) {
  const [loaded, setLoaded] = createSignal<"loading" | "ok" | "failed">("loading");
  return (
    <figure class="dev-photo">
      <a href={props.photo.url} target="_blank" rel="noreferrer">
        <img src={props.photo.url} alt="" loading="lazy" onLoad={() => setLoaded("ok")} onError={() => setLoaded("failed")} />
      </a>
      <figcaption>
        <span classList={{ chip: true, good: loaded() === "ok", bad: loaded() === "failed" }}>
          {loaded() === "ok" ? "image loads" : loaded() === "failed" ? "image failed" : "loading"}
        </span>
        <Status check={props.check} onCheck={props.onCheck} />
        <span>
          {show(props.photo.author)} · {show(props.photo.license)} ·{" "}
          <a href={props.photo.sourceUrl} target="_blank" rel="noreferrer">source</a>
        </span>
      </figcaption>
    </figure>
  );
}

function Status(props: { check?: Check; onCheck: () => void }) {
  return (
    <Show when={props.check} fallback={<button class="dev-link-btn" onClick={props.onCheck}>check</button>}>
      {(c) => {
        // Read c() inside the JSX so the badge follows the check as it finishes.
        const done = () => (c().state === "checking" ? undefined : (c() as Extract<Check, { status: number }>));
        return (
          <Show when={done()} fallback={<span class="chip">checking</span>}>
            {(r) => (
              <span classList={{ chip: true, good: r().state === "ok", bad: r().state === "broken" }} title={r().note}>
                {r().state === "ok" ? `${r().status} ok` : r().status ? `${r().status} broken` : `broken: ${r().note}`}
              </span>
            )}
          </Show>
        );
      }}
    </Show>
  );
}

function Prop(props: { label: string; value: unknown }) {
  return (
    <div classList={{ missing: props.value === undefined }}>
      <dt>{props.label}</dt>
      <dd>{show(props.value)}</dd>
    </div>
  );
}

function Swatches(props: { colors: (string | null | undefined)[] }) {
  return (
    <For each={props.colors}>
      {(c) => (c ? <span class="swatch" style={{ background: c }} title={c} /> : <span class="swatch none" title="none" />)}
    </For>
  );
}
