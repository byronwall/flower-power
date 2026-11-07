import { createMemo, createSignal, For, Show } from "solid-js";
import checklistCsv from "../../data/nrcs/indiana-checklist.csv?raw";
import { baseName, parseChecklist, type Rank } from "./nrcs";
import type { PlantFile } from "./plant-files";

// Dev only: every accepted name in the NRCS Indiana checklist, with the app plants that match it.

const PAGE = 200;
const taxa = parseChecklist(checklistCsv);
const families = [...new Set(taxa.map((t) => t.family))].sort();

export function NrcsChecklist(props: { files: PlantFile[] }) {
  // App plants by genus and species. Cultivars of a genus-only name, such as Buxus 'Green Velvet', match the genus.
  const inApp = new Map<string, PlantFile[]>();
  for (const f of props.files) {
    const key = baseName(String(f.data.botanicalName ?? ""));
    inApp.set(key, [...(inApp.get(key) ?? []), f]);
  }

  const [query, setQuery] = createSignal("");
  const [rank, setRank] = createSignal<Rank | "all">("species");
  const [family, setFamily] = createSignal("");
  const [app, setApp] = createSignal<"all" | "in" | "out">("all");
  const [limit, setLimit] = createSignal(PAGE);

  const shown = createMemo(() => {
    const q = query().trim().toLowerCase();
    return taxa.filter(
      (t) =>
        (rank() === "all" || t.rank === rank()) &&
        (!family() || t.family === family()) &&
        (app() === "all" || (app() === "in") === inApp.has(t.base)) &&
        (!q || t.name.toLowerCase().includes(q) || t.common.toLowerCase().includes(q) || t.symbol.toLowerCase() === q || t.synonyms.some((s) => s.toLowerCase().includes(q))),
    );
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => (set(v), setLimit(PAGE));
  const count = (r: Rank) => taxa.filter((t) => t.rank === r).length;

  return (
    <>
      <div class="dev-controls dev-filters">
        <input type="search" placeholder="Name, common name, synonym or symbol" value={query()} onInput={(e) => reset(setQuery)(e.currentTarget.value)} />
        <select value={rank()} onChange={(e) => reset(setRank)(e.currentTarget.value as Rank | "all")}>
          <option value="species">Species ({count("species")})</option>
          <option value="variety">Varieties ({count("variety")})</option>
          <option value="subspecies">Subspecies ({count("subspecies")})</option>
          <option value="genus">Genera ({count("genus")})</option>
          <option value="all">All accepted names ({taxa.length})</option>
        </select>
        <select value={family()} onChange={(e) => reset(setFamily)(e.currentTarget.value)}>
          <option value="">All {families.length} families</option>
          <For each={families}>{(f) => <option value={f}>{f}</option>}</For>
        </select>
        <select value={app()} onChange={(e) => reset(setApp)(e.currentTarget.value as "all" | "in" | "out")}>
          <option value="all">In the app or not</option>
          <option value="in">In the app</option>
          <option value="out">Not in the app</option>
        </select>
      </div>
      <p class="dev-count">
        Showing {Math.min(limit(), shown().length)} of {shown().length} matching ({taxa.length} accepted names in the checklist)
      </p>
      <div class="dev-table-wrap">
        <table class="dev-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Scientific name</th>
              <th>Common name</th>
              <th>Family</th>
              <th>Rank</th>
              <th>Synonyms</th>
              <th>In the app</th>
            </tr>
          </thead>
          <tbody>
            <For each={shown().slice(0, limit())}>
              {(t) => (
                <tr>
                  <td>
                    <a href={`https://plants.usda.gov/plant-profile/${t.symbol}`} target="_blank" rel="noreferrer">
                      <code>{t.symbol}</code>
                    </a>
                  </td>
                  <td>
                    <i>{t.name}</i>
                  </td>
                  <td>{t.common || "—"}</td>
                  <td>{t.family}</td>
                  <td>{t.rank}</td>
                  <td>
                    <Show when={t.synonyms.length} fallback="—">
                      <details>
                        <summary>{t.synonyms.length}</summary>
                        <For each={t.synonyms}>{(s) => <div class="dev-syn">{s}</div>}</For>
                      </details>
                    </Show>
                  </td>
                  <td>
                    <Show when={inApp.get(t.base)} fallback="—">
                      {(fs) => <For each={fs()}>{(f) => <span class="chip good">{f.data.commonName}</span>}</For>}
                    </Show>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={shown().length > limit()}>
        <button class="dev-more" onClick={() => setLimit(limit() + PAGE)}>
          Show {Math.min(PAGE, shown().length - limit())} more
        </button>
      </Show>
    </>
  );
}
