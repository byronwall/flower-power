import { access } from "node:fs/promises";
import { join } from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { unauthorized, userDir, userId } from "../../../server/auth";
import { shareOff, shareOn } from "../../../server/shares";

// Turns the share link for one of the user's properties on.
export async function POST({ params, request }: APIEvent) {
  const dir = userDir(request);
  if (!dir) return unauthorized();
  if (!/^[\w-]+$/.test(params.id)) return Response.json({ error: "Bad id." }, { status: 400 });
  const ok = await access(join(dir, "properties", `${params.id}.json`)).then(() => true, () => false);
  if (!ok) return Response.json({ error: "No such property." }, { status: 404 });
  return Response.json({ token: await shareOn(userId(request)!, params.id) });
}

// Turns it off. The old link stops working at once.
export async function DELETE({ params, request }: APIEvent) {
  const id = userId(request);
  if (!id) return unauthorized();
  await shareOff(id, params.id);
  return Response.json({ ok: true });
}
