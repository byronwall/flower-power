import type { APIEvent } from "@solidjs/start/server";
import { sharedProperty } from "../../../server/shares";

// Public and read-only: there is no write route for a token.
export async function GET({ params }: APIEvent) {
  const property = await sharedProperty(params.token);
  if (!property) return Response.json({ error: "This link is off or does not exist." }, { status: 404 });
  return Response.json(property);
}
