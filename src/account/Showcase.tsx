import { createEffect, createMemo, createSignal, For, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import { YardView3D } from "../components/YardView3D";
import type { Property } from "../model/property";
import type { Weather } from "../render/life";
import { monthNames, seasonOf, type ViewTime } from "../render/look";
import type { Pick } from "../render/yard3d";
import { Icon, type IconName } from "./Icon";
import { sample } from "./sample";

// "Play with a plan": the sample yard four ways. Only the open tab is mounted, so 3D loads on demand.
type Tab = "video" | "demo" | "2d" | "3d";

const TABS: { id: Tab; icon: IconName; name: string; blurb: string }[] = [
  { id: "video", icon: "film", name: "Video", blurb: "Sit back and watch five years go by" },
  { id: "demo", icon: "pointer", name: "Demo", blurb: "Walk through how a plan is made" },
  { id: "2d", icon: "map", name: "2D plan", blurb: "Pan, zoom and change the weather" },
  { id: "3d", icon: "cube", name: "3D yard", blurb: "Turn the yard and look around" },
];

export function Showcase() {
  const [tab, setTab] = createSignal<Tab>("video");
  const pick = (t: Tab) => setTab(t);

  return (
    <section class="showcase" id="try" aria-labelledby="try-title">
      <div class="section-head">
        <p class="eyebrow">Try it now, no sign-up</p>
        <h2 id="try-title">Play with a real plan</h2>
        <p class="section-sub">This is a sample Indiana yard. Watch it grow, see how it was made, or grab it and move it around.</p>
      </div>

      <div class="show-tabs" role="tablist" aria-label="Ways to see the plan">
        <For each={TABS}>
          {(t) => (
            <button
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-controls="show-panel"
              aria-selected={tab() === t.id}
              class="show-tab"
              onClick={() => pick(t.id)}
              onKeyDown={(e) => {
                const i = TABS.findIndex((x) => x.id === tab());
                const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (!step) return;
                const next = TABS[(i + step + TABS.length) % TABS.length];
                pick(next.id);
                document.getElementById(`tab-${next.id}`)?.focus();
              }}
              tabIndex={tab() === t.id ? 0 : -1}
            >
              <span class="show-tab-icon">
                <Icon name={t.icon} size={22} />
              </span>
              <span class="show-tab-text">
                <strong>{t.name}</strong>
                <span>{t.blurb}</span>
              </span>
            </button>
          )}
        </For>
      </div>

      <div class="show-panel" id="show-panel" role="tabpanel" aria-labelledby={`tab-${tab()}`}>
        <Switch>
          <Match when={tab() === "video"}>
            <VideoTab />
          </Match>
          <Match when={tab() === "demo"}>
            <DemoTab />
          </Match>
          <Match when={tab() === "2d"}>
            <PlanTab />
          </Match>
          <Match when={tab() === "3d"}>
            <YardTab />
          </Match>
        </Switch>
      </div>
    </section>
  );
}

const weatherFor = (month: number): Weather => (month === 12 || month <= 2 ? "snow" : month === 4 ? "rain" : month === 11 ? "cloudy" : "sunny");

// ---------- Video: the plan as a time-lapse, with player controls ----------

const FRAMES: ViewTime[] = [1, 2, 3, 4, 5].flatMap((year) => [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => ({ year, month })));
const SEASON_ICON: Record<string, IconName> = { spring: "flower", summer: "sun", fall: "leaf", winter: "snow" };

function VideoTab() {
  let box!: HTMLDivElement;
  const [frame, setFrame] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);
  const [speed, setSpeed] = createSignal(1);
  const [visible, setVisible] = createSignal(false);
  const time = () => FRAMES[frame()];

  onMount(() => {
    // Plays only while on screen, like a muted video in a feed.
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(box);
    onCleanup(() => io.disconnect());
  });

  createEffect(() => {
    if (!playing() || !visible()) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 900 / speed());
    onCleanup(() => clearInterval(id));
  });

  const toggle = () => setPlaying(!playing());
  const label = () => `Year ${time().year} · ${monthNames[time().month - 1]}`;

  return (
    <div class="video" ref={box}>
      <div class="video-screen" onClick={toggle}>
        <div class="video-plan">
          <PlanView property={sample} time={time()} weather={weatherFor(time().month)} />
        </div>
        <div class="video-caption">
          <Icon name={SEASON_ICON[seasonOf(time().month)]} size={18} />
          <span>{label()}</span>
        </div>
        <Show when={!playing()}>
          <span class="video-big-play">
            <Icon name="play" size={34} />
          </span>
        </Show>
      </div>
      <div class="video-controls">
        <button type="button" class="vc-btn" onClick={toggle} aria-label={playing() ? "Pause" : "Play"}>
          <Icon name={playing() ? "pause" : "play"} size={18} />
        </button>
        <button type="button" class="vc-btn" onClick={() => setFrame(0)} aria-label="Start over">
          <Icon name="restart" size={18} />
        </button>
        <div class="vc-track">
          <input
            type="range"
            min="0"
            max={FRAMES.length - 1}
            value={frame()}
            aria-label="Time in the video"
            aria-valuetext={label()}
            style={{ "--p": `${(frame() / (FRAMES.length - 1)) * 100}%` }}
            onInput={(e) => setFrame(Number(e.currentTarget.value))}
          />
          <div class="vc-years" aria-hidden="true">
            <For each={[1, 2, 3, 4, 5]}>{(y) => <span classList={{ on: time().year === y }}>Yr {y}</span>}</For>
          </div>
        </div>
        <button type="button" class="vc-speed" onClick={() => setSpeed(speed() === 1 ? 2 : speed() === 2 ? 0.5 : 1)} aria-label={`Speed ${speed()} times`}>
          {speed()}×
        </button>
      </div>
    </div>
  );
}

