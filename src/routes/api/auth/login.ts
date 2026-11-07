import type { APIEvent } from "@solidjs/start/server";
import { checkPassword, credsSchema, publicUser, readUsers, sessionCookie } from "../../../server/auth";

export async function POST({ request }: APIEvent) {
  const wrong = () => Response.json({ error: "The email or password is wrong." }, { status: 401 });
  const result = credsSchema.safeParse(await request.json());
  if (!result.success) return wrong();
  const user = (await readUsers()).find((u) => u.email === result.data.email);
  if (!user || !(await checkPassword(result.data.password, user.hash))) return wrong();
  return Response.json(publicUser(user), { headers: { "set-cookie": sessionCookie(user.id) } });
}
