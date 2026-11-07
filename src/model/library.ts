import { plantSchema, type Plant } from "./plant";
import { propertySchema, type Property } from "./property";

const plantFiles = import.meta.glob<Plant>("../../data/plants/*.json", { eager: true, import: "default" });
const propertyFiles = import.meta.glob<Property>("../../data/properties/*.json", { eager: true, import: "default" });

export const plants: Plant[] = Object.values(plantFiles)
  .map((p) => plantSchema.parse(p))
  .sort((a, b) => a.commonName.localeCompare(b.commonName));

export const plantsById = new Map(plants.map((p) => [p.id, p]));

export const properties: Property[] = Object.values(propertyFiles).map((p) => propertySchema.parse(p));
