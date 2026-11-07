import { createEffect, createSignal, For, onCleanup, onMount, Show, type JSX } from "solid-js";

// A short animated walkthrough that plays like a video: one small scene per step, each a few
// seconds long, with story-style progress bars. It replaces a wall of instructions.

const SCENE_MS = 5200;

type Scene = { title: string; text: string; art: () => JSX.Element };

// Shared bits of the little yard used in every scene.
const Lot = (p: { class?: string; children?: JSX.Element }) => (
  <g class={p.class}>
    <rect class="t-lot" x="180" y="34" width="300" height="232" rx="6" />
    <rect class="t-house" x="250" y="130" width="130" height="80" rx="3" />
    {p.children}
  </g>
);
const Cursor = (p: { class: string }) => (
  <g class={`t-cursor ${p.class}`}>
    <path d="M0 0 L0 20 L5 15 L9 24 L13 22 L9 13 L16 13 Z" fill="#2f3329" stroke="white" stroke-width="1.5" stroke-linejoin="round" />
  </g>
);

const SCENES: Scene[] = [
  {
    title: "Drag plants onto the plan",
    text: "Pick a plant from the list on the left and drop it where it should grow.",
    art: () => (
      <>
        <g class="t-card">
          <rect x="24" y="70" width="130" height="64" rx="8" />
          <circle cx="54" cy="102" r="17" class="t-plant" />
          <rect x="80" y="90" width="58" height="8" rx="4" class="t-text" />
          <rect x="80" y="104" width="40" height="6" rx="3" class="t-text light" />
        </g>
        <Lot />
        <circle class="t-plant t-carry" cx="54" cy="102" r="17" />
        <Cursor class="c-drag" />
      </>
    ),
  },
  {
    title: "Draw beds, paths, and more",
    text: "Choose Ground, Building, or Fence at the top, then click around the shape. Double-click to finish.",
    art: () => (
      <>
        <Lot>
          <polygon class="t-bed" points="200,60 300,52 320,100 210,110" />
          <polyline class="t-draw" points="200,60 300,52 320,100 210,110 200,60" />
          <For each={[[200, 60], [300, 52], [320, 100], [210, 110]]}>{([x, y], i) => <circle class={`t-dot d${i()}`} cx={x} cy={y} r="4" />}</For>
        </Lot>
        <Cursor class="c-draw" />
      </>
    ),
  },
  {
    title: "Click anything to change it",
    text: "Drag to move it. Drag a pink dot to reshape or resize. The panel on the right shows its details.",
    art: () => (
      <>
        <Lot>
          <g class="t-grow">
            <circle class="t-plant big" cx="420" cy="80" r="22" />
            <circle class="t-ring" cx="420" cy="80" r="26" />
            <circle class="t-handle" cx="446" cy="80" r="4" />
          </g>
          <text class="t-label" x="420" y="40" text-anchor="middle">
            24 ft wide when grown
          </text>
        </Lot>
        <Cursor class="c-resize" />
      </>
    ),
  },
  {
    title: "Get closer",
    text: "Scroll or pinch to zoom toward the pointer, and drag empty ground to move around. Press 0 to see the whole lot.",
    art: () => (
      <>
        <g class="t-zoom">
          <Lot>
            <circle class="t-plant" cx="220" cy="80" r="14" />
            <circle class="t-plant" cx="440" cy="240" r="12" />
            <ellipse class="t-pond" cx="320" cy="238" rx="26" ry="14" />
          </Lot>
        </g>
        <g class="t-wheel">
          <rect x="300" y="130" width="22" height="34" rx="11" />
          <line x1="311" y1="138" x2="311" y2="146" />
        </g>
      </>
    ),
  },
  {
    title: "See every season",
    text: "Pick a season and a year. The plan and the 3D view show how the garden looks then.",
    art: () => (
      <>
        <Lot class="t-seasons">
          <circle class="t-tree" cx="225" cy="80" r="30" />
          <circle class="t-tree" cx="440" cy="232" r="20" />
        </Lot>
        <g class="t-chips">
          <For each={["Spring", "Summer", "Fall", "Winter"]}>
            {(s, i) => (
              <g class={`t-chip s${i()}`} transform={`translate(${24} ${70 + i() * 40})`}>
                <rect width="120" height="30" rx="8" />
                <text x="60" y="20" text-anchor="middle">
                  {s}
                </text>
              </g>
            )}
          </For>
        </g>
      </>
    ),
  },
  {
    title: "Walk around it in 3D",
    text: "Switch to 3D View or Side by side. Drag to turn all the way around, or press Spin 360°.",
    art: () => (
      <g transform="translate(300 160)">
        <g class="t-orbit">
          <rect class="t-lot" x="-110" y="-80" width="220" height="160" rx="6" />
          <rect class="t-house roof" x="-40" y="-10" width="80" height="50" rx="3" />
          <circle class="t-tree" cx="-70" cy="-45" r="22" />
          <circle class="t-tree" cx="75" cy="50" r="14" />
        </g>
      </g>
    ),
  },
];

