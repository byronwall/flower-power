import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import PageBar from "../account/PageBar";
import { changePassword, deleteAccount, fetchMe, logout } from "../account/session";

export default function Account() {
  const navigate = useNavigate();
  const [me] = createResource(async () => (await fetchMe()) ?? void navigate("/login", { replace: true }));
  const [msg, setMsg] = createSignal<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = createSignal(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    if (data.get("next") !== data.get("again")) return setMsg({ ok: false, text: "The new passwords do not match." });
    setBusy(true);
    try {
      await changePassword(String(data.get("current")), String(data.get("next")));
      form.reset();
      setMsg({ ok: true, text: "Your password is changed." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm("Delete your account and all of your projects? This cannot be undone.")) return;
    await deleteAccount();
    navigate("/", { replace: true });
  }

  return (
    <div class="page">
      <PageBar me={me()} />
      <Show when={me()}>
        {(m) => (
          <main class="page-main narrow">
            <div class="page-head">
              <div>
                <p class="eyebrow">Settings</p>
                <h1>Account</h1>
              </div>
            </div>

            <section class="panel">
              <h2>Email</h2>
              <p class="panel-value">{m().email}</p>
            </section>

            <form class="panel" onSubmit={submit}>
              <h2>Change password</h2>
              <label class="field">
                <span>Current password</span>
                <input name="current" type="password" autocomplete="current-password" required />
              </label>
              <label class="field">
                <span>New password</span>
                <input name="next" type="password" autocomplete="new-password" minLength={8} required />
              </label>
              <label class="field">
                <span>New password again</span>
                <input name="again" type="password" autocomplete="new-password" minLength={8} required />
              </label>
              <Show when={msg()}>
                {(m) => (
                  <p classList={{ "auth-error": !m().ok, "auth-ok": m().ok }} role="status">
                    {m().text}
                  </p>
                )}
              </Show>
              <div>
                <button type="submit" class="primary" disabled={busy()}>
                  Change password
                </button>
              </div>
            </form>

            <section class="panel">
              <h2>Session</h2>
              <div>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    navigate("/login", { replace: true });
                  }}
                >
                  Log out
                </button>
              </div>
            </section>

            <section class="panel danger-zone">
              <h2>Delete account</h2>
              <p class="muted">This deletes your account, every project, and every share link. You cannot undo it.</p>
              <div>
                <button type="button" class="danger" onClick={remove}>
                  Delete my account
                </button>
              </div>
            </section>
          </main>
        )}
      </Show>
    </div>
  );
}
