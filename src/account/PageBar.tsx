import { Show, type JSX } from "solid-js";
import Brand from "./Brand";
import type { Me } from "./session";
import UserMenu from "./UserMenu";
import "./account.css";
import "./pages.css";

// The top bar for /projects, /account and /share pages.
export default function PageBar(props: { me?: Me | null; children?: JSX.Element }) {
  return (
    <header class="page-bar">
      <Brand />
      {props.children}
      <div class="page-bar-end">
        <Show when={props.me}>{(me) => <UserMenu email={me().email} />}</Show>
      </div>
    </header>
  );
}
