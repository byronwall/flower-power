import { A, useNavigate } from "@solidjs/router";
import { createSignal, onCleanup, Show } from "solid-js";
import { logout } from "./session";
import "./account.css";

// The email chip at the end of the app bar. Its menu links to projects and account, and logs out.
export default function UserMenu(props: { email: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;
  const close = (e: PointerEvent) => !root.contains(e.target as Node) && setOpen(false);
  window.addEventListener("pointerdown", close);
  onCleanup(() => window.removeEventListener("pointerdown", close));

  const out = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div class="user-menu" ref={root}>
      <button type="button" class="user-chip" aria-haspopup="menu" aria-expanded={open()} onClick={() => setOpen(!open())}>
        <span class="user-avatar" aria-hidden="true">
          {props.email[0].toUpperCase()}
        </span>
        <span class="user-email">{props.email}</span>
      </button>
      <Show when={open()}>
        <div class="user-pop" role="menu">
          <p class="muted">Signed in as {props.email}</p>
          <A href="/projects" role="menuitem" class="user-link">
            My projects
          </A>
          <A href="/account" role="menuitem" class="user-link">
            Account
          </A>
          <button type="button" role="menuitem" onClick={out}>
            Log out
          </button>
        </div>
      </Show>
    </div>
  );
}
