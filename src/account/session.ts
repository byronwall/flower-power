// Client calls for the auth routes. The session itself is an HTTP-only cookie.
export type Me = { id: string; email: string; avatar: string | null; name: string | null };
export type ProfileInput = { avatar?: string; name?: string };

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch("/api/auth/me");
  return res.ok ? res.json() : null;
}

// Returns an error message, or null when the person is now logged in.
export async function sendCreds(kind: "login" | "register", email: string, password: string, profile: ProfileInput = {}): Promise<string | null> {
  const res = await fetch(`/api/auth/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, ...profile }),
  });
  return res.ok ? null : ((await res.json()).error ?? `Failed with status ${res.status}.`);
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Failed with status ${res.status}.`);
  return json;
}

// { propertyId: token } for the user's share links that are on.
export const fetchShares = (): Promise<Record<string, string>> => send("/api/shares", "GET");
export const shareOn = (id: string): Promise<{ token: string }> => send(`/api/shares/${id}`, "POST");
export const shareOff = (id: string) => send(`/api/shares/${id}`, "DELETE");
export const shareUrl = (token: string) => `${location.origin}/share/${token}`;
export const deleteProperty = (id: string) => send(`/api/properties/${id}`, "DELETE");
export const changePassword = (current: string, next: string) => send("/api/auth/password", "POST", { current, next });
export const deleteAccount = () => send("/api/auth/me", "DELETE");
export const updateProfile = (p: ProfileInput): Promise<Me> => send("/api/auth/me", "PATCH", p);

// Files picked on /projects for "New from photos". /plan takes them and runs the import.
let pending: File[] | null = null;
export const setPendingImport = (files: File[]) => (pending = files);
export function takePendingImport() {
  const files = pending;
  pending = null;
  return files;
}
