import { A } from "@solidjs/router";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { plants } from "../model/library";

// Sprout, the landing page's guide: a potted flower in the corner that waves, blinks and talks
// about whichever section is on screen. Click it for a garden fact. The bubble can be closed.

type Line = { text: string; link?: { href: string; label: string; route?: boolean } };

const LINES: Record<string, Line> = {
  top: { text: "Hi, I'm Sprout! Scroll down and I'll show you around.", link: { href: "#how", label: "Show me" } },
  how: { text: "Three steps: snap photos, pick a design, follow the list. That's it!" },
  try: { text: "Try the 3D tab. You can spin the whole yard around!" },
  features: { text: `I know ${plants.length} Indiana plants by heart. You can browse every one in the plant list.` },
  faq: { text: "Still wondering about something? Tap a question to open it." },
  start: { text: "Ready? Let's grow your garden together!", link: { href: "/register", label: "Start a plan", route: true } },
};

const FACTS = [
  "Fun fact: monarch caterpillars only eat milkweed. Plant some and they'll find it!",
  "Fun fact: goldfinches love coneflower seeds. Leave the seed heads up in fall.",
  "Fun fact: the cardinal is Indiana's state bird. They love a good shrub to hide in.",
  "Tip: spring and fall are the best times to plant. Summer heat is hard on new roots.",
  "Tip: most natives need less water once their roots settle in, after about a year.",
];

const SECTIONS = Object.keys(LINES);

export function Guide(props: { signedIn?: boolean }) {
  const [line, setLine] = createSignal<Line>(LINES.top);
  const [open, setOpen] = createSignal(true);
  const [shown, setShown] = createSignal(false);
  const [hop, setHop] = createSignal(0);
  let fact = 0;
  let last = "top";
  let quiet = 0;
  // On a phone the bubble would sit over the text, so it tucks away after a few seconds.
  const narrow = () => window.matchMedia?.("(max-width: 560px)").matches ?? false;

  const say = (l: Line) => {
    setLine(l);
    setHop((n) => n + 1);
    setOpen(true);
    clearTimeout(quiet);
    if (narrow()) quiet = window.setTimeout(() => setOpen(false), 5000);
  };

  onMount(() => {
    // Waits for the hero's opening animation to finish before popping up.
    const t = setTimeout(() => {
      setShown(true);
      say(line());
    }, 2200);
    const io = new IntersectionObserver(
      (entries) => {
        // The section nearest the middle of the screen wins.
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = hit?.target.id;
        if (!id || id === last) return;
        last = id;
        say(id === "start" && props.signedIn ? { text: "Welcome back! Your gardens are waiting.", link: { href: "/projects", label: "My projects", route: true } } : LINES[id]);
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const id of SECTIONS) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    onCleanup(() => {
      clearTimeout(t);
      clearTimeout(quiet);
      io.disconnect();
    });
  });

  const poke = () => say({ text: FACTS[fact++ % FACTS.length] });

  return (
    <aside class="guide" classList={{ shown: shown() }} aria-label="Sprout, your guide">
      <Show when={open()}>
        {/* Keyed on the hop count so each new line plays its pop-in again. */}
        <For each={[hop()]}>
          {() => (
            <div class="guide-bubble" role="status">
              <button type="button" class="guide-close" aria-label="Hide Sprout's message" onClick={() => setOpen(false)}>
                ×
              </button>
              <p>{line().text}</p>
              <Show when={line().link}>
                {(l) =>
                  l().route ? (
                    <A href={l().href} class="guide-link">
                      {l().label} →
                    </A>
                  ) : (
                    <a href={l().href} class="guide-link">
                      {l().label} →
                    </a>
                  )
                }
              </Show>
            </div>
          )}
        </For>
      </Show>
      <For each={[hop()]}>
        {() => (
          <button type="button" class="guide-char hop" onClick={poke} aria-label="Sprout. Click for a garden fact.">
            <SproutArt />
          </button>
        )}
      </For>
    </aside>
  );
}

// A terracotta pot with a face, a waving leaf arm and a pink flower that slowly turns.
function SproutArt() {
  const petals = Array.from({ length: 9 }, (_, i) => (360 / 9) * i);
  return (
    <svg viewBox="0 0 120 150" width="100%" height="100%" aria-hidden="true">
      <ellipse cx="60" cy="143" rx="30" ry="5" fill="rgba(47,51,41,0.18)" class="g-shadow" />
      <g class="g-bob">
        <path d="M60 86 C60 70 58 58 60 44" stroke="#4f8a4a" stroke-width="5" stroke-linecap="round" fill="none" />
        <path class="g-leaf-r" d="M60 70 C72 70 82 62 84 54 C72 52 62 60 60 70z" fill="#83bd74" />
        <path class="g-arm" d="M59 76 C46 76 36 68 33 58 C46 56 56 66 59 76z" fill="#6aa85f" />
        <g class="g-flower">
          {petals.map((d) => (
            <ellipse cx="60" cy="22" rx="6.5" ry="13" fill="#c06a9f" transform={`rotate(${d} 60 36)`} />
          ))}
          <circle cx="60" cy="36" r="10" fill="#f2c14e" />
          <circle cx="57" cy="33" r="3" fill="#f7d77a" />
        </g>
        <path d="M30 88 h60 l-7 46 a7 7 0 01-7 6 h-32 a7 7 0 01-7 -6z" fill="#d07a4f" />
        <rect x="26" y="83" width="68" height="12" rx="5" fill="#b8643c" />
        <g class="g-face">
          <circle cx="44" cy="120" r="4.5" fill="#f08f9a" opacity="0.6" />
          <circle cx="76" cy="120" r="4.5" fill="#f08f9a" opacity="0.6" />
          <g class="g-eyes">
            <circle cx="51" cy="110" r="4" fill="#2f2a24" />
            <circle cx="69" cy="110" r="4" fill="#2f2a24" />
            <circle cx="52.3" cy="108.6" r="1.4" fill="white" />
            <circle cx="70.3" cy="108.6" r="1.4" fill="white" />
          </g>
          <path d="M53 120 q7 6 14 0" fill="none" stroke="#2f2a24" stroke-width="2.6" stroke-linecap="round" />
        </g>
      </g>
    </svg>
  );
}
