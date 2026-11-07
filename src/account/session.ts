// Client calls for the auth routes. The session itself is an HTTP-only cookie.
export type Me = { id: string; email: string };

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch("/api/auth/me");
  return res.ok ? res.json() : null;
}

// Returns an error message, or null when the person is now logged in.
export async function sendCreds(kind: "login" | "register", email: string, password: string): Promise<string | null> {
  const res = await fetch(`/api/auth/${kind}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.ok ? null : ((await res.json()).error ?? `Failed with status ${res.status}.`);
}

export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}
