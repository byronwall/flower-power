import { A } from "@solidjs/router";
import { createResource, For, Show } from "solid-js";
import Brand from "./Brand";
import { fetchMe } from "./session";
import "./account.css";

// Lists whichever pages exist under src/routes/dev, so new ones show up here on their own.
const devPages = Object.keys(import.meta.glob("../routes/dev/*.tsx")).map((f) => `/dev/${f.split("/").pop()!.replace(/\.tsx$/, "")}`);

export default function Landing() {
  const [me] = createResource(fetchMe);

  return (
    <div class="landing">
      <header class="landing-bar">
        <Brand />
        <nav class="landing-nav">
          <Show
            when={me()}
            fallback={
              <>
                <A href="/login" class="btn">
                  Log in
                </A>
                <A href="/register" class="btn primary">
                  Register
                </A>
              </>
            }
          >
            <A href="/plan" class="btn primary">
              Open my plans
            </A>
          </Show>
        </nav>
      </header>

      <section class="landing-hero">
        <p class="eyebrow">Garden planning for Indiana yards</p>
        <h1>See your garden grow before you plant it.</h1>
        <p class="landing-pitch">
          Draw your lot, place native plants, and slide through the seasons and years to see how the beds fill in. Your plans save to your account.
        </p>
        <div class="landing-cta">
          <Show
            when={me()}
            fallback={
              <>
                <A href="/register" class="btn primary big">
                  Start a plan
                </A>
                <A href="/login" class="btn big">
                  Log in
                </A>
              </>
            }
          >
            <A href="/plan" class="btn primary big">
              Open my plans
            </A>
          </Show>
        </div>
      </section>

      {/* The public gallery of shared gardens goes here, between the pitch and the footer. */}

      <Show when={devPages.length}>
        <footer class="landing-dev">
          <p class="eyebrow">Dev pages</p>
          <ul>
            <For each={devPages}>
              {(href) => (
                <li>
                  <A href={href}>{href}</A>
                </li>
              )}
            </For>
          </ul>
        </footer>
      </Show>
    </div>
  );
}
