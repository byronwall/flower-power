import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, Show } from "solid-js";
import { Avatar, AvatarPicker } from "../account/Avatar";
import { isAvatar, type AvatarId } from "../account/avatars";
import PageBar from "../account/PageBar";
import { changePassword, deleteAccount, fetchMe, logout, updateProfile, type Me } from "../account/session";
import "../account/profile.css";

export default function Account() {
  const navigate = useNavigate();
  const [me, { mutate }] = createResource(async () => (await fetchMe()) ?? void navigate("/login", { replace: true }));
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

            <ProfilePanel me={m()} onSaved={mutate} />

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

// Avatar and name. The avatar saves as soon as it is picked; the name saves on Enter or when the field loses focus.
function ProfilePanel(props: { me: Me; onSaved: (m: Me) => void }) {
  const [avatar, setAvatar] = createSignal<AvatarId>(isAvatar(props.me.avatar) ? props.me.avatar : "sprout");
  const [note, setNote] = createSignal<{ ok: boolean; text: string } | null>(null);
  let timer = 0;

  async function save(p: { avatar?: string; name?: string }) {
    try {
      props.onSaved(await updateProfile(p));
      setNote({ ok: true, text: "Saved." });
    } catch (err) {
      setNote({ ok: false, text: (err as Error).message });
    }
    clearTimeout(timer);
    timer = window.setTimeout(() => setNote(null), 2000);
  }

  return (
    <section class="panel profile-panel">
      <div class="profile-head">
        <Avatar id={avatar()} size={72} class="profile-big" />
        <div>
          <h2>Your avatar</h2>
          <p class="muted">It shows in the corner of every page, next to your projects.</p>
        </div>
        <Show when={note()}>
          {(n) => (
            <span classList={{ "save-note": true, bad: !n().ok }} role="status">
              {n().text}
            </span>
          )}
        </Show>
      </div>
      <AvatarPicker
        value={avatar()}
        onChange={(id) => {
          setAvatar(id);
          save({ avatar: id });
        }}
      />
      <label class="field">
        <span>Name</span>
        <input
          type="text"
          maxLength={40}
          value={props.me.name ?? ""}
          placeholder="What should we call you?"
          autocomplete="given-name"
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          onChange={(e) => save({ name: e.currentTarget.value })}
        />
      </label>
    </section>
  );
}
