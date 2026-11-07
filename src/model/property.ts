import { z } from "zod";

// All positions are in feet from the lot's top-left corner. y grows downward.
// The ground is flat; heights only feed shade and the 3D view.
const point = z.tuple([z.number(), z.number()]);
const outline = z.array(point).min(3);
const path = z.array(point).min(2);
const id = z.string().min(1);

export const fenceKinds = ["solid", "semi-open", "open"] as const;
export const surfaceKinds = ["lawn", "patio", "path", "stepping-stones", "gravel", "mulch", "driveway", "pond"] as const;
export const structureKinds = ["deck", "pergola", "shed", "raised-bed"] as const;
export const edgeKinds = ["edging", "border", "seat-wall"] as const;
export const featureKinds = ["birdbath", "feeder", "bench", "fire-pit", "water-feature"] as const;

const single = z.object({
  id,
  type: z.literal("single"),
  plantId: z.string(),
  at: point,
  // Already in the yard at full size, so the age slider does not shrink it.
  existing: z.boolean().optional(),
  // Size relative to the plant's usual mature size, set by resizing it on the plan.
  scale: z.number().min(0.2).max(4).optional(),
  // The AI picked this plant from a photo. A person has not confirmed it.
  guess: z.boolean().optional(),
});
const region = z.object({
  id,
  type: z.literal("region"),
  plantId: z.string(),
  outline,
  seed: z.number().int(),
  spacingFt: z.number().positive().optional(),
  existing: z.boolean().optional(),
  guess: z.boolean().optional(),
});
const row = z.object({
  id,
  type: z.literal("row"),
  plantId: z.string(),
  path,
  spacingFt: z.number().positive().optional(),
  existing: z.boolean().optional(),
  guess: z.boolean().optional(),
});

export const plantingSchema = z.discriminatedUnion("type", [single, region, row]);

export const propertySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  units: z.literal("ft"),
  // Compass direction of the top of the plan. 0 means north is up.
  headingDeg: z.number().min(0).max(360),
  lot: z.object({ outline }),
  house: z.object({ outline, heightFt: z.number().positive() }),
  fences: z.array(z.object({ id, kind: z.enum(fenceKinds), heightFt: z.number().positive(), path })),
  surfaces: z.array(z.object({ id, kind: z.enum(surfaceKinds), outline })),
  structures: z.array(z.object({ id, kind: z.enum(structureKinds), outline, heightFt: z.number().positive() })),
  edges: z.array(z.object({ id, kind: z.enum(edgeKinds), path })),
  features: z.array(z.object({ id, kind: z.enum(featureKinds), at: point })),
  plantings: z.array(plantingSchema),
  // An aerial photo drawn under the plan, for tracing. Its top-left pixel sits at originFt.
  underlay: z.object({ file: z.string(), sizePx: z.tuple([z.number(), z.number()]), ftPerPx: z.number().positive(), originFt: point }).optional(),
});

export type Point = z.infer<typeof point>;
export type Property = z.infer<typeof propertySchema>;
export type Planting = z.infer<typeof plantingSchema>;
export type Fence = Property["fences"][number];
export type FenceKind = (typeof fenceKinds)[number];

// Share of sunlight a fence blocks, for the sun model.
export const fenceShade: Record<FenceKind, number> = { solid: 1, "semi-open": 0.5, open: 0.1 };
