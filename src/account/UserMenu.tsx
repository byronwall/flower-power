import { A, useNavigate } from "@solidjs/router";
import { createSignal, onCleanup, Show } from "solid-js";
import { Avatar } from "./Avatar";
import { logout, type Me } from "./session";
import "./account.css";
import "./profile.css";

// The avatar chip at the end of the bar. Its menu links to projects and account, and logs out.
// `compact` shows the avatar alone, for the editor's crowded bar.
export default function UserMenu(props: { me: Me; compact?: boolean }) {
  const navigate = useNavigate();
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;
  const close = (e: PointerEvent) => !root.contains(e.target as Node) && setOpen(false);
  const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
  window.addEventListener("pointerdown", close);
  window.addEventListener("keydown", esc);
  onCleanup(() => {
    window.removeEventListener("pointerdown", close);
    window.removeEventListener("keydown", esc);
  });

  const label = () => props.me.name || props.me.email;
  const out = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div class="user-menu" ref={root}>
      <button
        type="button"
        class="user-chip"
        classList={{ compact: props.compact }}
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label={`Account menu for ${label()}`}
        title={props.compact ? label() : undefined}
        onClick={() => setOpen(!open())}
      >
        <Avatar id={props.me.avatar} size={props.compact ? 34 : 28} class="user-av" />
        <Show when={!props.compact}>
          <span class="user-email">{label()}</span>
        </Show>
      </button>
      <Show when={open()}>
        <div class="user-pop" role="menu">
          <div class="user-pop-head">
            <Avatar id={props.me.avatar} size={44} />
            <div>
              <Show when={props.me.name}>
                <strong>{props.me.name}</strong>
              </Show>
              <p class="muted">{props.me.email}</p>
            </div>
          </div>
          <A href="/projects" role="menuitem" class="user-link">
            My projects
          </A>
          <A href="/account" role="menuitem" class="user-link">
            Account and avatar
          </A>
          <button type="button" role="menuitem" onClick={out}>
            Log out
          </button>
        </div>
      </Show>
    </div>
  );
}
