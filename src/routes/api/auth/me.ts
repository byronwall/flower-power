import { rm } from "node:fs/promises";
import type { APIEvent } from "@solidjs/start/server";
import { clearCookie, profileSchema, publicUser, readUsers, unauthorized, userDir, userId, writeUsers } from "../../../server/auth";
import { shareOff } from "../../../server/shares";

export async function GET({ request }: APIEvent) {
  const id = userId(request);
  const user = id && (await readUsers()).find((u) => u.id === id);
  if (!user) return unauthorized();
  return Response.json(publicUser(user));
}

// Changes the avatar or name. Fields left out stay as they are; an empty name clears it.
export async function PATCH({ request }: APIEvent) {
  const id = userId(request);
  if (!id) return unauthorized();
  const body = await request.json();
  const result = profileSchema.safeParse(body);
  if (!result.success) return Response.json({ error: "Pick one of the avatars, and keep the name to 40 characters." }, { status: 400 });
  const users = await readUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return unauthorized();
  if (result.data.avatar) user.avatar = result.data.avatar;
  if ("name" in body) user.name = result.data.name;
  await writeUsers(users);
  return Response.json(publicUser(user));
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
