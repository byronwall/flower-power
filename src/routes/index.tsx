import { createSignal, For } from "solid-js";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import { properties } from "../model/library";
import type { ViewTime } from "../render/look";

export default function Home() {
  const [propertyId, setPropertyId] = createSignal(properties[0].id);
  const [time, setTime] = createSignal<ViewTime>({ month: 6, year: 3 });
  const property = () => properties.find((p) => p.id === propertyId())!;

  return (
    <div class="app">
      <header class="app-bar">
        <span class="brand">Flower Power</span>
        <select id="property" value={propertyId()} onChange={(e) => setPropertyId(e.currentTarget.value)} aria-label="Property">
          <For each={properties}>{(p) => <option value={p.id}>{p.name}</option>}</For>
        </select>
        <TimeBar time={time()} onChange={setTime} />
      </header>
      <main class="app-main">
        <PlanView property={property()} time={time()} />
      </main>
    </div>
  );
}
