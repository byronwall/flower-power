import { For } from "solid-js";

// The opening animation: a strip of garden along the bottom of the hero. Hills roll in, stems draw
// themselves up, flowers pop open one after another, then everything sways and butterflies drift by.
// Pure SVG and CSS, so it costs nothing to load; with reduced motion it simply shows the grown garden.

type Bloom = { x: number; h: number; color: string; center: string; petals: number; r: number; lean: number };

const COLORS = [
  { color: "#b5679a", center: "#6b3a2a" }, // purple coneflower
  { color: "#f2c14e", center: "#5a3a1e" }, // black-eyed Susan
  { color: "#7f8fd1", center: "#f6e6a8" }, // aster
  { color: "#e7894f", center: "#7a3b1d" }, // butterfly milkweed
  { color: "#f7f1e6", center: "#e3b23c" }, // white yarrow
  { color: "#c24b6e", center: "#f2c14e" }, // bee balm
];

// Placed by hand-ish rule so the strip looks planted, not random, and is the same on every visit.
const blooms: Bloom[] = Array.from({ length: 22 }, (_, i) => {
  const c = COLORS[(i * 5 + (i % 3)) % COLORS.length];
  return {
    x: 30 + i * 54 + ((i * 37) % 23) - 11,
    h: 52 + ((i * 29) % 46),
    petals: 5 + (i % 4),
    r: 7 + ((i * 13) % 5),
    lean: ((i * 17) % 9) - 4,
    ...c,
  };
});

const grasses = Array.from({ length: 40 }, (_, i) => ({ x: 8 + i * 30 + ((i * 11) % 13), h: 18 + ((i * 7) % 16), lean: ((i * 5) % 11) - 5 }));

export function HeroScene() {
  return (
    <div class="hero-scene" aria-hidden="true">
      <svg viewBox="0 0 1200 170" preserveAspectRatio="xMidYMax slice">
        <path class="hill hill-back" d="M0 120 C160 84 300 104 440 96 S760 70 900 92 S1120 108 1200 90 V170 H0z" />
        <path class="hill hill-front" d="M0 142 C200 122 330 136 520 128 S860 116 1000 130 S1150 138 1200 132 V170 H0z" />

        <For each={grasses}>
          {(g, i) => (
            <path
              class="grass"
              style={{ "--d": `${0.25 + i() * 0.015}s` }}
              d={`M${g.x} 152 q${g.lean / 2} ${-g.h / 2} ${g.lean} ${-g.h} M${g.x + 4} 152 q${-g.lean / 3} ${-g.h / 2} ${-g.lean / 2} ${-g.h * 0.8}`}
            />
          )}
        </For>

        <For each={blooms}>
          {(b, i) => {
            const delay = 0.5 + i() * 0.07;
            const top = 150 - b.h;
            return (
              <g class="bloom" style={{ "--d": `${delay}s`, "--sway": `${3 + (i() % 4)}s`, "transform-origin": `${b.x}px 150px` }}>
                <path class="stem" pathLength="1" d={`M${b.x} 150 Q${b.x + b.lean * 2} ${150 - b.h / 2} ${b.x + b.lean} ${top}`} />
                <path class="leaf" d={`M${b.x + b.lean * 0.6} ${150 - b.h * 0.42} q10 -9 18 -4 q-8 9 -18 4z`} style={{ "transform-origin": `${b.x}px ${150 - b.h * 0.42}px` }} />
                <g class="head" style={{ "transform-origin": `${b.x + b.lean}px ${top}px` }}>
                  <For each={Array.from({ length: b.petals })}>
                    {(_, p) => (
                      <ellipse
                        cx={b.x + b.lean}
                        cy={top - b.r * 0.85}
                        rx={b.r * 0.42}
                        ry={b.r * 0.85}
                        fill={b.color}
                        transform={`rotate(${(360 / b.petals) * p()} ${b.x + b.lean} ${top})`}
                      />
                    )}
                  </For>
                  <circle cx={b.x + b.lean} cy={top} r={b.r * 0.42} fill={b.center} />
                </g>
              </g>
            );
          }}
        </For>
      </svg>

      <svg class="butterfly b1" viewBox="0 0 24 20">
        <g class="wings">
          <path d="M12 10C8 2 2 2 2 7s5 5 10 3zM12 10c4-8 10-8 10-3s-5 5-10 3z" fill="#e7894f" />
          <path d="M12 10c-3 3-7 7-4 8s4-5 4-8zM12 10c3 3 7 7 4 8s-4-5-4-8z" fill="#f2c14e" />
        </g>
        <path d="M12 5v11" stroke="#3a2a1e" stroke-width="1.4" stroke-linecap="round" />
      </svg>
      <svg class="butterfly b2" viewBox="0 0 24 20">
        <g class="wings">
          <path d="M12 10C8 2 2 2 2 7s5 5 10 3zM12 10c4-8 10-8 10-3s-5 5-10 3z" fill="#7f8fd1" />
          <path d="M12 10c-3 3-7 7-4 8s4-5 4-8zM12 10c3 3 7 7 4 8s-4-5-4-8z" fill="#b5679a" />
        </g>
        <path d="M12 5v11" stroke="#3a2a1e" stroke-width="1.4" stroke-linecap="round" />
      </svg>
    </div>
  );
}

// Petals drifting down behind the hero copy.
export function Petals() {
  const petals = Array.from({ length: 12 }, (_, i) => ({
    left: (i * 83) % 100,
    delay: (i * 1.7) % 11,
    dur: 11 + ((i * 3) % 7),
    size: 8 + ((i * 5) % 7),
    color: COLORS[i % COLORS.length].color,
  }));
  return (
    <div class="petals" aria-hidden="true">
      <For each={petals}>
        {(p) => (
          <span
            class="petal"
            style={{
              left: `${p.left}%`,
              "--delay": `${p.delay}s`,
              "--dur": `${p.dur}s`,
              width: `${p.size}px`,
              height: `${p.size * 1.5}px`,
              background: p.color,
            }}
          />
        )}
      </For>
    </div>
  );
}
