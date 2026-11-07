import type { APIEvent } from "@solidjs/start/server";
import { readUsers, unauthorized, userId } from "../../../server/auth";

export async function GET({ request }: APIEvent) {
  const id = userId(request);
  const user = id && (await readUsers()).find((u) => u.id === id);
  if (!user) return unauthorized();
  return Response.json({ id: user.id, email: user.email });
}
