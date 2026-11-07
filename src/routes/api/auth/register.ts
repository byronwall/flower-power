import type { APIEvent } from "@solidjs/start/server";
import { createUser, credsSchema, readUsers, sessionCookie } from "../../../server/auth";

export async function POST({ request }: APIEvent) {
  const result = credsSchema.safeParse(await request.json());
  if (!result.success) return Response.json({ error: "Use a valid email and a password of 8 or more characters." }, { status: 400 });
  const { email, password } = result.data;
  if ((await readUsers()).some((u) => u.email === email)) return Response.json({ error: "That email already has an account." }, { status: 409 });
  const user = await createUser(email, password);
  return Response.json({ id: user.id, email }, { headers: { "set-cookie": sessionCookie(user.id) } });
}
