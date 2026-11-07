import { A, useNavigate } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import { Avatar, AVATAR_NAMES, AvatarPicker } from "./Avatar";
import { randomAvatar, type AvatarId } from "./avatars";
import Brand from "./Brand";
import { Icon } from "./Icon";
import { fetchMe, sendCreds } from "./session";
import "./account.css";
import "./profile.css";

// The shared form for /login and /register. On success it opens the projects page.
export default function AuthForm(props: { kind: "login" | "register" }) {
  const navigate = useNavigate();
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [show, setShow] = createSignal(false);
  const [avatar, setAvatar] = createSignal<AvatarId>(randomAvatar());
  const isLogin = () => props.kind === "login";

  // Someone already logged in has nothing to do here.
  onMount(async () => {
    if (await fetchMe()) navigate("/projects", { replace: true });
  });

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    setBusy(true);
    setError("");
    const profile = isLogin() ? {} : { avatar: avatar(), name: String(form.get("name") ?? "") };
    const err = await sendCreds(props.kind, String(form.get("email")), String(form.get("password")), profile);
    setBusy(false);
    if (err) setError(err);
    else navigate("/projects", { replace: true });
  };

  return (
    <div class="auth-page">
      <Brand />
      <form class="auth-card" classList={{ wide: !isLogin() }} onSubmit={submit}>
        <Show
          when={!isLogin()}
          fallback={
            <>
              <h1>Welcome back</h1>
              <p class="muted">Pick up your garden where you left it.</p>
            </>
          }
        >
          <div class="auth-hello">
            <span class="auth-hello-avatar">
              <Avatar id={avatar()} size={64} />
            </span>
            <div>
              <h1>Create your account</h1>
              <p class="muted">Pick a garden friend to be you. You can change it later.</p>
            </div>
          </div>
          <AvatarPicker value={avatar()} onChange={setAvatar} />
          <label class="field">
            <span>
              What should we call you? <small class="muted">(optional)</small>
            </span>
            <input name="name" type="text" autocomplete="given-name" maxLength={40} placeholder={`e.g. ${AVATAR_NAMES[avatar()]} fan`} />
          </label>
        </Show>
        <label class="field">
          <span>Email</span>
          <input name="email" type="email" autocomplete="email" required autofocus={isLogin()} />
        </label>
        <label class="field">
          <span>Password</span>
          <span class="pw-wrap">
            <input name="password" type={show() ? "text" : "password"} autocomplete={isLogin() ? "current-password" : "new-password"} minLength={8} required />
            <button type="button" class="pw-toggle" onClick={() => setShow(!show())} aria-pressed={show()} aria-label={show() ? "Hide password" : "Show password"}>
              {show() ? "Hide" : "Show"}
            </button>
          </span>
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
          {busy() ? (isLogin() ? "Logging in…" : "Creating your account…") : isLogin() ? "Log in" : "Create account"}
          <Show when={!busy()}>
            <Icon name="arrow" size={16} />
          </Show>
        </button>
        <p class="auth-switch muted">
          {isLogin() ? "New here? " : "Have an account? "}
          <A href={isLogin() ? "/register" : "/login"}>{isLogin() ? "Create an account" : "Log in"}</A>
        </p>
      </form>
    </div>
  );
}
