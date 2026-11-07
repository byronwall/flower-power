import { z } from "zod";

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "a color like #4f7a3a");
const month = z.number().int().min(1).max(12);

// Foliage color per season. null means nothing shows: dormant, bare, or not planted yet.
const seasonColors = z.object({
  spring: hex.nullable(),
  summer: hex.nullable(),
  fall: hex.nullable(),
  winter: hex.nullable(),
});

// A real photo of the plant. Only openly licensed photos, with credit.
const photo = z.object({
  url: z.url(),
  author: z.string().min(1),
  license: z.string().min(1),
  sourceUrl: z.url(),
});

const plantFields = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  commonName: z.string().min(1),
  botanicalName: z.string().min(1),
  category: z.enum(["tree", "shrub", "perennial", "grass", "groundcover", "annual"]),
  nativeToIndiana: z.boolean(),
  lifecycle: z.enum(["annual", "biennial", "perennial", "tender-perennial", "woody"]),
  evergreen: z.boolean(),
  // How a person usually places it. "either" lets them choose each time.
  placement: z.enum(["single", "region", "either"]),
  size: z.object({
    heightFt: z.number().positive(),
    spreadFt: z.number().positive(),
    plantedSpreadFt: z.number().positive(),
    yearsToMature: z.number().positive(),
    spacingFt: z.number().positive(),
  }),
  sun: z.array(z.enum(["full", "part", "shade"])).min(1),
  soil: z.array(z.string()).min(1),
  water: z.enum(["low", "medium", "high"]),
  bloom: z.object({ months: z.array(month).min(1), colors: z.array(hex).min(1) }).nullable(),
  fruit: z.object({ months: z.array(month).min(1), color: hex }).nullable(),
  foliage: seasonColors,
  zones: z.tuple([z.number(), z.number()]),
  care: z.array(z.object({ month, task: z.string().min(1) })),
  plantingMonths: z.array(month).min(1),
  liftAndStore: z.boolean(),
  thorns: z.boolean(),
  toxicToPets: z.boolean(),
  wildlife: z.array(z.enum(["pollinators", "birds", "hummingbirds", "butterflies"])),
  effort: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  render: z.object({
    form: z.enum(["canopy", "columnar", "mound", "upright", "grass", "rosette", "mat"]),
  }),
  sources: z.array(z.object({ label: z.string(), url: z.url() })).min(1),
  // False until a person checks each fact against the sources.
  verified: z.boolean(),

  // The fields below are optional while the library is being filled in.
  // A verified plant must have all of them (see auditPlant).

  // How long one plant lives, in years: [shortest, longest].
  lifespanYears: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  // Whether it needs a second plant to fruit or set seed, such as a male winterberry.
  pollination: z
    .object({
      needsPartner: z.boolean(),
      partner: z.string().min(1).optional(),
      note: z.string().min(1).optional(),
    })
    .optional(),
  // The month it comes up or leafs out. null means it shows all year (evergreen).
  emerges: month.nullable().optional(),
  // How it goes in the ground.
  planting: z
    .object({
      method: z.enum(["seed", "bulb", "plug", "container", "bare-root", "division"]),
      depthIn: z.number().nonnegative().optional(),
      note: z.string().min(1).optional(),
    })
    .optional(),
  images: z.object({ photos: z.array(photo) }).optional(),
});

// The plant object checklist from the data plan. Returns what a plant is missing.
// Size, color, lifecycle, sun, water and planting months are required by the schema itself.
export function auditPlant(p: z.infer<typeof plantFields>): string[] {
  const missing: string[] = [];
  if (!p.lifespanYears) missing.push("lifespanYears");
  if (!p.pollination) missing.push("pollination");
  if (p.emerges === undefined) missing.push("emerges");
  if (!p.planting) missing.push("planting");
  if (!p.images?.photos.length) missing.push("images.photos");
  return missing;
}

export const plantSchema = plantFields.superRefine((p, ctx) => {
  if (p.lifespanYears && p.lifespanYears[0] > p.lifespanYears[1]) {
    ctx.addIssue({ code: "custom", path: ["lifespanYears"], message: "shortest must not be more than longest" });
  }
  if (!p.verified) return;
  for (const field of auditPlant(p)) {
    ctx.addIssue({ code: "custom", path: field.split("."), message: "required before a plant is verified" });
  }
});

export type Plant = z.infer<typeof plantSchema>;
export type Season = keyof Plant["foliage"];
