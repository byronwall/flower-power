// The avatar ids an account can hold. Shared by the server (to check them) and the client (to draw them).
// They are stored on the account, so keep them stable.
export const AVATARS = ["sprout", "sunflower", "coneflower", "tulip", "bee", "ladybug", "butterfly", "mushroom", "cardinal"] as const;
export type AvatarId = (typeof AVATARS)[number];

export const isAvatar = (v: unknown): v is AvatarId => typeof v === "string" && (AVATARS as readonly string[]).includes(v);
export const randomAvatar = (): AvatarId => AVATARS[Math.floor(Math.random() * AVATARS.length)];
