#!/usr/bin/env node

// Applies initiative-map.json edits, stamps last_updated, and runs the
// validator, so map updates need no hand-written JSON scripts.

const USAGE = `Usage: node update-map.mjs <initiative-dir> [options]

Lifecycle shortcuts:
  --phase <phase>               initiative.current_phase
  --status <status>             initiative.status (planned|active|paused|completed|cancelled)
  --next "<text>"               initiative.next_action
  --artifact <key>=<status>     artifacts.<key>.status and updated_at; key may be
                                intent_brief or intent-brief.md style
  --milestone <id>=<status>     implementation.milestones[id].status
  --evidence <id>="<text>"      append to that milestone's evidence

Any field:
  --add <path>=<json>           append a value to the list at <path>, creating it.
                                An item whose "id" already exists is merged into
                                the existing item instead of added twice.
  --set <path>=<json>           replace the value at <path>, creating parents.
                                A value that is not valid JSON is stored as text.

<path> is dotted. A segment that names an item's id selects that item in a list:
  --add intent.claims='{"id":"C6","statement":"...","kind":"decision","sources":["S3"],"confidence":"high"}'
  --set intent.claims.C2.confidence=high
  --add sources='{"id":"qa-round-2","type":"question-round","location":"conversation","anchor":"2"}'
  --add question_rounds.rounds='{"round":2,"theme":"behavior and limits","source":"qa-round-2","questions":[]}'
  --add history='{"date":"2026-10-13","change":"Recorded round 2."}'
  --set shape.first_proof='{"question":"...","artifact":"...","decision_rule":"..."}'

Repeat any option. Options apply in the order above (shortcuts, then --set,
then --add). Prints the validator result and exits with its code; with
--no-validate, exits 0 after writing.
  -h, --help                    show this help`;

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

let parsed;
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean', short: 'h' },
      phase: { type: 'string' },
      status: { type: 'string' },
      next: { type: 'string' },
      artifact: { type: 'string', multiple: true, default: [] },
      milestone: { type: 'string', multiple: true, default: [] },
      evidence: { type: 'string', multiple: true, default: [] },
      add: { type: 'string', multiple: true, default: [] },
      set: { type: 'string', multiple: true, default: [] },
      'no-validate': { type: 'boolean' },
    },
  });
} catch (error) {
  console.error(`${error.message}\n\n${USAGE}`);
  process.exit(1);
}
const { values, positionals } = parsed;
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const dir = path.resolve(positionals[0] || '.');
const mapPath = path.join(dir, 'initiative-map.json');
if (!fs.existsSync(mapPath)) {
  console.error(`No initiative-map.json in ${dir}`);
  process.exit(1);
}
const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const pair = (option, value) => {
  const index = value.indexOf('=');
  if (index < 1) fail(`--${option} takes <key>=<value>, got "${value}"`);
  return [value.slice(0, index), value.slice(index + 1)];
};

const parseValue = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const childOf = (parent, segment, create, where) => {
  if (Array.isArray(parent)) {
    const byId = parent.find((item) => item && typeof item === 'object' && item.id === segment);
    if (byId) return byId;
    if (/^\d+$/.test(segment) && Number(segment) < parent.length) return parent[Number(segment)];
    const ids = parent.map((item) => item?.id).filter(Boolean).join(', ') || 'none';
    fail(`No item "${segment}" in ${where}. Ids: ${ids}`);
  }
  if (parent[segment] === undefined || parent[segment] === null) {
    if (!create) fail(`No "${segment}" in ${where}`);
    parent[segment] = {};
  }
  return parent[segment];
};

// Returns [container, lastSegment] for a dotted path, creating objects on the way.
const resolve = (dotted) => {
  const segments = dotted.split('.');
  let node = map;
  for (let index = 0; index < segments.length - 1; index += 1) {
    node = childOf(node, segments[index], true, segments.slice(0, index).join('.') || 'the map');
    if (typeof node !== 'object') fail(`${segments.slice(0, index + 1).join('.')} is not an object or list`);
  }
  return [node, segments.at(-1)];
};

const milestone = (id) => {
  const found = (map.implementation?.milestones || []).find((item) => item.id === id);
  if (!found) {
    const ids = (map.implementation?.milestones || []).map((item) => item.id).join(', ') || 'none';
    fail(`No milestone "${id}". Milestones: ${ids}`);
  }
  return found;
};

map.initiative ??= {};
if (values.phase) map.initiative.current_phase = values.phase;
if (values.status) map.initiative.status = values.status;
if (values.next) map.initiative.next_action = values.next;
for (const value of values.artifact) {
  const [raw, status] = pair('artifact', value);
  const key = raw.replace(/\.md$/, '').replace(/-/g, '_');
  if (!map.artifacts?.[key]) {
    fail(`No artifact "${key}". Artifacts: ${Object.keys(map.artifacts || {}).join(', ')}`);
  }
  map.artifacts[key].status = status;
  map.artifacts[key].updated_at = today;
}
for (const value of values.milestone) {
  const [id, status] = pair('milestone', value);
  milestone(id).status = status;
}
for (const value of values.evidence) {
  const [id, text] = pair('evidence', value);
  const target = milestone(id);
  target.evidence = [...(target.evidence || []), text];
}
for (const value of values.set) {
  const [dotted, text] = pair('set', value);
  const [container, last] = resolve(dotted);
  if (Array.isArray(container)) {
    const index = container.findIndex((item) => item?.id === last);
    if (index < 0) fail(`No item "${last}" in ${dotted}`);
    container[index] = parseValue(text);
  } else {
    container[last] = parseValue(text);
  }
}
for (const value of values.add) {
  const [dotted, text] = pair('add', value);
  const [container, last] = resolve(dotted);
  const list = Array.isArray(container) ? childOf(container, last, false, dotted) : (container[last] ??= []);
  if (!Array.isArray(list)) fail(`${dotted} is not a list`);
  const item = parseValue(text);
  const existing = item?.id !== undefined ? list.find((entry) => entry?.id === item.id) : undefined;
  if (existing) Object.assign(existing, item);
  else list.push(item);
}
map.initiative.last_updated = today;

fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);

if (values['no-validate']) process.exit(0);
const validator = path.join(path.dirname(fileURLToPath(import.meta.url)), 'validate-sleuth.mjs');
const result = spawnSync(process.execPath, [validator, dir], { stdio: 'inherit' });
process.exit(result.status ?? 1);
