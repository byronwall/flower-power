import { A } from "@solidjs/router";
import { createResource, createSignal, For, onCleanup, Show } from "solid-js";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import type { ViewTime } from "../render/look";
import Brand from "./Brand";
import { sample } from "./sample";
import { fetchMe } from "./session";
import "./account.css";
import "./pages.css";

// Lists whichever pages exist under src/routes/dev, so new ones show up here on their own.
const devPages = Object.keys(import.meta.glob("../routes/dev/*.tsx")).map((f) => `/dev/${f.split("/").pop()!.replace(/\.tsx$/, "")}`);

const steps = [
  { title: "Photos to plan", body: "Drop in an aerial and a few yard photos. The AI traces the lot, the house, the beds and the plants already growing there." },
  { title: "Designs", body: "Get planting designs that fit your sun, your space and Indiana natives, then change anything by hand." },
  { title: "Step-by-step plan", body: "Turn the design into a list by season: what to buy, where to dig and when to plant." },
];

export default function Landing() {
  const [me] = createResource(fetchMe);
  const [time, setTime] = createSignal<ViewTime>({ month: 4, year: 1 });
  // The demo walks through the months on its own until the person moves a slider.
  const timer = setInterval(() => {
    const t = time();
    setTime(t.month === 12 ? { month: 3, year: t.year === 5 ? 1 : t.year + 1 } : { ...t, month: t.month + 1 });
  }, 1400);
  onCleanup(() => clearInterval(timer));

  const ctas = (big: boolean) => (
    <Show
      when={me()}
      fallback={
        <>
          <A href="/register" class="btn primary" classList={{ big }}>
            {big ? "Start a plan" : "Register"}
          </A>
          <A href="/login" class="btn" classList={{ big }}>
            Log in
          </A>
        </>
      }
    >
      <A href="/projects" class="btn primary" classList={{ big }}>
        My projects
      </A>
    </Show>
  );

  return (
    <div class="landing">
      <header class="landing-bar">
        <Brand />
        <nav class="landing-nav">{ctas(false)}</nav>
      </header>

      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Garden planning for Indiana yards</p>
          <h1>See your garden grow before you plant it.</h1>
          <p class="landing-pitch">
            Turn photos of your yard into a watercolor plan. Place native plants, then slide through the months and years to watch the beds fill in.
          </p>
          <div class="landing-cta">{ctas(true)}</div>
        </div>
        <figure class="demo">
          <div class="demo-plan">
            <PlanView property={sample} time={time()} />
          </div>
          <figcaption class="demo-bar">
            <For each={["season", "year"] as const}>
              {(part) => (
                <TimeBar
                  part={part}
                  time={time()}
                  onChange={(t) => {
                    clearInterval(timer);
                    setTime(t);
                  }}
                />
              )}
            </For>
          </figcaption>
        </figure>
      </section>

      <section class="landing-steps" aria-label="How it works">
        <For each={steps}>
          {(s, i) => (
            <article class="landing-step">
              <span class="step-num">{i() + 1}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </article>
          )}
        </For>
      </section>

      {/* Gallery slot: the public gallery strip goes here, between the steps and the footer. */}

      <footer class="landing-foot">
        <span class="muted">Flower Power · a garden planner for Indiana</span>
        <Show when={devPages.length}>
          <nav class="dev-links" aria-label="Dev pages">
            <span class="eyebrow">Dev</span>
            <For each={devPages}>{(href) => <A href={href}>{href}</A>}</For>
          </nav>
        </Show>
      </footer>
    </div>
  );
}
