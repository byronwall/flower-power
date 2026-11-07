// Dev tools only. Parses the NRCS Indiana plant checklist (data/nrcs/indiana-checklist.csv).
// Each accepted name has one row with an empty "Synonym Symbol"; its synonyms follow with the same Symbol.

export type Rank = "genus" | "species" | "subspecies" | "variety";

export type Taxon = {
  symbol: string;
  name: string; // the scientific name with its author
  base: string; // genus and species only, lower case, for matching
  common: string;
  family: string;
  rank: Rank;
  synonyms: string[];
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (field += '"'), i++;
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field), rows.push(row), (row = []), (field = "");
    } else field += c;
  }
  if (field || row.length) row.push(field), rows.push(row);
  return rows.filter((r) => r.length > 1);
}

function rankOf(name: string): Rank {
  const words = name.split(" ");
  if (words.length < 2 || !/^[a-z×]/.test(words[1])) return "genus";
  if (name.includes(" var. ")) return "variety";
  if (name.includes(" ssp. ")) return "subspecies";
  return "species";
}

// "Acer rubrum L. var. trilobum ..." -> "acer rubrum"; "Acer L." -> "acer".
export function baseName(name: string): string {
  const words = name.replace(/\s*'.*$/, "").replace(" × ", " ×").split(" ");
  return (words.length > 1 && /^[a-z×]/.test(words[1]) ? words.slice(0, 2) : words.slice(0, 1)).join(" ").toLowerCase();
}

export function parseChecklist(text: string): Taxon[] {
  const [header, ...rows] = parseCsv(text.replace(/^﻿/, ""));
  const col = (n: string) => header.indexOf(n);
  const [sym, syn, sci, common, family] = ["Symbol", "Synonym Symbol", "Scientific Name with Author", "State Common Name", "Family"].map(col);
  const bySymbol = new Map<string, Taxon>();
  for (const r of rows) {
    if (r[syn]) continue;
    bySymbol.set(r[sym], { symbol: r[sym], name: r[sci], base: baseName(r[sci]), common: r[common], family: r[family], rank: rankOf(r[sci]), synonyms: [] });
  }
  for (const r of rows) if (r[syn]) bySymbol.get(r[sym])?.synonyms.push(r[sci]);
  return [...bySymbol.values()];
}
