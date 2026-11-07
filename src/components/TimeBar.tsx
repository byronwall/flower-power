import { For } from "solid-js";
import { monthNames, seasonOf, type ViewTime } from "../render/look";

const years = [1, 2, 3, 4, 5];

type Props = { time: ViewTime; onChange: (t: ViewTime) => void };

export function TimeBar(props: Props) {
  return (
    <div class="time-bar" title="Preview how the garden looks in any month and year after planting">
      <span class="time-title eyebrow">Preview</span>
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
      <label class="time-years">
        <span class="time-label">
          Year <em>{props.time.year}</em>
        </span>
        <input
          id="year"
          type="range"
          min="1"
          max={years.length}
          step="1"
          value={props.time.year}
          onInput={(e) => props.onChange({ ...props.time, year: Number(e.currentTarget.value) })}
          aria-label="Years after planting"
        />
        <span class="time-ticks" aria-hidden="true">
          <For each={years}>{(y) => <span>{y}</span>}</For>
        </span>
      </label>
    </div>
  );
}
