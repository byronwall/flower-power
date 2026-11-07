import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { propertySchema, type Property } from "../model/property";
import { dataDir } from "./auth";

// Share links live in data/shares.json as token -> { userId, propertyId }.
// Anyone with a token can read that one property. Turning the link off deletes the token.
type Shares = Record<string, { userId: string; propertyId: string }>;

const sharesFile = () => join(dataDir(), "shares.json");

export async function readShares(): Promise<Shares> {
  try {
    return JSON.parse(await readFile(sharesFile(), "utf8"));
  } catch {
    return {};
  }
}

const writeShares = (s: Shares) => writeFile(sharesFile(), JSON.stringify(s, null, 2) + "\n");

// Returns the existing token for the property, or makes a new one.
export async function shareOn(userId: string, propertyId: string) {
  const shares = await readShares();
  const found = Object.entries(shares).find(([, s]) => s.userId === userId && s.propertyId === propertyId);
  if (found) return found[0];
  const token = randomBytes(18).toString("base64url");
  await writeShares({ ...shares, [token]: { userId, propertyId } });
  return token;
}

// Removes the user's links: for one property, or all of them when propertyId is left out.
export async function shareOff(userId: string, propertyId?: string) {
  const shares = await readShares();
  const keep = Object.entries(shares).filter(([, s]) => s.userId !== userId || (propertyId !== undefined && s.propertyId !== propertyId));
  await writeShares(Object.fromEntries(keep));
}

// The shared property without its aerial, so a share never shows where the owner lives.
export async function sharedProperty(token: string): Promise<Property | null> {
  const s = (await readShares())[token];
  if (!s) return null;
  try {
    const file = join(dataDir(), "users", s.userId, "properties", `${s.propertyId}.json`);
    const { underlay, ...rest } = propertySchema.parse(JSON.parse(await readFile(file, "utf8")));
    return rest;
  } catch {
    return null;
  }
}
