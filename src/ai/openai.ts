import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Calls the OpenAI Responses API with a strict JSON schema, and saves each run under data/ai-runs.
// Server and scripts only: it reads the key from the environment or from .env.

export type Part =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string; detail: "low" | "high" | "auto" };

export type Usage = { input_tokens: number; output_tokens: number; total_tokens: number };

function key() {
  if (!process.env.OPENAI_API_KEY) {
    try {
      process.loadEnvFile(join(process.cwd(), ".env"));
    } catch {}
  }
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY is not set. Add it to .env in the project root.");
  return k;
}

export const model = () => process.env.OPENAI_MODEL || "gpt-5.5";

export async function respond<T>(req: { feature: string; instructions: string; parts: Part[]; schema: object; files?: Record<string, Buffer> }) {
  const body = {
    model: model(),
    instructions: req.instructions,
    input: [{ role: "user", content: req.parts }],
    reasoning: { effort: process.env.OPENAI_EFFORT || "medium" },
    text: { format: { type: "json_schema", name: req.feature, strict: true, schema: req.schema } },
  };
  const started = Date.now();
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${key()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const ms = Date.now() - started;
  const dir = await saveRun(req.feature, body, json, req.files);
  if (!res.ok) throw new Error(`OpenAI returned ${res.status}: ${json.error?.message ?? JSON.stringify(json)}`);
  const msg = json.output?.find((o: any) => o.type === "message");
  const part = msg?.content?.find((c: any) => c.type === "output_text" || c.type === "refusal");
  if (!part || part.type === "refusal") throw new Error(`The model gave no answer: ${part?.refusal ?? json.status}`);
  return { data: JSON.parse(part.text) as T, usage: json.usage as Usage, model: json.model as string, ms, dir };
}

// Each run keeps the request (images left out), the response, and the input files, for debugging and evals.
async function saveRun(feature: string, body: any, response: unknown, files: Record<string, Buffer> = {}) {
  const dir = join(process.cwd(), "data/ai-runs", `${new Date().toISOString().replace(/[:.]/g, "-")}-${feature}`);
  await mkdir(dir, { recursive: true });
  const stripped = JSON.parse(JSON.stringify(body), (k, v) => (k === "image_url" ? `${String(v).slice(0, 40)}…` : v));
  await writeFile(join(dir, "request.json"), JSON.stringify(stripped, null, 2));
  await writeFile(join(dir, "response.json"), JSON.stringify(response, null, 2));
  for (const [name, buf] of Object.entries(files)) await writeFile(join(dir, name), buf);
  return dir;
}
