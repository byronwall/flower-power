import { A, useNavigate } from "@solidjs/router";
import { createResource, createSignal, For, Show } from "solid-js";
import PageBar from "../account/PageBar";
import { sample } from "../account/sample";
import { deleteProperty, fetchMe, fetchShares, setPendingImport, shareOff, shareOn, shareUrl } from "../account/session";
import Thumb from "../account/Thumb";
import { loadProperties, saveProperty } from "../model/library";
import type { Property } from "../model/property";

// The person's projects: open, rename, share and delete each one, or start a new one.
export default function Projects() {
  const navigate = useNavigate();
  const [me] = createResource(async () => (await fetchMe()) ?? void navigate("/login", { replace: true }));
  const [list, { mutate }] = createResource(me, loadProperties);
  const [shares, { mutate: setShares }] = createResource(me, fetchShares);
  const [error, setError] = createSignal("");
  let picker!: HTMLInputElement;

  const fail = (e: unknown) => setError((e as Error).message);
  const nextId = (base: string) => {
    const ids = new Set(list()?.map((p) => p.id));
    let n = 1;
    while (ids.has(`${base}-${n}`)) n++;
    return n;
  };

  async function fromSample() {
    const n = nextId("my-garden");
    const p = { ...sample, id: `my-garden-${n}`, name: `My garden ${n}` };
    try {
      await saveProperty(p);
      navigate(`/plan?id=${p.id}`);
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div class="page">
      <PageBar me={me()} />
      <main class="page-main">
        <div class="page-head">
          <div>
            <p class="eyebrow">Your gardens</p>
            <h1>My projects</h1>
          </div>
          <div class="page-actions">
            <button type="button" onClick={fromSample}>
              Start from sample
            </button>
            <button type="button" class="primary" onClick={() => picker.click()} title="Pick one aerial image and any listing photos">
              New from photos
            </button>
            <input
              ref={picker}
              type="file"
              accept="image/jpeg,image/png"
              multiple
              hidden
              onChange={(e) => {
                const files = [...(e.currentTarget.files ?? [])];
                if (!files.length) return;
                setPendingImport(files);
                navigate("/plan?import=1");
              }}
            />
          </div>
        </div>
        <Show when={error()}>
          <p class="auth-error" role="alert">
            {error()}
          </p>
        </Show>
        <Show when={list()} fallback={<p class="status">{list.error ? String(list.error.message) : "Loading your projects…"}</p>}>
          {(l) => (
            <Show
              when={l().length}
              fallback={
                <div class="page-empty">
                  <h2>No projects yet</h2>
                  <p class="muted">Start from photos of your yard, or copy the sample lot and change it.</p>
                </div>
              }
            >
              <ul class="cards">
                <For each={l()}>
                  {(p) => (
                    <ProjectCard
                      property={p}
                      token={shares()?.[p.id]}
                      onError={fail}
                      onRenamed={(np) => mutate(l().map((x) => (x.id === np.id ? np : x)))}
                      onDeleted={() => mutate(l().filter((x) => x.id !== p.id))}
                      onShare={(token) => setShares({ ...shares(), [p.id]: token! })}
                      onUnshare={() => {
                        const { [p.id]: _, ...rest } = shares() ?? {};
                        setShares(rest);
                      }}
                    />
                  )}
                </For>
              </ul>
            </Show>
          )}
        </Show>
      </main>
    </div>
  );
}

type CardProps = {
  property: Property;
  token?: string;
  onError: (e: unknown) => void;
  onRenamed: (p: Property) => void;
  onDeleted: () => void;
  onShare: (token: string) => void;
  onUnshare: () => void;
};

function ProjectCard(props: CardProps) {
  const [renaming, setRenaming] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const plants = () => props.property.plantings.length;

  async function rename(name: string) {
    setRenaming(false);
    name = name.trim();
    if (!name || name === props.property.name) return;
    const p = { ...props.property, name };
    try {
      await saveProperty(p);
      props.onRenamed(p);
    } catch (e) {
      props.onError(e);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${props.property.name}"? This cannot be undone.`)) return;
    try {
      await deleteProperty(props.property.id);
      props.onDeleted();
    } catch (e) {
      props.onError(e);
    }
  }

  async function toggleShare() {
    try {
      if (props.token) {
        await shareOff(props.property.id);
        props.onUnshare();
      } else props.onShare((await shareOn(props.property.id)).token);
    } catch (e) {
      props.onError(e);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(shareUrl(props.token!));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li class="card">
      <A href={`/plan?id=${props.property.id}`} class="card-thumb" aria-label={`Open ${props.property.name}`}>
        <Thumb property={props.property} />
      </A>
      <div class="card-body">
        <Show
          when={renaming()}
          fallback={
            <h2 class="card-title" title={props.property.name}>
              {props.property.name}
            </h2>
          }
        >
          <input
            class="card-rename"
            value={props.property.name}
            aria-label="Project name"
            ref={(el) => queueMicrotask(() => el.select())}
            onKeyDown={(e) => {
              if (e.key === "Enter") rename(e.currentTarget.value);
              if (e.key === "Escape") setRenaming(false);
            }}
            onBlur={(e) => rename(e.currentTarget.value)}
          />
        </Show>
        <p class="card-meta muted">
          {plants()} {plants() === 1 ? "planting" : "plantings"}
          <Show when={props.property.underlay}> · from photos</Show>
          <Show when={props.token}>
            {" · "}
            <span class="share-badge">Shared</span>
          </Show>
        </p>
        <Show when={props.token}>
          {(t) => (
            <div class="share-row">
              <input readOnly value={shareUrl(t())} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" onClick={copy}>
                {copied() ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </Show>
        <div class="card-actions">
          <A href={`/plan?id=${props.property.id}`} class="btn primary">
            Open
          </A>
          <button type="button" onClick={() => setRenaming(true)}>
            Rename
          </button>
          <button type="button" onClick={toggleShare} title={props.token ? "Turn off the share link. The old link stops working." : "Make a view-only link anyone can open"}>
            {props.token ? "Unshare" : "Share"}
          </button>
          <button type="button" class="danger" onClick={remove}>
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
