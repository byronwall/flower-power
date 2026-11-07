import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, expect, it } from "vitest";
import * as login from "../routes/api/auth/login";
import * as register from "../routes/api/auth/register";
import * as one from "../routes/api/properties/[id]";
import * as list from "../routes/api/properties/index";

beforeAll(() => {
  process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "fp-auth-"));
  process.env.SESSION_SECRET = "test-secret";
});

// Calls a route handler the way SolidStart does, and keeps only the cookie's name=value part.
const call = (fn: (e: any) => Response | Promise<Response>, body?: unknown, cookie = "", params = {}) =>
  fn({ params, request: new Request("http://x/", { method: body ? "POST" : "GET", headers: { cookie }, body: body ? JSON.stringify(body) : undefined }) });
const cookieOf = (res: Response) => res.headers.get("set-cookie")!.split(";")[0];
const ids = async (res: Response) => ((await res.json()) as { id: string }[]).map((p) => p.id);

it("keeps each user's properties private", async () => {
  const ann = cookieOf(await call(register.POST, { email: "ann@example.com", password: "password-a" }));
  await call(register.POST, { email: "bob@example.com", password: "password-b" });
  const bob = cookieOf(await call(login.POST, { email: "bob@example.com", password: "password-b" }));
  expect((await call(login.POST, { email: "bob@example.com", password: "wrong-pass" })).status).toBe(401);

  // Ann saves a lot of her own; both start with the sample lot.
  const [sample] = await (await call(list.GET, undefined, ann)).json();
  const saved = await call(one.POST, { ...sample, id: "ann-yard", name: "Ann's yard" }, ann, { id: "ann-yard" });
  expect(saved.status).toBe(200);

  expect(await ids(await call(list.GET, undefined, ann))).toEqual(["ann-yard", "sample-lot"]);
  expect(await ids(await call(list.GET, undefined, bob))).toEqual(["sample-lot"]);
  expect((await call(list.GET)).status).toBe(401);
  expect((await call(list.GET, undefined, "fp_session=" + ann.split("=")[1].replace(/\..*/, ".forged"))).status).toBe(401);
});
