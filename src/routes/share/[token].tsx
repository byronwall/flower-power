import { A, useParams } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import PageBar from "../../account/PageBar";
import { PlanView } from "../../components/PlanView";
import { TimeBar } from "../../components/TimeBar";
import type { Property } from "../../model/property";
import type { ViewTime } from "../../render/look";

// A read-only plan anyone with the link can see. The server leaves out the aerial.
export default function SharedPlan() {
  const params = useParams();
  const [time, setTime] = createSignal<ViewTime>({ month: 6, year: 3 });
  const [plan] = createResource(
    () => params.token,
    async (token): Promise<Property | null> => {
      const res = await fetch(`/api/share/${token}`);
      return res.ok ? res.json() : null;
    },
  );

  return (
    <div class="page share-page">
      <PageBar>
        <Show when={plan()}>
          {(p) => (
            <div class="share-title">
              <span class="share-badge">View only</span>
              <h1>{p().name}</h1>
            </div>
          )}
        </Show>
      </PageBar>
      <Show when={!plan.loading} fallback={<p class="status">Loading the garden…</p>}>
        <Show
          when={plan()}
          fallback={
            <div class="page-empty">
              <h2>This link is off</h2>
              <p class="muted">The owner turned off this share link, or it never existed.</p>
              <A href="/" class="btn">
                Go to Flower Power
              </A>
            </div>
          }
        >
          {(p) => (
            <>
              <div class="share-bar">
                <TimeBar part="season" time={time()} onChange={setTime} />
                <TimeBar part="year" time={time()} onChange={setTime} />
              </div>
              <div class="share-plan">
                <PlanView property={p()} time={time()} />
              </div>
              <footer class="share-foot">
                <span class="muted">Shared from Flower Power.</span>
                <A href="/register" class="btn primary">
                  Plan your own garden
                </A>
              </footer>
            </>
          )}
        </Show>
      </Show>
    </div>
  );
}