// ---------- Demo: how a plan gets made, one step at a time ----------

const empty = { surfaces: [], structures: [], edges: [], features: [], fences: [], plantings: [] };
const DEMO: { icon: IconName; title: string; body: string; property: Property; time: ViewTime }[] = [
  {
    icon: "camera",
    title: "Start with your lot",
    body: "From the aerial photo, the outline of the lot and the house come first.",
    property: { ...sample, id: "demo-1", ...empty },
    time: { year: 1, month: 6 },
  },
  {
    icon: "wand",
    title: "AI traces what's there",
    body: "Paths, the patio, fences, the shed and the trees you already have.",
    property: {
      ...sample,
      id: "demo-2",
      ...empty,
      surfaces: sample.surfaces,
      structures: sample.structures,
      edges: sample.edges,
      fences: sample.fences,
      plantings: sample.plantings.filter((p) => p.existing),
    },
    time: { year: 1, month: 6 },
  },
  {
    icon: "flower",
    title: "Add a planting design",
    body: "Native plants go in, spaced for how big they'll get. This is planting day.",
    property: { ...sample, id: "demo-3" },
    time: { year: 1, month: 5 },
  },
  {
    icon: "growth",
    title: "Watch it fill in",
    body: "Four summers later the beds are full, the birds have found the feeder.",
    property: sample,
    time: { year: 4, month: 7 },
  },
];
const STEP_MS = 4200;

function DemoTab() {
  const [step, setStep] = createSignal(0);
  const [auto, setAuto] = createSignal(true);
  createEffect(() => {
    if (!auto()) return;
    step();
    const id = setTimeout(() => setStep((s) => (s + 1) % DEMO.length), STEP_MS);
    onCleanup(() => clearTimeout(id));
  });
  const go = (i: number) => {
    setAuto(false);
    setStep((i + DEMO.length) % DEMO.length);
  };
  const cur = createMemo(() => DEMO[step()]);

  return (
    <div class="demo-tab">
      <ol class="demo-steps">
        <For each={DEMO}>
          {(d, i) => (
            <li>
              <button type="button" class="demo-step" aria-current={step() === i() ? "step" : undefined} classList={{ done: i() < step() }} onClick={() => go(i())}>
                <span class="demo-step-icon">
                  <Icon name={d.icon} size={20} />
                </span>
                <span class="demo-step-text">
                  <strong>
                    {i() + 1}. {d.title}
                  </strong>
                  <span>{d.body}</span>
                </span>
                <Show when={auto() && step() === i()}>
                  {/* Mounts fresh on each step, so the bar starts over. */}
                  <span class="demo-progress" style={{ "animation-duration": `${STEP_MS}ms` }} />
                </Show>
              </button>
            </li>
          )}
        </For>
        <li class="demo-nav">
          <button type="button" class="btn" onClick={() => go(step() - 1)}>
            Back
          </button>
          <button type="button" class="btn primary" onClick={() => go(step() + 1)}>
            {step() === DEMO.length - 1 ? "Start over" : "Next step"}
            <Icon name="arrow" size={16} />
          </button>
        </li>
      </ol>
      <div class="demo-stage">
        <PlanView property={cur().property} time={cur().time} />
        <span class="demo-stage-tag">
          Step {step() + 1} of {DEMO.length} · Year {cur().time.year}, {monthNames[cur().time.month - 1]}
        </span>
      </div>
    </div>
  );
}

// ---------- 2D: the plan, free to play with ----------

const WEATHER: { id: Weather; name: string; icon: IconName }[] = [
  { id: "sunny", name: "Sunny", icon: "sun" },
  { id: "cloudy", name: "Cloudy", icon: "cloud" },
  { id: "rain", name: "Rain", icon: "rain" },
  { id: "snow", name: "Snow", icon: "snow" },
];

function PlanTab() {
  const [time, setTime] = createSignal<ViewTime>({ year: 2, month: 6 });
  const [weather, setWeather] = createSignal<Weather>("sunny");
  return (
    <div class="play">
      <div class="play-stage">
        <PlanView property={sample} time={time()} weather={weather()} />
        <p class="play-hint">
          <Icon name="pointer" size={15} /> Drag to move · scroll or pinch to zoom · click a bird
        </p>
      </div>
      <div class="play-bar">
        <TimeBar part="season" time={time()} onChange={setTime} />
        <TimeBar part="year" time={time()} onChange={setTime} />
        <div class="card-group" role="radiogroup" aria-label="Weather">
          <For each={WEATHER}>
            {(w) => (
              <button type="button" role="radio" class="time-card" aria-checked={weather() === w.id} onClick={() => setWeather(w.id)}>
                <Icon name={w.icon} size={16} />
                <span>{w.name}</span>
              </button>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

// ---------- 3D: the same yard, in three.js ----------

function YardTab() {
  const [time, setTime] = createSignal<ViewTime>({ year: 3, month: 6 });
  const [selected, setSelected] = createSignal<Pick | null>(null);
  return (
    <div class="play">
      <div class="play-stage yard">
        <YardView3D property={sample} time={time()} selected={selected()} onPick={setSelected} onDropPlant={() => {}} />
      </div>
      <div class="play-bar">
        <TimeBar part="season" time={time()} onChange={setTime} />
        <TimeBar part="year" time={time()} onChange={setTime} />
      </div>
    </div>
  );
}