export function Tour(props: { onClose: () => void }) {
  const [i, setI] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);
  // A fresh key per showing restarts the scene's CSS animations.
  const [run, setRun] = createSignal(0);
  let timer = 0;
  let dialog!: HTMLDivElement;

  // Resuming replays the current scene from its start, so the picture and the timer agree.
  const toggle = () => {
    if (!playing()) setRun(run() + 1);
    setPlaying(!playing());
  };
  const go = (n: number) => {
    if (n >= SCENES.length) return props.onClose();
    setI(Math.max(0, n));
    setRun(run() + 1);
  };

  createEffect(() => {
    i();
    run();
    clearTimeout(timer);
    if (playing()) timer = window.setTimeout(() => go(i() + 1), SCENE_MS);
  });

  onMount(() => {
    dialog.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        props.onClose();
      } else if (e.key === "ArrowRight") go(i() + 1);
      else if (e.key === "ArrowLeft") go(i() - 1);
      else if (e.key === " ") {
        e.preventDefault();
        toggle();
      } else return;
      e.stopPropagation();
    };
    window.addEventListener("keydown", key, true);
    onCleanup(() => {
      window.removeEventListener("keydown", key, true);
      clearTimeout(timer);
    });
  });

  return (
    <div class="tour-backdrop" onClick={(e) => e.target === e.currentTarget && props.onClose()}>
      <div class="tour" role="dialog" aria-modal="true" aria-label="How Flower Power works" tabindex="-1" ref={dialog} classList={{ paused: !playing() }}>
        <div class="tour-bars" aria-hidden="true">
          <For each={SCENES}>
            {(_, n) => (
              <button type="button" class="tour-bar" classList={{ done: n() < i(), now: n() === i() }} onClick={() => go(n())} tabindex="-1">
                <Show when={n() === i()}>
                  {/* Keyed by run so the fill restarts with the scene. */}
                  <For each={[run()]}>{() => <span class="fill" style={{ "animation-duration": `${SCENE_MS}ms` }} />}</For>
                </Show>
              </button>
            )}
          </For>
        </div>
        <div class="tour-stage">
          <For each={[`${i()}-${run()}`]}>
            {() => (
              <svg viewBox="0 0 520 300" class={`scene scene-${i()}`} role="img" aria-label={SCENES[i()].title}>
                {SCENES[i()].art()}
              </svg>
            )}
          </For>
        </div>
        <div class="tour-text" aria-live="polite">
          <span class="eyebrow">
            Step {i() + 1} of {SCENES.length}
          </span>
          <h2>{SCENES[i()].title}</h2>
          <p>{SCENES[i()].text}</p>
        </div>
        <div class="tour-controls">
          <button type="button" class="link-btn" onClick={props.onClose}>
            Skip tour
          </button>
          <span class="tour-nav">
            <button type="button" class="icon-btn" onClick={() => go(i() - 1)} disabled={i() === 0} aria-label="Previous step" title="Previous (←)">
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="icon-btn" onClick={toggle} aria-label={playing() ? "Pause" : "Play"} title={playing() ? "Pause (space)" : "Play (space)"}>
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                <path d={playing() ? "M5 3v10M11 3v10" : "M5 3l8 5-8 5z"} fill={playing() ? "none" : "currentColor"} stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button type="button" class="primary" onClick={() => go(i() + 1)}>
              {i() === SCENES.length - 1 ? "Start planning" : "Next"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

// The same scenes as a small player that sits in the side panel and plays on a loop by itself,
// like a muted video. It plays only while it is on screen and the tab is open. A click on the
// picture opens the full-size tour; the corner button pauses it for anyone who wants it still.
export function TourReel(props: { onExpand?: () => void }) {
  const [i, setI] = createSignal(0);
  const [run, setRun] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);
  const [visible, setVisible] = createSignal(true);
  let box!: HTMLDivElement;
  let timer = 0;

  const go = (n: number) => {
    setI((n + SCENES.length) % SCENES.length);
    setRun(run() + 1);
  };

  createEffect(() => {
    i();
    run();
    clearTimeout(timer);
    if (playing() && visible()) timer = window.setTimeout(() => go(i() + 1), SCENE_MS);
  });

  onMount(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden), { threshold: 0.3 });
    io.observe(box);
    const vis = () => setVisible(!document.hidden && box.getBoundingClientRect().height > 0);
    document.addEventListener("visibilitychange", vis);
    onCleanup(() => {
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      clearTimeout(timer);
    });
  });

  return (
    <div class="reel" ref={box} classList={{ paused: !playing() || !visible() }}>
      <div class="tour-bars" aria-hidden="true">
        <For each={SCENES}>
          {(_, n) => (
            <button type="button" class="tour-bar" classList={{ done: n() < i(), now: n() === i() }} onClick={() => go(n())} tabindex="-1">
              <Show when={n() === i()}>
                <For each={[run()]}>{() => <span class="fill" style={{ "animation-duration": `${SCENE_MS}ms` }} />}</For>
              </Show>
            </button>
          )}
        </For>
      </div>
      <div class="reel-stage">
        <button type="button" class="reel-screen" onClick={() => props.onExpand?.()} aria-label="Open the tour full size" title="Watch it bigger">
          <For each={[`${i()}-${run()}`]}>
            {() => (
              <svg viewBox="0 0 520 300" class={`scene scene-${i()}`} role="img" aria-label={SCENES[i()].title}>
                {SCENES[i()].art()}
              </svg>
            )}
          </For>
        </button>
        <button
          type="button"
          class="reel-pause"
          onClick={() => {
            if (!playing()) setRun(run() + 1);
            setPlaying(!playing());
          }}
          aria-label={playing() ? "Pause the tour" : "Play the tour"}
          title={playing() ? "Pause" : "Play"}
        >
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
            <path d={playing() ? "M5 3v10M11 3v10" : "M5 3l8 5-8 5z"} fill={playing() ? "none" : "currentColor"} stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div class="reel-text" aria-live="off">
        <span class="eyebrow">
          How it works · {i() + 1} of {SCENES.length}
        </span>
        <strong>{SCENES[i()].title}</strong>
        <p>{SCENES[i()].text}</p>
      </div>
    </div>
  );
}
