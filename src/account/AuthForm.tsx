import { A, useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";
import Brand from "./Brand";
import { sendCreds } from "./session";
import "./account.css";

// The shared form for /login and /register. On success it opens the projects page.
export default function AuthForm(props: { kind: "login" | "register" }) {
  const navigate = useNavigate();
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const isLogin = () => props.kind === "login";

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    setBusy(true);
    const err = await sendCreds(props.kind, String(form.get("email")), String(form.get("password")));
    setBusy(false);
    if (err) setError(err);
    else navigate("/projects", { replace: true });
  };

  return (
    <div class="auth-page">
      <Brand />
      <form class="auth-card" onSubmit={submit}>
        <h1>{isLogin() ? "Log in" : "Create your account"}</h1>
        <p class="muted">{isLogin() ? "Pick up your garden where you left it." : "Your plans save to your account."}</p>
        <label class="field">
          <span>Email</span>
          <input name="email" type="email" autocomplete="email" required autofocus />
        </label>
        <label class="field">
          <span>Password</span>
          <input name="password" type="password" autocomplete={isLogin() ? "current-password" : "new-password"} minLength={8} required />
          <Show when={!isLogin()}>
            <small class="muted">8 or more characters.</small>
          </Show>
        </label>
        <Show when={error()}>
          <p class="auth-error" role="alert">
            {error()}
          </p>
        </Show>
        <button type="submit" class="primary" disabled={busy()}>
          {isLogin() ? "Log in" : "Create account"}
        </button>
        <p class="auth-switch muted">
          {isLogin() ? "New here? " : "Have an account? "}
          <A href={isLogin() ? "/register" : "/login"}>{isLogin() ? "Create an account" : "Log in"}</A>
        </p>
      </form>
    </div>
  );
}
