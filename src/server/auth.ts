import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";

// Accounts live in data/users.json. Each user's files live in data/users/<id>/.
// The session cookie holds the user id and an HMAC of it, so the server keeps no session state.

export type User = { id: string; email: string; hash: string; created: string };

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
export async function createUser(email: string, pw: string): Promise<User> {
  const users = await readUsers();
  const user = { id: randomUUID(), email, hash: await hashPassword(pw), created: new Date().toISOString() };
  await writeUsers([...users, user]);
  const dir = join(dataDir(), "users", user.id);
  for (const sub of ["properties", "images", "ai-runs"]) await mkdir(join(dir, sub), { recursive: true });
  await copyFile(join(process.cwd(), "data/properties/sample-lot.json"), join(dir, "properties/sample-lot.json"));
  return user;
}

function sign(id: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set. Add it to .env.");
  return createHmac("sha256", secret).update(id).digest("base64url");
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

export const unauthorized = () => Response.json({ error: "Log in first." }, { status: 401 });
