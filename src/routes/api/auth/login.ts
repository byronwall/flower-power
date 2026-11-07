import type { APIEvent } from "@solidjs/start/server";
import { checkPassword, credsSchema, DEMO, publicUser, readUsers, resetDemo, sessionCookie } from "../../../server/auth";

export async function POST({ request }: APIEvent) {
  const wrong = () => Response.json({ error: "The email or password is wrong." }, { status: 401 });
  const result = credsSchema.safeParse(await request.json());
  if (!result.success) return wrong();
  const { email, password } = result.data;
  if (email === DEMO.email && password === DEMO.password) {
    const demo = await resetDemo();
    return Response.json(publicUser(demo), { headers: { "set-cookie": sessionCookie(demo.id) } });
  }
  const user = (await readUsers()).find((u) => u.email === email);
  if (!user || !(await checkPassword(password, user.hash))) return wrong();
  return Response.json(publicUser(user), { headers: { "set-cookie": sessionCookie(user.id) } });
}
