import { For, Show } from "solid-js";
import { find, type Op } from "../model/design";
import type { Point, Property } from "../model/property";
import { plantsById } from "../model/library";
import "./design.css";

// The ghost overlay for a design, drawn in plan feet inside PlanView's overlay slot.
// Removals are red, additions green, and replacements amber. Moves draw an arrow from the old place.

type Props = { base: Property; ops: Op[]; scope?: Point[]; selected?: number; onPick?: (i: number) => void };

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

export function opTone(op: Op["op"]) {
  return op === "remove" ? "del" : op === "replace" || op === "reshape" || op === "move" ? "swap" : op === "keep" ? "keep" : "add";
}

export function Ghost(props: Props) {
  return (
    <g class="ghost">
      <Show when={props.scope}>{(s) => <polygon class="ghost-scope" points={poly(s())} />}</Show>
      <For each={props.ops}>
        {(o, i) => {
          const cls = () => `ghost-${opTone(o.op)}${props.selected === i() ? " ghost-on" : ""}`;
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
    </g>
  );
}
