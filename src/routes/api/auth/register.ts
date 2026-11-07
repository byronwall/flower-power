import type { APIEvent } from "@solidjs/start/server";
import { createUser, credsSchema, profileSchema, publicUser, readUsers, sessionCookie } from "../../../server/auth";

export async function POST({ request }: APIEvent) {
  const body = await request.json();
  const result = credsSchema.safeParse(body);
  if (!result.success) return Response.json({ error: "Use a valid email and a password of 8 or more characters." }, { status: 400 });
  // A bad avatar or name never blocks signing up; they are just left off.
  const profile = profileSchema.safeParse(body);
  const { email, password } = result.data;
  if ((await readUsers()).some((u) => u.email === email)) return Response.json({ error: "That email already has an account. Log in instead?" }, { status: 409 });
  const user = await createUser(email, password, profile.success ? profile.data : {});
  return Response.json(publicUser(user), { headers: { "set-cookie": sessionCookie(user.id) } });
}
