import { For } from "solid-js";
import { Icon, type IconName } from "./Icon";

// The three steps from photos to a planting list, each with a small picture of what you get.
type Step = { icon: IconName; title: string; time: string; lead: string; points: string[]; mock: () => any };

const steps: Step[] = [
  {
    icon: "camera",
    title: "Photos to plan",
    time: "About 5 minutes",
    lead: "Drop in an aerial and a few yard photos. The AI traces the lot, the house, the beds and the plants already growing there.",
    points: ["A map screenshot works as the aerial", "Paths, patios, fences and trees are drawn for you", "Fix anything it got wrong by dragging it"],
    mock: PhotoMock,
  },
  {
    icon: "palette",
    title: "Designs",
    time: "Pick one, then make it yours",
    lead: "Get planting designs that fit your sun, your space and Indiana natives, then change anything by hand.",
    points: ["Sun and shade worked out for every bed", "Plants chosen for Indiana soil and winters", "Drag plants in from the gallery to swap them"],
    mock: DesignMock,
  },
  {
    icon: "list",
    title: "Step-by-step plan",
    time: "Season by season",
    lead: "Turn the design into a list by season: what to buy, where to dig and when to plant.",
    points: ["A shopping list with how many of each plant", "Which bed to dig first, and how big", "When to plant so it all blooms on time"],
    mock: ListMock,
  },
];

export function HowItWorks() {
  return (
    <section class="how" id="how" aria-labelledby="how-title">
      <div class="section-head">
        <p class="eyebrow">How it works</p>
        <h2 id="how-title">From a few photos to a garden plan in three steps</h2>
        <p class="section-sub">No design skills needed. You'll always see what your yard will look like before you buy a single plant.</p>
      </div>

      <ol class="how-steps">
        <For each={steps}>
          {(s, i) => (
            <li class="how-step reveal" classList={{ flip: i() % 2 === 1 }}>
              <div class="how-copy">
                <div class="how-badge">
                  <span class="how-icon">
                    <Icon name={s.icon} size={26} />
                  </span>
                  <span class="how-num">Step {i() + 1}</span>
                  <span class="how-time">{s.time}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.lead}</p>
                <ul class="checks">
                  <For each={s.points}>
                    {(p) => (
                      <li>
                        <Icon name="check" size={18} />
                        {p}
                      </li>
                    )}
                  </For>
                </ul>
              </div>
              <div class="how-mock">{s.mock()}</div>
            </li>
          )}
        </For>
      </ol>
    </section>
  );
}

// Three photos slide in, then a dashed outline traces the lot on the plan beside them.
function PhotoMock() {
  return (
    <div class="mock mock-photo">
      <div class="mock-photos">
        <div class="mock-shot aerial">
          <span>Aerial</span>
        </div>
        <div class="mock-shot front">
          <span>Front</span>
        </div>
        <div class="mock-shot back">
          <span>Back</span>
        </div>
      </div>
      <span class="mock-arrow">
        <Icon name="wand" size={22} />
      </span>
      <svg class="mock-plan" viewBox="0 0 160 200" aria-hidden="true">
        <rect x="8" y="8" width="144" height="184" rx="4" class="mp-lot" />
        <rect x="44" y="84" width="72" height="54" class="mp-house trace" pathLength="1" />
        <path d="M100 138 V192" class="mp-drive trace" pathLength="1" />
        <rect x="18" y="22" width="44" height="30" rx="14" class="mp-bed trace" pathLength="1" />
        <rect x="96" y="20" width="44" height="40" rx="6" class="mp-bed trace" pathLength="1" />
        <circle cx="30" cy="160" r="14" class="mp-tree trace" pathLength="1" />
        <line x1="0" x2="160" y1="0" y2="0" class="mp-scan" />
      </svg>
    </div>
  );
}

const designs = [
  { name: "Pollinator border", tags: ["Full sun", "14 plants"], colors: ["#b5679a", "#f2c14e", "#e7894f", "#7f8fd1"] },
  { name: "Shady woodland", tags: ["Part shade", "11 plants"], colors: ["#4f7a5a", "#9cb88f", "#f7f1e6", "#7f8fd1"] },
  { name: "Easy prairie", tags: ["Low care", "9 plants"], colors: ["#c9a64b", "#b5679a", "#8a6a3b", "#f2c14e"] },
];

function DesignMock() {
  return (
    <div class="mock mock-designs">
      <For each={designs}>
        {(d, i) => (
          <div class="design-card" classList={{ picked: i() === 0 }}>
            <div class="design-swatch">
              <For each={d.colors}>{(c) => <span style={{ background: c }} />}</For>
            </div>
            <strong>{d.name}</strong>
            <span class="design-tags">
              <For each={d.tags}>{(t) => <span>{t}</span>}</For>
            </span>
            {i() === 0 && (
              <span class="design-pick">
                <Icon name="check" size={14} /> Picked
              </span>
            )}
          </div>
        )}
      </For>
    </div>
  );
}

const tasks: { when: string; icon: IconName; items: string[] }[] = [
  { when: "March", icon: "cart", items: ["Buy 6 purple coneflower", "Buy 3 little bluestem"] },
  { when: "April", icon: "shovel", items: ["Dig the front bed, 8 × 5 ft", "Spread 2 inches of mulch"] },
  { when: "May", icon: "flower", items: ["Plant 18 inches apart", "Water twice a week until July"] },
];

function ListMock() {
  return (
    <div class="mock mock-list">
      <For each={tasks}>
        {(t, i) => (
          <div class="task-group">
            <span class="task-when">
              <Icon name={t.icon} size={16} />
              {t.when}
            </span>
            <For each={t.items}>
              {(item, j) => (
                <span class="task" style={{ "--d": `${0.4 + (i() * 2 + j()) * 0.35}s` }}>
                  <span class="task-box">
                    <Icon name="check" size={13} />
                  </span>
                  {item}
                </span>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
}
