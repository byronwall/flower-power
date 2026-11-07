import { A } from "@solidjs/router";
import { createResource, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Mascot } from "../components/Mascot";
import { PlanView } from "../components/PlanView";
import { TimeBar } from "../components/TimeBar";
import { plants } from "../model/library";
import type { ViewTime } from "../render/look";
import Brand from "./Brand";
import { Guide } from "./Guide";
import { HeroScene, Petals } from "./HeroScene";
import { HowItWorks } from "./HowItWorks";
import { Icon, type IconName } from "./Icon";
import { sample } from "./sample";
import { fetchMe } from "./session";
import { Showcase } from "./Showcase";
import "./account.css";
import "./pages.css";
import "./landing.css";

// Lists whichever pages exist under src/routes/dev, so new ones show up here on their own.
// Only on the dev server: visitors to the real site never see them.
const devPages = !import.meta.env.DEV ? [] : Object.keys(import.meta.glob("../routes/dev/*.tsx")).map((f) => `/dev/${f.split("/").pop()!.replace(/\.tsx$/, "")}`);

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: "sun", title: "Sun and shade", body: "The plan works out how many hours of sun each spot gets, past the house, fences and trees, so each plant goes where it will thrive." },
  { icon: "leaf", title: `${plants.length} Indiana plants`, body: "Natives and garden favorites with pictures, bloom times, heights and spacing. No Latin needed." },
  { icon: "growth", title: "Five years ahead", body: "Slide from planting day to year five and see how big everything gets before you dig." },
  { icon: "calendar", title: "Every season", body: "Spring blooms, summer color, fall seed heads, winter structure. Pick a month and see it." },
  { icon: "cube", title: "2D and 3D", body: "A watercolor plan for planning, and a 3D yard you can turn to see it from the patio." },
  { icon: "share", title: "Share a link", body: "Send your plan to a partner, a neighbor or your landscaper. They don't need an account." },
];

const faqs = [
  { q: "Do I need to know anything about plants?", a: "No. Designs are made for your sun and space, and every plant has a picture, a plain name, and how big it gets. You can change things, but you don't have to." },
  { q: "What photos do I need?", a: "One view from above (a screenshot from any online map works) and a few photos from around the yard. Phone photos are fine." },
  { q: "What if the AI draws something wrong?", a: "Drag it where it belongs, or delete it. Everything on the plan can be moved, resized and changed by hand." },
  { q: "Why Indiana?", a: "Plants that do well depend on where you live. The plant library is built around Indiana soil, rain and winters, with natives that feed local birds and bees." },
  { q: "Does the 3D view work on my computer?", a: "It runs in modern browsers on most laptops and phones. If yours can't show it, the 2D plan has everything the 3D one does." },
];

export default function Landing() {
  const [me] = createResource(fetchMe);
  const [time, setTime] = createSignal<ViewTime>({ month: 4, year: 1 });
  // The hero plan walks through the months on its own until the person picks a season or year.
  const timer = setInterval(() => {
    const t = time();
    setTime(t.month === 12 ? { month: 3, year: t.year === 5 ? 1 : t.year + 1 } : { ...t, month: t.month + 1 });
  }, 1400);
  onCleanup(() => clearInterval(timer));

  // Sections fade up the first time they scroll into view.
  onMount(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("shown");
          io.unobserve(e.target);
        }
      },
      { threshold: 0.15 },
    );
    document.querySelectorAll(".landing .reveal").forEach((el) => io.observe(el));
    onCleanup(() => io.disconnect());
  });

  const ctas = (big: boolean) => (
    <Show
      when={me()}
      fallback={
        <>
          <A href="/register" class="btn primary" classList={{ big }}>
            {big ? "Start a plan" : "Register"}
            {big && <Icon name="arrow" size={18} />}
          </A>
          <A href="/login" class="btn" classList={{ big }}>
            Log in
          </A>
        </>
      }
    >
      <A href="/projects" class="btn primary" classList={{ big }}>
        My projects
        {big && <Icon name="arrow" size={18} />}
      </A>
    </Show>
  );

  return (
    <div class="landing">
      <header class="landing-bar">
        <Brand />
        <nav class="landing-links" aria-label="On this page">
          <a href="#how">How it works</a>
          <a href="#try">Try it</a>
          <a href="#features">Features</a>
          <a href="#faq">FAQ</a>
        </nav>
        <nav class="landing-nav">{ctas(false)}</nav>
      </header>

      <div class="hero-wrap" id="top">
        <Petals />
        <div class="hero-sun" aria-hidden="true" />
        <section class="hero">
          <div class="hero-copy">
            <p class="eyebrow intro" style={{ "--i": 0 }}>
              <Icon name="flower" size={16} /> Garden planning for Indiana yards
            </p>
            <h1 class="intro" style={{ "--i": 1 }}>
              See your garden <span class="grow-word">grow</span> before you plant it.
            </h1>
            <p class="landing-pitch intro" style={{ "--i": 2 }}>
              Turn photos of your yard into a watercolor plan. Place native plants, then slide through the months and years to watch the beds fill in.
            </p>
            <div class="landing-cta intro" style={{ "--i": 3 }}>
              {ctas(true)}
            </div>
            <a class="hero-try intro" href="#try" style={{ "--i": 4 }}>
              <span class="hero-try-icon">
                <Icon name="play" size={14} />
              </span>
              Or play with a sample plan first
            </a>
          </div>

          <figure class="demo tilt-in">
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
            <span class="float-badge fb-1">
              <Icon name="sun" size={16} /> Full sun bed
            </span>
            <span class="float-badge fb-2">
              <Icon name="flower" size={16} /> Blooms June to Sept
            </span>
            <span class="float-badge fb-3">
              <Icon name="bird" size={16} /> Feeds birds &amp; bees
            </span>
          </figure>
        </section>
        <HeroScene />
      </div>

      <HowItWorks />

      <Showcase />

      <section class="features" id="features" aria-labelledby="features-title">
        <div class="section-head">
          <p class="eyebrow">What's inside</p>
          <h2 id="features-title">Everything you need to plan with confidence</h2>
        </div>
        <div class="feature-grid">
          <For each={features}>
            {(f, i) => (
              <article class="feature reveal" style={{ "--i": i() }}>
                <span class="feature-icon">
                  <Icon name={f.icon} size={24} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            )}
          </For>
        </div>
      </section>

      <section class="faq" id="faq" aria-labelledby="faq-title">
        <div class="section-head">
          <p class="eyebrow">Questions</p>
          <h2 id="faq-title">Good to know</h2>
        </div>
        <div class="faq-list">
          <For each={faqs}>
            {(f) => (
              <details class="faq-item">
                <summary>
                  <Icon name="question" size={20} />
                  <span>{f.q}</span>
                  <Icon name="chevron" size={18} class="faq-chev" />
                </summary>
                <p>{f.a}</p>
              </details>
            )}
          </For>
        </div>
      </section>

      <section class="cta-band reveal" id="start" aria-labelledby="cta-title">
        <Mascot size={120} caption />
        <div>
          <h2 id="cta-title">Ready to see your yard grow?</h2>
          <p>Start with a few photos. Sprout will help with the rest.</p>
          <div class="landing-cta">{ctas(true)}</div>
        </div>
      </section>

      <Guide signedIn={!!me()} />

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
