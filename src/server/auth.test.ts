import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import * as login from "../routes/api/auth/login";
import * as me from "../routes/api/auth/me";
import * as register from "../routes/api/auth/register";
import * as one from "../routes/api/properties/[id]";
import * as list from "../routes/api/properties/index";
import * as share from "../routes/api/share/[token]";
import * as shares from "../routes/api/shares/[id]";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "fp-auth-"));
  process.env.SESSION_SECRET = "test-secret";
});

// Calls a route handler the way SolidStart does, and keeps only the cookie's name=value part.
const call = (fn: (e: any) => Response | Promise<Response>, body?: unknown, cookie = "", params = {}) =>
  fn({ params, request: new Request("http://x/", { method: body ? "POST" : "GET", headers: { cookie }, body: body ? JSON.stringify(body) : undefined }) });
const cookieOf = (res: Response) => res.headers.get("set-cookie")!.split(";")[0];
const ids = async (res: Response) => ((await res.json()) as { id: string }[]).map((p) => p.id);

let ann = "";

it("keeps each user's properties private", async () => {
  ann = cookieOf(await call(register.POST, { email: "ann@example.com", password: "password-a" }));
  await call(register.POST, { email: "bob@example.com", password: "password-b" });
  const bob = cookieOf(await call(login.POST, { email: "bob@example.com", password: "password-b" }));
  expect((await call(login.POST, { email: "bob@example.com", password: "wrong-pass" })).status).toBe(401);

  // Ann saves a lot of her own; both start with the sample lot.
  const [sample] = await (await call(list.GET, undefined, ann)).json();
  const underlay = { file: "ann-yard-aerial.jpg", sizePx: [100, 100], ftPerPx: 1, originFt: [0, 0] };
  const saved = await call(one.POST, { ...sample, id: "ann-yard", name: "Ann's yard", underlay }, ann, { id: "ann-yard" });
  expect(saved.status).toBe(200);

  expect(await ids(await call(list.GET, undefined, ann))).toEqual(["ann-yard", "sample-lot"]);
  expect(await ids(await call(list.GET, undefined, bob))).toEqual(["sample-lot"]);
  expect((await call(list.GET)).status).toBe(401);
  expect((await call(list.GET, undefined, "fp_session=" + ann.split("=")[1].replace(/\..*/, ".forged"))).status).toBe(401);
});

it("gives read-only access through a share link until it is turned off", async () => {
  const on = { id: "ann-yard" };
  expect((await call(shares.POST, {}, "", on)).status).toBe(401);
  const { token } = await (await call(shares.POST, {}, ann, on)).json();
  // The same token comes back when the link is already on.
  expect((await (await call(shares.POST, {}, ann, on)).json()).token).toBe(token);

  const res = await call(share.GET, undefined, "", { token });
  expect(res.status).toBe(200);
  const shared = await res.json();
  expect(shared.name).toBe("Ann's yard");
  expect(shared.underlay).toBeUndefined();
  // The public route only reads.
  expect(Object.keys(share)).toEqual(["GET"]);

  await call(shares.DELETE, {}, ann, on);
  expect((await call(share.GET, undefined, "", { token })).status).toBe(404);
});

it("keeps an avatar and name on the account, and lets the person change them", async () => {
  const res = await call(register.POST, { email: "cam@example.com", password: "password-c", avatar: "bee", name: "  Cam  " });
  expect(await res.json()).toMatchObject({ email: "cam@example.com", avatar: "bee", name: "Cam" });
  const cam = cookieOf(res);
  const patch = (body: unknown) => me.PATCH({ request: new Request("http://x/", { method: "PATCH", headers: { cookie: cam }, body: JSON.stringify(body) }) } as never);

  expect(await (await patch({ avatar: "cardinal" })).json()).toMatchObject({ avatar: "cardinal", name: "Cam" });
  expect((await patch({ avatar: "dragon" })).status).toBe(400);
  expect(await (await patch({ name: "" })).json()).toMatchObject({ avatar: "cardinal", name: null });
  expect(await (await call(me.GET, undefined, cam)).json()).toMatchObject({ avatar: "cardinal", name: null });

  // A made-up avatar never blocks signing up.
  expect(await (await call(register.POST, { email: "dee@example.com", password: "password-d", avatar: "dragon" })).json()).toMatchObject({ avatar: null });
});

it("makes the demo account on first login and resets it on each login", async () => {
  const creds = { email: "demo@flower.test", password: "flowerdemo" };
  const first = await call(login.POST, creds);
  expect(first.status).toBe(200);
  const demo = cookieOf(first);
  const [sample] = await (await call(list.GET, undefined, demo)).json();
  await call(one.POST, { ...sample, id: "demo-yard", name: "Demo yard" }, demo, { id: "demo-yard" });
  expect(await ids(await call(list.GET, undefined, demo))).toEqual(["demo-yard", "sample-lot"]);

  const again = await call(login.POST, creds);
  expect((await again.json()).id).toBe((await first.clone().json()).id);
  expect(await ids(await call(list.GET, undefined, cookieOf(again)))).toEqual(["sample-lot"]);
});
