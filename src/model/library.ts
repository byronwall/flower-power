import { plantSchema, type Plant } from "./plant";
import type { Property } from "./property";

const plantFiles = import.meta.glob<Plant>("../../data/plants/*.json", { eager: true, import: "default" });

export const plants: Plant[] = Object.values(plantFiles)
  .map((p) => plantSchema.parse(p))
  .sort((a, b) => a.commonName.localeCompare(b.commonName));

export const plantsById = new Map(plants.map((p) => [p.id, p]));

// Property files are owned by the server, which reads and writes them in data/properties.
export async function loadProperties(): Promise<Property[]> {
  const res = await fetch("/api/properties");
  if (!res.ok) throw new Error(`Loading the properties failed with status ${res.status}.`);
  return res.json();
}

export async function saveProperty(p: Property) {
  const res = await fetch(`/api/properties/${p.id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error(`Saving failed: ${JSON.stringify((await res.json()).error)}`);
}
