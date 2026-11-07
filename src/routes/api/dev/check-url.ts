import type { APIEvent } from "@solidjs/start/server";
import { plantUrls } from "../../../dev/plant-files";

// Dev only: checks that a URL from the plant files answers, for the plant data viewer.
// It only checks URLs that appear in data/plants, so it cannot be used to fetch anything else.
// In a production build this always answers 404.
export async function GET({ request }: APIEvent) {
  if (!import.meta.env.DEV) return new Response("Not found", { status: 404 });
  const url = new URL(request.url).searchParams.get("url") ?? "";
  if (!plantUrls().has(url)) return Response.json({ error: "That URL is not in the plant files." }, { status: 400 });
  return Response.json(await check(url));
}

async function check(url: string) {
  const attempt = (method: string) =>
    fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(10_000), headers: { "user-agent": "flower-power-dev-check" } });
  try {
    let res = await attempt("HEAD");
    // Some sites refuse HEAD. Try a normal request before calling it broken.
    if (res.status >= 400) res = await attempt("GET");
    return { ok: res.ok, status: res.status, contentType: res.headers.get("content-type") ?? "", finalUrl: res.url };
  } catch (e) {
    // fetch only says "fetch failed"; the cause has the reason, such as a timeout or a
    // certificate Node cannot verify (browsers are more forgiving, so open the link to compare).
    const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause;
    const reason = cause?.code ?? cause?.message ?? (e as Error).message;
    return { ok: false, status: 0, contentType: "", finalUrl: url, error: reason };
  }
}
