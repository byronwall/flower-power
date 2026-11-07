// Copies the photo sets to upload into demo/files/<name>/ as aerial.jpg and photo-1.jpg, photo-2.jpg, ...
// The source photos are in tmp/listings, which git ignores. So are these copies: they are real listings.
// Run with `pnpm demo:setup`, or `pnpm demo:setup <listings folder>`.
// The demo account needs no setup: each login makes it or resets it.
import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const files = join(root, "demo/files");
const listings = process.argv[2] ?? join(root, "tmp/listings");

rmSync(files, { recursive: true, force: true });
for (const name of ["delmar", "broadway"]) {
  const src = join(listings, name);
  if (!existsSync(src)) {
    console.warn(`Skipped ${name}: ${src} is missing.`);
    continue;
  }
  cpSync(join(src, "aerial.jpg"), join(files, name, "aerial.jpg"));
  readdirSync(join(src, "photos"))
    .sort()
    .forEach((f, i) => cpSync(join(src, "photos", f), join(files, name, `photo-${i + 1}.jpg`)));
}

console.log(`Photos are in ${files}.`);
