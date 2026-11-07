#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sleuth-shape-'));
const source = path.join(skill, 'examples/aws-runtime-config');
let checks = 0;

function check(name, mutate, expected, message) {
  const target = path.join(temp, name);
  fs.cpSync(source, target, { recursive: true });
  const shapePath = path.join(target, 'shape-brief.md');
  const mapPath = path.join(target, 'initiative-map.json');
  let shape = fs.readFileSync(shapePath, 'utf8');
  const map = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  shape = mutate(shape, map);
  fs.writeFileSync(shapePath, shape);
  fs.writeFileSync(mapPath, JSON.stringify(map));
  const run = spawnSync(process.execPath, [path.join(skill, 'scripts/validate-sleuth.mjs'), target], { encoding: 'utf8' });
  assert.equal(run.status, expected, `${name}: ${run.stdout}\n${run.stderr}`);
  if (message) assert.match(run.stdout + run.stderr, message, name);
  checks += 1;
}

try {
  check('complete-shape', (text) => text, 0);
  check('no-optional-sections', (text) => text.replace(/## Behavior[\s\S]*?(?=## Decisions)/, ''), 0);
  check('inventory-only', (text) => text.replace(/\*\*First proof:\*\*[\s\S]*?(?=\n\n)/, ''), 1, /needs First proof/);
  check('no-decision-rule', (text) => text.replace(/\*\*Decide:\*\*[\s\S]*?(?=\n\n)/, ''), 1, /needs Decide/);
  check('lost-map-proof', (text, map) => { delete map.shape.first_proof; return text; }, 1, /shape.first_proof/);
  check('lost-success-pass', (text, map) => { map.shape.success_moves = []; return text; }, 1, /shape.success_moves/);
  check('over-budget', (text) => `${text}\n${'Added detail. '.repeat(600)}`, 1, /1,000-word shape limit/);
  console.log(`Passed ${checks} shape validation checks.`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
