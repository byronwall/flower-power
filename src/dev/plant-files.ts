import { auditPlant, plantSchema } from "../model/plant";

// Dev tools only. Reads the plant files raw, so a file that fails the schema still shows up
// with its errors instead of stopping the app the way the main library does.
const raw = import.meta.glob<unknown>("../../data/plants/*.json", { eager: true, import: "default" });

export type PlantFile = {
  file: string;
  data: Record<string, any>;
  errors: string[];
  missing: string[];
};

export function plantFiles(): PlantFile[] {
  return Object.entries(raw)
    .map(([path, json]) => {
      const data = (json ?? {}) as Record<string, any>;
      const result = plantSchema.safeParse(data);
      const errors = result.error?.issues.map((i) => `${i.path.join(".") || "file"}: ${i.message}`) ?? [];
      return { file: path.split("/").pop()!, data, errors, missing: result.success ? auditPlant(result.data) : [] };
    })
    .sort((a, b) => String(a.data.commonName ?? a.file).localeCompare(String(b.data.commonName ?? b.file)));
}

// Every URL in the plant files: sources and photos.
export function plantUrls(): Set<string> {
  const urls = new Set<string>();
  for (const { data } of plantFiles()) {
    for (const s of data.sources ?? []) if (s?.url) urls.add(s.url);
    for (const p of data.images?.photos ?? []) {
      if (p?.url) urls.add(p.url);
      if (p?.sourceUrl) urls.add(p.sourceUrl);
    }
  }
  return urls;
}
