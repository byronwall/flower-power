// Turns indiana_plants.json into plant files in data/plants.
//
//   node scripts/import-indiana.mjs
//
// New plants get a file named after their common name. Plants the app already has
// (same botanical name) keep their hand-made file; only the Indiana fields are added.
// The Indiana list has no soil, care, or planting dates, so those are derived from its
// moisture, habit, and size, and every new file is marked "verified": false until a person
// checks it against the sources.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const dir = join(root, "data/plants");
const src = JSON.parse(readFileSync(join(root, "indiana_plants.json"), "utf8"));
const REPO_FILE = "https://github.com/byronwall/flower-power/blob/main/indiana_plants.json";

const SOURCE = {
  curated: { label: "Flower Power Indiana plant list (hand-curated)", url: REPO_FILE },
  inat_popular: { label: "iNaturalist: most observed plants in Indiana", url: "https://www.inaturalist.org/places/indiana" },
  inps_garden_worthy: { label: "Indiana Native Plant Society: Landscaping with Plants Native to Indiana", url: "https://indiananativeplants.org/" },
  inps_finder: { label: "Indiana Native Plant Society Native Plant Finder", url: "https://finder.indiananativeplants.org/" },
  purdue_pol6: { label: "Purdue Extension POL-6-W: Indiana-native plants for pollinators", url: "https://extension.purdue.edu/" },
  purdue_id464: { label: "Purdue Extension", url: "https://extension.purdue.edu/" },
  dnr_tpr: { label: "Indiana DNR Terrestrial Plant Rule (312 IAC 18-3-25)", url: "https://www.in.gov/dnr/entomology/" },
  iisc_list: { label: "Indiana Invasive Species Council list", url: "https://www.entm.purdue.edu/iisc/" },
  lbj_indiana: { label: "Lady Bird Johnson Wildflower Center: Indiana", url: "https://www.wildflower.org/collections/collection.php?collection=IN" },
};

const slug = (s) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ft = (m) => Math.round(m * 3.281 * 2) / 2 || 0.5;

// Colors: a lighter spring leaf, the summer leaf, and a fall turn that depends on the plant.
const mix = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
};

// Existing files, by botanical name (first two words, so cultivars match their species).
const existing = new Map();
for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const key = j.botanicalName.replace(/'.*$/, "").trim().toLowerCase().split(/\s+/).slice(0, 2).join(" ");
  existing.set(key, { file: f, json: j });
}
const keyOf = (sci) => sci.toLowerCase().split(/\s+/).slice(0, 2).join(" ");

// Final id for each Indiana id, so "plant instead" links point at real files.
const idOf = new Map();
const usedIds = new Set([...existing.values()].map((e) => e.json.id));
for (const p of src.plants) {
  const hit = existing.get(keyOf(p.sci));
  if (hit) {
    idOf.set(p.id, hit.json.id);
    continue;
  }
  let id = slug(p.common);
  if (usedIds.has(id)) id = slug(p.sci);
  usedIds.add(id);
  idOf.set(p.id, id);
}

const CATEGORY = { tree_broadleaf: "tree", tree_conifer: "tree", shrub: "shrub", forb: "perennial", grass: "grass", vine: "vine", fern: "perennial" };
const ANNUAL = new Set(["solanum-lycopersicum", "capsicum-annuum", "ocimum-basilicum", "cucurbita-pepo", "helianthus-annuus"]);

