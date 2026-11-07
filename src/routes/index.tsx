import { For } from "solid-js";
import { plants, properties } from "../model/library";

export default function Home() {
  return (
    <main class="data-summary">
      <h1>Flower Power</h1>
      <h2>Properties</h2>
      <ul>
        <For each={properties}>
          {(p) => (
            <li>
              {p.name}: {p.plantings.length} plantings, {p.fences.length} fences, {p.surfaces.length} surfaces
            </li>
          )}
        </For>
      </ul>
      <h2>Plants ({plants.length})</h2>
      <ul>
        <For each={plants}>{(p) => <li>{p.commonName} ({p.botanicalName})</li>}</For>
      </ul>
    </main>
  );
}
