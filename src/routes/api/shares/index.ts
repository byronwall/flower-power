import type { APIEvent } from "@solidjs/start/server";
import { unauthorized, userId } from "../../../server/auth";
import { readShares } from "../../../server/shares";

// The logged-in user's share links, as { propertyId: token }.
export async function GET({ request }: APIEvent) {
  const id = userId(request);
  if (!id) return unauthorized();
  const mine = Object.entries(await readShares()).filter(([, s]) => s.userId === id);
  return Response.json(Object.fromEntries(mine.map(([token, s]) => [s.propertyId, token])));
}
