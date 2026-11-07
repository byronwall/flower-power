import { For, type JSX } from "solid-js";
import type { Season } from "../model/plant";
import { monthNames, seasonOf, type ViewTime } from "../render/look";

// `part` lets the view bar place the season row and the year cards in different spots.
type Props = { time: ViewTime; onChange: (t: ViewTime) => void; part: "season" | "year" };

const SEASONS: { id: Season; name: string; months: number[]; icon: () => JSX.Element }[] = [
  { id: "spring", name: "Spring", months: [3, 4, 5], icon: () => <path d="M8 13V7M8 7c-3 0-4-2-4-4 2 0 4 1 4 4zm0 0c3 0 4-2 4-4-2 0-4 1-4 4z" /> },
  { id: "summer", name: "Summer", months: [6, 7, 8], icon: () => <path d="M8 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M13 3l-1 1M4 12l-1 1" /> },
  { id: "fall", name: "Fall", months: [9, 10, 11], icon: () => <path d="M3 13C3 7 7 3 13 3c0 6-4 10-10 10zm0 0l5-5" /> },
  { id: "winter", name: "Winter", months: [12, 1, 2], icon: () => <path d="M8 1.5v13M2.4 4.75l11.2 6.5M2.4 11.25l11.2-6.5M6.5 2.5L8 4l1.5-1.5M6.5 13.5L8 12l1.5 1.5" /> },
];
const YEARS = [1, 2, 3, 4, 5];

// Season and year as cards you click, with the season's months beneath for finer steps.
export function TimeBar(props: Props) {
  const season = () => seasonOf(props.time.month);
  const months = () => SEASONS.find((s) => s.id === season())!.months;
  const pickSeason = (s: (typeof SEASONS)[number]) => {
    if (s.id === season()) return;
    // Jump to the middle month, where the season looks most like itself.
    props.onChange({ ...props.time, month: s.months[1] });
  };
  if (props.part === "year") return <YearCards {...props} />;
  return (
    <div class="time-cards">
      <div class="card-group" role="radiogroup" aria-label="Season">
        <For each={SEASONS}>
          {(s) => (
            <button
              type="button"
              role="radio"
              class={`time-card season-${s.id}`}
              aria-checked={season() === s.id}
              onClick={() => pickSeason(s)}
              title={`${s.name}: ${s.months.map((m) => monthNames[m - 1]).join(", ")}`}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                {s.icon()}
              </svg>
              <span>{s.name}</span>
            </button>
          )}
        </For>
      </div>
      <div class="card-group months" role="radiogroup" aria-label="Month">
        <For each={months()}>
          {(m) => (
            <button type="button" role="radio" class="month-chip" aria-checked={props.time.month === m} onClick={() => props.onChange({ ...props.time, month: m })}>
              {monthNames[m - 1]}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}

function YearCards(props: Props) {
  return (
    <div class="card-group year-cards" role="radiogroup" aria-label="Years after planting">
      <span class="card-label">Year</span>
      <For each={YEARS}>
        {(y) => (
          <button
            type="button"
            role="radio"
            class="year-card"
            aria-checked={props.time.year === y}
            onClick={() => props.onChange({ ...props.time, year: y })}
            title={y === 1 ? "The first year after planting" : `${y} years after planting`}
          >
            {y}
          </button>
        )}
      </For>
    </div>
  );
}
