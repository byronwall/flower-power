import { For } from "solid-js";
import { monthNames, seasonOf, type ViewTime } from "../render/look";

type Props = { time: ViewTime; onChange: (t: ViewTime) => void };

export function TimeBar(props: Props) {
  return (
    <div class="time-bar">
      <label class="time-month">
        <span class="time-label">
          {monthNames[props.time.month - 1]} · <em>{seasonOf(props.time.month)}</em>
        </span>
        <input
          id="month"
          type="range"
          min="1"
          max="12"
          step="1"
          value={props.time.month}
          onInput={(e) => props.onChange({ ...props.time, month: Number(e.currentTarget.value) })}
          aria-label="Month"
        />
        <span class="time-ticks" aria-hidden="true">
          <For each={monthNames}>{(m) => <span>{m[0]}</span>}</For>
        </span>
      </label>
      <div class="time-years" role="group" aria-label="Years after planting">
        <span class="time-label">Year</span>
        <For each={[1, 2, 3, 4, 5]}>
          {(y) => (
            <button type="button" aria-pressed={props.time.year === y} onClick={() => props.onChange({ ...props.time, year: y })}>
              {y}
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
