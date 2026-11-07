import type { JSX } from "solid-js";

// Line icons for the landing page, drawn on a 24px grid with the same round stroke as the app's own.
const paths: Record<string, () => JSX.Element> = {
  camera: () => (
    <>
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  wand: () => (
    <>
      <path d="M5 19L15 9M13.5 7.5l3 3" />
      <path d="M18 3v3M16.5 4.5h3M20 10v2M19 11h2M9 3v2M8 4h2" />
    </>
  ),
  palette: () => (
    <>
      <path d="M12 3a9 9 0 100 18c1.4 0 2-1 1.4-2.2-.7-1.4.2-2.8 1.8-2.8H18a3 3 0 003-3c0-5.5-4-10-9-10z" />
      <circle cx="7.5" cy="11" r="1.2" />
      <circle cx="10" cy="7" r="1.2" />
      <circle cx="15" cy="7.5" r="1.2" />
    </>
  ),
  list: () => (
    <>
      <path d="M4 6.5l1.5 1.5L8 5.5M4 12.5L5.5 14 8 11.5M4 18.5L5.5 20 8 17.5" />
      <path d="M11 7h9M11 13h9M11 19h6" />
    </>
  ),
  sun: () => (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
    </>
  ),
  leaf: () => (
    <>
      <path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15" />
      <path d="M5 19l8-8" />
    </>
  ),
  flower: () => (
    <>
      <circle cx="12" cy="9" r="2.2" />
      <path d="M12 6.8c-1-2.6 2-3.8 2.6-1.6M14.2 9c2.6-1 3.8 2 1.6 2.6M12 11.2c1 2.6-2 3.8-2.6 1.6M9.8 9c-2.6 1-3.8-2-1.6-2.6" />
      <path d="M12 13v8M12 18c-2 0-3.5-1-4-3 2 0 3.5 1 4 3z" />
    </>
  ),
  growth: () => (
    <>
      <path d="M3 20h18" />
      <path d="M6 20v-3M10 20v-6M14 20v-9M18 20v-13" />
    </>
  ),
  calendar: () => (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  cloud: () => (
    <>
      <path d="M7 18h10a4.5 4.5 0 00.5-9A6 6 0 006 10a4 4 0 001 8z" />
    </>
  ),
  rain: () => (
    <>
      <path d="M7 15h10a4 4 0 00.5-8A5.5 5.5 0 007 7.5 3.8 3.8 0 007 15z" />
      <path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5" />
    </>
  ),
  snow: () => <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />,
  cube: () => (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  map: () => (
    <>
      <path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </>
  ),
  share: () => (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
    </>
  ),
  play: () => <path d="M8 5.5v13l10-6.5z" fill="currentColor" />,
  pause: () => <path d="M8 5v14M16 5v14" stroke-width="3" />,
  restart: () => (
    <>
      <path d="M4.5 12a7.5 7.5 0 102.2-5.3" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  film: () => (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 9h18M3 15h18M7.5 5v4M12 5v4M16.5 5v4M7.5 15v4M12 15v4M16.5 15v4" />
    </>
  ),
  pointer: () => (
    <>
      <path d="M6 3.5l12 7-5.2 1.3 3 5.6-2.4 1.3-3-5.6L6 16.5z" />
    </>
  ),
  check: () => <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrow: () => <path d="M4 12h15M13 6l6 6-6 6" />,
  chevron: () => <path d="M6 9l6 6 6-6" />,
  home: () => (
    <>
      <path d="M4 11l8-6.5 8 6.5" />
      <path d="M6 9.5V20h12V9.5" />
    </>
  ),
  shovel: () => (
    <>
      <path d="M14 10L5 19" />
      <path d="M13 5.5l5.5 5.5-2.5 2.5c-1.5 1.5-4 1.5-5.5 0s-1.5-4 0-5.5z" />
      <path d="M4 18l2 2" />
    </>
  ),
  cart: () => (
    <>
      <path d="M3 4h2.5l2 11h11l2-8H7" />
      <circle cx="9" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </>
  ),
  bird: () => (
    <>
      <path d="M4 14c3 0 5-1 6.5-3.5C12 8 13.5 6 16 6c1.8 0 3 1.2 3 3l2 .5-2 1c0 4-3 7.5-8.5 7.5C7 18 5 16.5 4 14z" />
      <path d="M10 13c1.5 1 3.5 1 5-.5" />
    </>
  ),
  question: () => (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .6-1.5 1.2-1.5 2.5M12 17h.01" />
    </>
  ),
};

export type IconName = keyof typeof paths;

export function Icon(props: { name: IconName; size?: number; class?: string }) {
  const s = () => props.size ?? 20;
  return (
    <svg
      class={`icon ${props.class ?? ""}`}
      viewBox="0 0 24 24"
      width={s()}
      height={s()}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {paths[props.name]()}
    </svg>
  );
}
