import { For, type JSX } from "solid-js";
import { AVATARS, isAvatar, type AvatarId } from "./avatars";

// Garden-friend avatars people pick when they sign up. Plain SVG, so they cost nothing to show.

export const AVATAR_NAMES: Record<AvatarId, string> = {
  sprout: "Sprout",
  sunflower: "Sunflower",
  coneflower: "Coneflower",
  tulip: "Tulip",
  bee: "Bee",
  ladybug: "Ladybug",
  butterfly: "Butterfly",
  mushroom: "Mushroom",
  cardinal: "Cardinal",
};

// Two dot eyes with a shine, rosy cheeks and a smile, centered on (x, y).
function Face(p: { x: number; y: number; s?: number; light?: boolean }) {
  const s = p.s ?? 1;
  const ink = p.light ? "#fffaf0" : "#2f2a24";
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${s})`}>
      <circle cx="-8" cy="5" r="2.6" fill="#f08f9a" opacity="0.55" />
      <circle cx="8" cy="5" r="2.6" fill="#f08f9a" opacity="0.55" />
      <g class="av-eyes">
        <circle cx="-4.5" cy="-1" r="2.3" fill={ink} />
        <circle cx="4.5" cy="-1" r="2.3" fill={ink} />
        <circle cx="-3.8" cy="-1.8" r="0.8" fill={p.light ? "#2f2a24" : "white"} />
        <circle cx="5.2" cy="-1.8" r="0.8" fill={p.light ? "#2f2a24" : "white"} />
      </g>
      <path d="M-3 4 q3 3 6 0" fill="none" stroke={ink} stroke-width="1.5" stroke-linecap="round" />
    </g>
  );
}

const ring = (n: number, r: number, cx: number, cy: number, el: (x: number, y: number, deg: number) => JSX.Element) =>
  Array.from({ length: n }, (_, i) => {
    const deg = (360 / n) * i;
    const a = (deg * Math.PI) / 180;
    return el(cx + Math.sin(a) * r, cy - Math.cos(a) * r, deg);
  });

const art: Record<AvatarId, { bg: string; draw: () => JSX.Element }> = {
  sprout: {
    bg: "#e3eedf",
    draw: () => (
      <>
        <path d="M32 26 C32 20 32 16 32 14" stroke="#4f8a4a" stroke-width="3" stroke-linecap="round" fill="none" />
        <path d="M32 18 C24 18 20 12 21 8 C27 8 32 12 32 18z" fill="#6aa85f" />
        <path d="M32 16 C40 16 44 10 43 6 C37 6 32 10 32 16z" fill="#83bd74" />
        <path d="M18 26 h28 l-3 26 a4 4 0 01-4 3.5 h-14 a4 4 0 01-4-3.5z" fill="#d07a4f" />
        <rect x="16" y="24" width="32" height="7" rx="3" fill="#b8643c" />
        <Face x={32} y={41} />
      </>
    ),
  },
  sunflower: {
    bg: "#fdf0c6",
    draw: () => (
      <>
        {ring(14, 15, 32, 32, (x, y, d) => (
          <ellipse cx={x} cy={y} rx="4.2" ry="8" fill="#f2b53a" transform={`rotate(${d} ${x} ${y})`} />
        ))}
        <circle cx="32" cy="32" r="12.5" fill="#8a5a2b" />
        <Face x={32} y={32} light />
      </>
    ),
  },
  coneflower: {
    bg: "#f6e3ee",
    draw: () => (
      <>
        {ring(11, 15, 32, 33, (x, y, d) => (
          <ellipse cx={x} cy={y} rx="4" ry="9" fill="#c06a9f" transform={`rotate(${d} ${x} ${y})`} />
        ))}
        <circle cx="32" cy="33" r="11.5" fill="#d0743a" />
        <Face x={32} y={33} />
      </>
    ),
  },
  tulip: {
    bg: "#fbe1dd",
    draw: () => (
      <>
        <path d="M32 46 V58" stroke="#4f8a4a" stroke-width="3" stroke-linecap="round" />
        <path d="M32 54 c-6 0 -10 -4 -11 -8 c6 0 10 3 11 8z" fill="#6aa85f" />
        <path d="M16 22 l7 6 l9 -12 l9 12 l7 -6 v14 a16 14 0 01-32 0z" fill="#e0504f" />
        <path d="M23 28 l9 -12 l9 12 v20 c-6 0 -18 0 -18 0z" fill="#ec6a64" opacity="0.6" />
        <Face x={32} y={36} light />
      </>
    ),
  },
  bee: {
    bg: "#fff2c9",
    draw: () => (
      <>
        <ellipse cx="21" cy="22" rx="8" ry="10" fill="white" opacity="0.9" transform="rotate(-25 21 22)" />
        <ellipse cx="43" cy="22" rx="8" ry="10" fill="white" opacity="0.9" transform="rotate(25 43 22)" />
        {/* Every bee's body is the same shape, so a shared clip id is safe even with several on a page. */}
        <clipPath id="av-bee-body">
          <ellipse cx="32" cy="37" rx="16" ry="15" />
        </clipPath>
        <g clip-path="url(#av-bee-body)">
          <rect x="16" y="22" width="32" height="30" fill="#f5c33b" />
          <rect x="16" y="41" width="32" height="4" fill="#3a2f22" />
          <rect x="16" y="48" width="32" height="5" fill="#3a2f22" />
        </g>
        <path d="M27 23 q-2 -7 -6 -8 M37 23 q2 -7 6 -8" stroke="#3a2f22" stroke-width="1.8" fill="none" stroke-linecap="round" />
        <circle cx="21" cy="15" r="2" fill="#3a2f22" />
        <circle cx="43" cy="15" r="2" fill="#3a2f22" />
        <Face x={32} y={32} s={0.95} />
      </>
    ),
  },
  ladybug: {
    bg: "#fde0dc",
    draw: () => (
      <>
        <path d="M14 38 a18 17 0 0136 0 v2 a4 4 0 01-4 4 h-28 a4 4 0 01-4 -4z" fill="#d9403a" />
        <path d="M32 22 V44" stroke="#2f2a24" stroke-width="1.6" />
        <circle cx="22" cy="31" r="3" fill="#2f2a24" />
        <circle cx="42" cy="31" r="3" fill="#2f2a24" />
        <circle cx="21" cy="40" r="2.5" fill="#2f2a24" />
        <circle cx="43" cy="40" r="2.5" fill="#2f2a24" />
        <ellipse cx="32" cy="22" rx="11" ry="8" fill="#2f2a24" />
        <Face x={32} y={21} s={0.85} light />
      </>
    ),
  },
  butterfly: {
    bg: "#e8eafb",
    draw: () => (
      <>
        <g class="av-wings">
          <path d="M31 30 C24 14 8 14 10 26 C11 34 22 36 31 32z" fill="#8a7fd6" />
          <path d="M33 30 C40 14 56 14 54 26 C53 34 42 36 33 32z" fill="#8a7fd6" />
          <path d="M31 33 C22 36 14 46 20 50 C26 52 30 42 31 36z" fill="#f2a24a" />
          <path d="M33 33 C42 36 50 46 44 50 C38 52 34 42 33 36z" fill="#f2a24a" />
        </g>
        <rect x="29" y="24" width="6" height="26" rx="3" fill="#3a2f22" />
        <path d="M30 18 q-3 -5 -7 -6 M34 18 q3 -5 7 -6" stroke="#3a2f22" stroke-width="1.6" fill="none" stroke-linecap="round" />
        <circle cx="32" cy="22" r="7.5" fill="#3a2f22" />
        <Face x={32} y={22} s={0.6} light />
      </>
    ),
  },
  mushroom: {
    bg: "#f1e9dd",
    draw: () => (
      <>
        <path d="M22 34 h20 l-2 16 a4 4 0 01-4 4 h-8 a4 4 0 01-4 -4z" fill="#f6ead2" />
        <path d="M10 32 a22 19 0 0144 0 a3 3 0 01-3 3 h-38 a3 3 0 01-3 -3z" fill="#d9483f" />
        <circle cx="22" cy="22" r="3.5" fill="white" />
        <circle cx="36" cy="17" r="3" fill="white" />
        <circle cx="45" cy="27" r="2.6" fill="white" />
        <circle cx="29" cy="29" r="2" fill="white" />
        <Face x={32} y={43} s={0.85} />
      </>
    ),
  },
  cardinal: {
    bg: "#fde2df",
    draw: () => (
      <>
        <path d="M22 24 l2 -14 l8 11z" fill="#c7302b" />
        <ellipse cx="32" cy="37" rx="17" ry="17" fill="#d23a33" />
        <ellipse cx="45" cy="42" rx="6" ry="9" fill="#b02e29" transform="rotate(-20 45 42)" />
        <path d="M21 28 q11 -5 22 0 l-4 10 h-14z" fill="#2f2a24" />
        <path d="M28.5 36 l3.5 6 l3.5 -6z" fill="#f2a24a" />
        <Face x={32} y={30} s={0.8} light />
      </>
    ),
  },
};

export function Avatar(props: { id?: string | null; size?: number; class?: string; title?: string }) {
  const id = () => (isAvatar(props.id) ? props.id : "sprout");
  const s = () => props.size ?? 32;
  return (
    <svg class={`avatar av-${id()} ${props.class ?? ""}`} viewBox="0 0 64 64" width={s()} height={s()} role={props.title ? "img" : undefined} aria-hidden={props.title ? undefined : "true"}>
      {props.title && <title>{props.title}</title>}
      <circle cx="32" cy="32" r="32" fill={art[id()].bg} />
      <g class="av-body">{art[id()].draw()}</g>
    </svg>
  );
}

// A row of avatars to choose from, as a radio group.
export function AvatarPicker(props: { value: AvatarId; onChange: (id: AvatarId) => void; name?: string }) {
  return (
    <div class="avatar-picker" role="radiogroup" aria-label="Pick your avatar">
      <For each={AVATARS}>
        {(id) => (
          <button
            type="button"
            role="radio"
            class="avatar-choice"
            aria-checked={props.value === id}
            aria-label={AVATAR_NAMES[id]}
            title={AVATAR_NAMES[id]}
            onClick={() => props.onChange(id)}
          >
            <Avatar id={id} size={52} />
          </button>
        )}
      </For>
      {props.name && <input type="hidden" name={props.name} value={props.value} />}
    </div>
  );
}
