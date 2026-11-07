import { rm } from "node:fs/promises";
import type { APIEvent } from "@solidjs/start/server";
import { clearCookie, readUsers, unauthorized, userDir, userId, writeUsers } from "../../../server/auth";
import { shareOff } from "../../../server/shares";

export async function GET({ request }: APIEvent) {
  const id = userId(request);
  const user = id && (await readUsers()).find((u) => u.id === id);
  if (!user) return unauthorized();
  return Response.json({ id: user.id, email: user.email });
}

// Deletes the account, its files and its share links, and logs out.
export async function DELETE({ request }: APIEvent) {
  const id = userId(request);
  if (!id) return unauthorized();
  await writeUsers((await readUsers()).filter((u) => u.id !== id));
  await shareOff(id);
  await rm(userDir(request)!, { recursive: true, force: true });
  return Response.json({ ok: true }, { headers: { "set-cookie": clearCookie() } });
}
