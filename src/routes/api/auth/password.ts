import type { APIEvent } from "@solidjs/start/server";
import { z } from "zod";
import { checkPassword, hashPassword, readUsers, unauthorized, userId, writeUsers } from "../../../server/auth";

const schema = z.object({ current: z.string(), next: z.string().min(8) });

export async function POST({ request }: APIEvent) {
  const id = userId(request);
  if (!id) return unauthorized();
  const result = schema.safeParse(await request.json());
  if (!result.success) return Response.json({ error: "The new password needs 8 or more characters." }, { status: 400 });
  const users = await readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return unauthorized();
  if (!(await checkPassword(result.data.current, user.hash))) return Response.json({ error: "The current password is wrong." }, { status: 403 });
  user.hash = await hashPassword(result.data.next);
  await writeUsers(users);
  return Response.json({ ok: true });
}
