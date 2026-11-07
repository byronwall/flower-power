import { A, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, onCleanup, Show } from "solid-js";
import PageBar from "../account/PageBar";
import "../account/profile.css";
import { fetchMe, setPendingImport } from "../account/session";

type Pick = { file: File; url: string };

const isImage = (f: File) => f.type === "image/jpeg" || f.type === "image/png";

// Drop or pick one aerial plus any yard photos, check them, then start the import on /plan.
export default function NewFromPhotos() {
  const navigate = useNavigate();
  const [me] = createResource(async () => (await fetchMe()) ?? void navigate("/login", { replace: true }));
  const [picks, setPicks] = createSignal<Pick[]>([]);
  const [over, setOver] = createSignal(false);
  const [skipped, setSkipped] = createSignal(0);
  let input!: HTMLInputElement;

  onCleanup(() => picks().forEach((p) => URL.revokeObjectURL(p.url)));

  const add = (files: File[]) => {
    const ok = files.filter(isImage);
    setSkipped(files.length - ok.length);
    // A file named like an aerial goes first, unless an aerial is already set.
    const next = [...picks(), ...ok.map((file) => ({ file, url: URL.createObjectURL(file) }))];
    const i = picks().length ? -1 : next.findIndex((p) => /aerial|satellite|overhead/i.test(p.file.name));
    setPicks(i > 0 ? [next[i], ...next.filter((_, j) => j !== i)] : next);
  };
  const remove = (p: Pick) => {
    URL.revokeObjectURL(p.url);
    setPicks(picks().filter((x) => x !== p));
  };
  const makeAerial = (p: Pick) => setPicks([p, ...picks().filter((x) => x !== p)]);
  const start = () => {
    setPendingImport(picks().map((p) => p.file));
    navigate("/plan?import=1");
  };

  return (
    <div class="page">
      <PageBar me={me()} />
      <main class="page-main">
        <div class="page-head">
          <div>
            <p class="eyebrow">
              <A href="/projects">My projects</A> / New
            </p>
            <h1>New from photos</h1>
          </div>
        </div>
        <p class="muted">Add one aerial image of the lot (a map screenshot works) and any yard or listing photos. The first image is the aerial.</p>

        <div
          class="drop"
          classList={{ over: over() }}
          role="button"
          tabIndex={0}
          onClick={() => input.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.click())}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            add([...(e.dataTransfer?.files ?? [])]);
          }}
        >
          <strong>Drop images here</strong>
          <span class="muted">or click to pick files · JPEG or PNG</span>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={(e) => {
            add([...(e.currentTarget.files ?? [])]);
            e.currentTarget.value = "";
          }}
        />
        <Show when={skipped()}>
          <p class="auth-error" role="alert">
            Skipped {skipped()} file{skipped() === 1 ? "" : "s"} that {skipped() === 1 ? "is not" : "are not"} JPEG or PNG.
          </p>
        </Show>

        <Show when={picks().length}>
          <ul class="drop-list">
            <For each={picks()}>
              {(p, i) => (
                <li classList={{ aerial: i() === 0 }}>
                  <img src={p.url} alt={p.file.name} />
                  <div class="drop-meta">
                    <span class="drop-role">{i() === 0 ? "Aerial" : "Photo"}</span>
                    <span class="drop-name" title={p.file.name}>
                      {p.file.name}
                    </span>
                    <span class="drop-actions">
                      <Show when={i() > 0}>
                        <button type="button" onClick={() => makeAerial(p)}>
                          Use as aerial
                        </button>
                      </Show>
                      <button type="button" onClick={() => remove(p)} aria-label={`Remove ${p.file.name}`}>
                        Remove
                      </button>
                    </span>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>

        <div class="page-actions drop-go">
          <button type="button" onClick={() => navigate("/projects")}>
            Cancel
          </button>
          <button type="button" class="primary" disabled={!picks().length} onClick={start}>
            Start import{picks().length ? ` (${picks().length} image${picks().length === 1 ? "" : "s"})` : ""}
          </button>
        </div>
      </main>
    </div>
  );
}