function build(p) {
  const tags = p.tags ?? [];
  const annual = ANNUAL.has(p.id);
  const woody = ["tree_broadleaf", "tree_conifer", "shrub"].includes(p.habit);
  const ground = tags.includes("groundcover") || p.id === "poa-pratensis" || p.id === "carex-pensylvanica";
  const category = annual ? "annual" : ground ? "groundcover" : CATEGORY[p.habit];
  const evergreen = p.habit === "tree_conifer" || tags.includes("evergreen");
  const heightFt = ft(p.height_m), spreadFt = ft(p.spread_m);
  const leaf = p.foliage ?? "#5a8a40";
  const fallTurn = tags.includes("fall color") ? "#c4532c" : woody ? "#b89a3e" : p.habit === "grass" ? "#b8803f" : "#8a7d48";
  const form =
    p.habit === "tree_broadleaf" ? "canopy"
    : p.habit === "tree_conifer" ? "columnar"
    : p.habit === "shrub" ? "mound"
    : p.habit === "grass" ? (ground ? "mat" : "grass")
    : p.habit === "fern" ? "rosette"
    : ground ? "mat"
    : "upright";
  const moisture = p.moisture?.length ? p.moisture : ["medium"];
  const water = moisture.includes("wet") && !moisture.includes("dry") ? "high" : moisture.includes("dry") && !moisture.includes("wet") ? "low" : "medium";
  const soil = moisture.map((m) => (m === "dry" ? "dry" : m === "wet" ? "moist" : "average"));
  const wildlife = [
    ...(tags.includes("pollinator") ? ["pollinators"] : []),
    ...(tags.includes("hummingbird") ? ["hummingbirds"] : []),
    ...(tags.some((t) => t.includes("host")) ? ["butterflies"] : []),
    ...(tags.some((t) => t.includes("berr")) ? ["birds"] : []),
  ];
  const invasive = p.status.startsWith("invasive");
  return {
    id: idOf.get(p.id),
    commonName: p.common,
    botanicalName: p.sci,
    category,
    nativeToIndiana: p.status === "native",
    lifecycle: annual ? "annual" : woody ? "woody" : "perennial",
    evergreen,
    placement: p.habit.startsWith("tree") || p.habit === "vine" ? "single" : ground ? "region" : "either",
    size: {
      heightFt,
      spreadFt,
      plantedSpreadFt: Math.min(spreadFt, p.habit.startsWith("tree") ? 3 : woody ? 1.5 : 1),
      yearsToMature: p.habit.startsWith("tree") ? 20 : woody ? 5 : annual ? 1 : 3,
      spacingFt: Math.max(0.5, Math.round(spreadFt * (woody ? 1 : 0.8) * 2) / 2),
    },
    sun: p.sun,
    soil: [...new Set(soil)],
    water,
    bloom: p.bloom?.length && p.flower ? { months: p.bloom, colors: [p.flower] } : null,
    fruit: null,
    foliage: {
      spring: annual && !p.bloom?.includes(5) ? null : mix(leaf, "#c8dc8a", 0.25),
      summer: leaf,
      fall: evergreen ? leaf : mix(leaf, fallTurn, 0.7),
      winter: evergreen ? mix(leaf, "#4a5a40", 0.3) : p.habit === "grass" && !annual ? "#b9a07a" : null,
    },
    zones: [5, 6],
    care: [],
    plantingMonths: annual ? [5, 6] : woody ? [4, 5, 9, 10] : [4, 5, 9],
    liftAndStore: false,
    thorns: ["rosa-multiflora", "berberis-thunbergii", "rosa-carolina"].includes(p.id),
    toxicToPets: false,
    wildlife,
    effort: annual ? 2 : 1,
    render: { form },
    sources: (p.sources ?? ["curated"]).map((k) => SOURCE[k] ?? SOURCE.curated),
    verified: false,
    indianaStatus: p.status,
    moisture,
    tags,
    edible: p.edible || undefined,
    alternatives: invasive && p.alternatives ? p.alternatives.map((a) => idOf.get(a)).filter(Boolean) : undefined,
  };
}

let added = 0, enriched = 0;
for (const p of src.plants) {
  const hit = existing.get(keyOf(p.sci));
  if (hit) {
    // Keep the hand-made file; add only what the Indiana list knows that it does not.
    const j = hit.json;
    j.indianaStatus ??= p.status;
    j.moisture ??= p.moisture;
    j.tags ??= p.tags;
    if (p.edible) j.edible ??= true;
    if (p.status.startsWith("invasive") && p.alternatives) {
      j.alternatives ??= p.alternatives.map((a) => idOf.get(a)).filter(Boolean);
    }
    writeFileSync(join(dir, hit.file), JSON.stringify(j, null, 2) + "\n");
    enriched++;
    continue;
  }
  const plant = build(p);
  const file = join(dir, `${plant.id}.json`);
  if (existsSync(file)) throw new Error(`${file} already exists`);
  writeFileSync(file, JSON.stringify(plant, null, 2) + "\n");
  added++;
}
console.log(`Added ${added} plants, added Indiana details to ${enriched} existing ones.`);
