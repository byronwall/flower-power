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

export const plantSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  commonName: z.string().min(1),
  botanicalName: z.string().min(1),
  category: z.enum(["tree", "shrub", "perennial", "grass", "groundcover", "annual"]),
  nativeToIndiana: z.boolean(),
  lifecycle: z.enum(["annual", "perennial", "tender-perennial", "woody"]),
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
});

export type Plant = z.infer<typeof plantSchema>;
export type Season = keyof Plant["foliage"];
