#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sleuth-lifecycle-'));
const folder = path.join(repo, 'docs/intent/example');
fs.mkdirSync(folder, { recursive: true });
fs.writeFileSync(path.join(repo, 'docs/feature.md'), 'Delivered behavior.\n');
const initial = JSON.parse(fs.readFileSync(path.join(skill, 'templates/initiative-map.json'), 'utf8'));
Object.assign(initial.initiative, { title: 'Example', slug: 'example', next_action: 'Run first proof' });
initial.implementation.repository_snapshot.root = repo;
initial.intent.claims = [{ id: 'goal', importance: 'core', status: 'active' }];
function check(map, expected, pattern, retirement = false) {
  fs.writeFileSync(path.join(folder, 'initiative-map.json'), JSON.stringify(map));
  const result = spawnSync(process.execPath, [path.join(skill, 'scripts/validate-sleuth.mjs'), folder, ...(retirement ? ['--retirement'] : [])], { encoding: 'utf8' });
  assert.equal(result.status, expected, result.stdout + result.stderr);
  if (pattern) assert.match(result.stdout + result.stderr, pattern);
}
try {
  check(initial, 0);
  const closed = structuredClone(initial);
  closed.initiative.status = 'completed';
  closed.initiative.current_phase = 'reconciliation';
  closed.closure = {
    summary: 'Delivered the agreed behavior', reason: null, evidence: ['Required check passed'],
    reconciliation: [{ claim_id: 'goal', disposition: 'delivered', evidence: 'Code and required check agree' }],
    documentation: ['docs/feature.md'], follow_ups: [], retirement_files: ['initiative-map.json']
  };
  check(closed, 0, null, true);
  const missingProof = structuredClone(closed); missingProof.closure.evidence = [];
  check(missingProof, 1, /Completion requires observed verification evidence/, true);
  const unresolved = structuredClone(closed); unresolved.closure.reconciliation[0].disposition = 'unresolved';
  check(unresolved, 1, /unresolved intent/, true);
  const missingClaim = structuredClone(closed); missingClaim.closure.reconciliation = [];
  check(missingClaim, 1, /missing reconciliation/, true);
  const temporaryDocs = structuredClone(closed); temporaryDocs.closure.documentation = ['docs/intent/example/initiative-map.json'];
  check(temporaryDocs, 1, /must survive retirement/, true);
  const unsafe = structuredClone(closed); unsafe.closure.retirement_files.push('../../feature.md');
  check(unsafe, 1, /Invalid planning-file removal path/, true);
  const cancelled = structuredClone(closed); cancelled.initiative.status = 'cancelled'; cancelled.closure.reason = 'User stopped this scope';
  cancelled.closure.evidence = []; cancelled.closure.documentation = []; cancelled.closure.reconciliation[0].disposition = 'unresolved';
  cancelled.closure.follow_ups = ['Cancelled remaining work by explicit user direction'];
  check(cancelled, 0, null, true);
  cancelled.closure.reason = null;
  check(cancelled, 1, /Cancellation requires a reason/, true);
  const active = structuredClone(closed); active.initiative.status = 'active';
  check(active, 1, /requires completed or cancelled/, true);
  const legacy = structuredClone(initial); legacy.schema_version = '0.4.0'; delete legacy.initiative.status;
  check(legacy, 0, /lifecycle status not assessed/);
  assert.ok(fs.existsSync(path.join(folder, 'initiative-map.json')), 'Validation must not delete planning files');
  console.log('Lifecycle checks passed.');
} finally {
  fs.rmSync(repo, { recursive: true, force: true });
}
