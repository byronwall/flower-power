import json from "../../data/properties/sample-lot.json";
import { propertySchema } from "../model/property";

// The sample lot, for the landing demo and "Start from sample".
export const sample = propertySchema.parse(json);
