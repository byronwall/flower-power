import { clearCookie } from "../../../server/auth";

export function POST() {
  return Response.json({ ok: true }, { headers: { "set-cookie": clearCookie() } });
}
