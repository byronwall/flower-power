import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { AVATARS } from "../account/avatars";

// Accounts live in data/users.json. Each user's files live in data/users/<id>/.
// The session cookie holds the user id and an HMAC of it, so the server keeps no session state.

export type User = { id: string; email: string; hash: string; created: string; avatar?: string; name?: string };

// What the client sees of an account.
export const publicUser = (u: User) => ({ id: u.id, email: u.email, avatar: u.avatar ?? null, name: u.name ?? null });

const scryptAsync = promisify(scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
const cookieName = "fp_session";
const maxAge = 60 * 60 * 24 * 30;

export const dataDir = () => process.env.DATA_DIR ?? join(process.cwd(), "data");
const usersFile = () => join(dataDir(), "users.json");

export async function readUsers(): Promise<User[]> {
  try {
    return JSON.parse(await readFile(usersFile(), "utf8"));
  } catch {
    return [];
  }
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scryptAsync(pw, salt, 64)).toString("hex")}`;
}

export async function checkPassword(pw: string, stored: string) {
  const [salt, hex] = stored.split(":");
  const want = Buffer.from(hex, "hex");
  const got = await scryptAsync(pw, salt, want.length);
  return timingSafeEqual(got, want);
}

export const writeUsers = (users: User[]) => writeFile(usersFile(), JSON.stringify(users, null, 2) + "\n");

// Adds the user and gives them a copy of the sample lot to start from.
export async function createUser(email: string, pw: string, profile: Profile = {}): Promise<User> {
  const users = await readUsers();
  const user: User = { id: randomUUID(), email, hash: await hashPassword(pw), created: new Date().toISOString(), ...profile };
  await writeUsers([...users, user]);
  await freshFolder(user.id);
  return user;
}

// Empties data/users/<id> and puts the sample lot back.
async function freshFolder(id: string) {
  const dir = join(dataDir(), "users", id);
  await rm(dir, { recursive: true, force: true });
  for (const sub of ["properties", "images", "ai-runs"]) await mkdir(join(dir, sub), { recursive: true });
  await copyFile(join(process.cwd(), "data/properties/sample-lot.json"), join(dir, "properties/sample-lot.json"));
}

// The shared demo account. The password is public on purpose: see demo/README.md.
export const DEMO = { email: "demo@flower.test", password: "flowerdemo" };

// Each demo login starts clean: the account is made if it is missing, and its files go back to the sample lot.
export async function resetDemo(): Promise<User> {
  const users = await readUsers();
  const old = users.find((u) => u.email === DEMO.email);
  if (!old) return createUser(DEMO.email, DEMO.password, { name: "Demo Gardener", avatar: "sunflower" });
  const user = { ...old, hash: await hashPassword(DEMO.password) };
  await writeUsers(users.map((u) => (u === old ? user : u)));
  await freshFolder(user.id);
  return user;
}

// SESSION_SECRET when set. Otherwise the server makes one on first use and keeps it in the data folder,
// so sessions survive restarts with nothing to configure.
let secret: string | undefined;
function sessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (secret) return secret;
  const file = join(dataDir(), "session-secret");
  try {
    secret = readFileSync(file, "utf8").trim();
  } catch {
    mkdirSync(dataDir(), { recursive: true });
    secret = randomBytes(32).toString("hex");
    writeFileSync(file, secret, { mode: 0o600 });
  }
  return secret;
}

function sign(id: string) {
  return createHmac("sha256", sessionSecret()).update(id).digest("base64url");
}

export function sessionCookie(id: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieName}=${id}.${sign(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export const clearCookie = () => `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

// Returns the logged-in user's id, or null when the cookie is missing or forged.
export function userId(request: Request): string | null {
  const raw = request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`))?.[1];
  if (!raw) return null;
  const [id, sig] = raw.split(".");
  if (!id || !sig || !/^[\w-]+$/.test(id)) return null;
  const want = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  return got.length === want.length && timingSafeEqual(got, want) ? id : null;
}

// The logged-in user's folder, data/users/<id>, or null when nobody is logged in.
// Routes join "properties", "images" or "ai-runs" onto it.
export function userDir(request: Request): string | null {
  const id = userId(request);
  return id ? join(dataDir(), "users", id) : null;
}

export const credsSchema = z.object({ email: z.email().transform((e) => e.trim().toLowerCase()), password: z.string().min(8) });

// The parts of an account a person can change themselves: their avatar and what to call them.
export const profileSchema = z.object({
  avatar: z.enum(AVATARS).optional(),
  name: z
    .string()
    .trim()
    .max(40)
    .transform((n) => n || undefined)
    .optional(),
});
export type Profile = z.infer<typeof profileSchema>;

export const unauthorized = () => Response.json({ error: "Log in first." }, { status: 401 });
