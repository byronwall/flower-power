import { A, useLocation } from "@solidjs/router";
import { createResource, Show } from "solid-js";
import { Avatar } from "../account/Avatar";
import Brand from "../account/Brand";
import { fetchMe } from "../account/session";
import "../account/account.css";
import "../account/profile.css";

// Any address that matches no page. Without this the app showed a blank screen.
export default function NotFound() {
  const location = useLocation();
  const [me] = createResource(fetchMe);
  return (
    <div class="auth-page">
      <Brand />
      <div class="auth-card lost">
        <span class="lost-art" aria-hidden="true">
          <Avatar id="mushroom" size={96} />
        </span>
        <h1>This path is overgrown</h1>
        <p class="muted">
          There's no page at <code>{location.pathname}</code>. The link may be old, or a letter got mixed up.
        </p>
        <div class="lost-actions">
          <Show
            when={me()}
            fallback={
              <A href="/" class="btn primary">
                Go to the home page
              </A>
            }
          >
            <A href="/projects" class="btn primary">
              Back to my projects
            </A>
          </Show>
        </div>
      </div>
    </div>
  );
}
