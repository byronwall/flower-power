import { For, Show } from "solid-js";
import { find, type Op, type Review } from "../model/design";
import type { Point, Property } from "../model/property";
import { plantsById } from "../model/library";
import "./design.css";

// The ghost overlay for a design, drawn in plan feet inside PlanView's overlay slot.
// Removals are red, additions green, and replacements amber. Moves draw an arrow from the old place.

type Props = { base: Property; ops: Op[]; scope?: Point[]; selected?: number; hover?: Op | null; onPick?: (i: number) => void; review?: Review | null };

const poly = (o: Point[]) => o.map((q) => q.join(",")).join(" ");

function Shape(props: { item: any; class: string; radius?: number }) {
  const r = () => props.radius ?? (props.item.plantId ? (plantsById.get(props.item.plantId)?.size.spreadFt ?? 3) / 2 : 1.5);
  return (
    <>
      <Show when={props.item.at}>{(at) => <circle class={props.class} cx={at()[0]} cy={at()[1]} r={Math.max(1, r())} />}</Show>
      <Show when={props.item.outline}>{(o) => <polygon class={props.class} points={poly(o())} />}</Show>
      <Show when={props.item.path}>{(p) => <polyline class={props.class} points={poly(p())} />}</Show>
    </>
  );
}

// A short name for what an op changes, such as "Daylily → Catmint".
export function opLabel(base: Property, o: Op) {
  const name = (id: string) => plantsById.get(id)?.commonName ?? id;
  const what = (item: any) => (item.plantId ? name(item.plantId) : item.kind);
  if (o.op === "add" || o.op === "addFeature") return what(o.item);
  const old = find(base, o.id)?.item;
  if (o.op === "replace") return `${old ? what(old) : o.id} → ${what(o.item)}`;
  return old ? what(old) : o.id;
}

export function opTone(op: Op["op"]) {
  return op === "remove" ? "del" : op === "replace" || op === "reshape" || op === "move" ? "swap" : op === "keep" ? "keep" : "add";
}

export function Ghost(props: Props) {
  return (
    <g class="ghost" classList={{ "ghost-still": !props.onPick }}>
      <Show when={props.scope}>{(s) => <polygon class="ghost-scope" points={poly(s())} />}</Show>
      <For each={props.ops}>
        {(o, i) => {
          const cls = () => `ghost-${opTone(o.op)}${props.selected === i() || props.hover === o ? " ghost-on" : ""}`;
          const pick = () => props.onPick?.(i());
          if (o.op === "add" || o.op === "addFeature") return <g onClick={pick}><Shape item={o.item} class={cls()} /></g>;
          const old = find(props.base, o.id)?.item as any;
          if (!old || o.op === "keep") return null;
          if (o.op === "remove") return <g onClick={pick}><Shape item={old} class={cls()} /></g>;
          if (o.op === "replace") return <g onClick={pick}><Shape item={o.item} class={cls()} /></g>;
          if (o.op === "reshape") return <g onClick={pick}><Shape item={{ ...old, ...(o.outline ? { outline: o.outline } : {}), ...(o.path ? { path: o.path } : {}) }} class={cls()} /></g>;
          const from: Point = old.at ?? old.outline?.[0] ?? old.path[0];
          return (
            <g onClick={pick}>
              <line class={cls()} x1={from[0]} y1={from[1]} x2={o.at[0]} y2={o.at[1]} />
              <circle class={cls()} cx={o.at[0]} cy={o.at[1]} r="1.5" />
            </g>
          );
        }}
      </For>
      <Show when={props.review}>
        {(rv) => (
          <For each={rv().empty.filter((s) => s.at)}>
            {(s, i) => (
              <g class="ghost-pin" transform={`translate(${s.at![0]} ${s.at![1]})`}>
                <title>{s.note}</title>
                <circle r="2.2" />
                <text y="0.9">{i() + 1}</text>
              </g>
            )}
          </For>
        )}
      </Show>
    </g>
  );
}
