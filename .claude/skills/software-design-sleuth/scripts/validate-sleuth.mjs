#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const retirement = process.argv.includes('--retirement');
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing ${relativePath}`);
    return '';
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function stripFrontmatter(text) {
  return text.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
}

function words(text) {
  return (stripFrontmatter(text).match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || []).length;
}

function count(text, regex) {
  return (text.match(regex) || []).length;
}

function section(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^## ${escaped}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match?.[1] || '';
}

function requireHeadings(file, text, headings) {
  const missing = headings.filter(
    (heading) => !text.match(new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm'))
  );
  for (const heading of missing) fail(`${file}: missing "## ${heading}"`);
  if (missing.length) {
    fail(`${file}: needs these sections, in order: ${headings.map((heading) => `"## ${heading}"`).join(', ')}. Copy them from templates/${file}.`);
  }
}

function validateIntent(file, text, map) {
  const wordCount = words(text);
  const majorSections = count(text, /^## /gm);
  const bullets = count(text, /^\s*(?:[-*]|\d+\.)\s+/gm);
  const questions = map.intent?.human_questions?.filter((item) => item.status !== 'resolved').length || 0;

  if (wordCount > 1500) fail(`${file}: ${wordCount} words exceeds the 1,500-word hard limit`);
  if (majorSections > 10) fail(`${file}: ${majorSections} major sections exceeds the limit of 10`);
  if (bullets > 35) fail(`${file}: ${bullets} bullets/items exceeds the limit of 35`);
  if (questions > 3) fail(`initiative-map.json: ${questions} open human questions exceeds the limit of 3`);

  const forbidden = [
    'Evidence ledger',
    'Source inventory',
    'Source coverage',
    'Risk register',
    'Concept independence',
    'Capability map',
    'Autonomous work frontier',
    'Active human frontier',
    'Uncertainty profile'
  ];
  for (const term of forbidden) {
    if (text.toLowerCase().includes(term.toLowerCase())) {
      fail(`${file}: exposes internal process section "${term}"`);
    }
  }

  requireHeadings(file, text, ['My read', 'What matters most', 'Boundaries', 'What seems settled', 'Next step after confirmation']);

  if (wordCount < 250) warn(`${file}: only ${wordCount} words; verify that the durable intent and boundaries are actually captured`);
}

function validateBrainstorm(file, text, map) {
  const optionCount = count(text, /^## Option \d+\s+[—-]/gm);
  const requested = map.brainstorm?.requested_count || 7;
  const lower = Math.max(3, requested - 1);
  const upper = requested + 1;

  if (optionCount < lower || optionCount > upper) {
    fail(`${file}: expected about ${requested} options, found ${optionCount}`);
  }

  const requiredLabels = ['**Core move:**', '**Makes easier:**', '**Main catch:**', '**Best fit:**'];
  for (const label of requiredLabels) {
    const labelCount = text.split(label).length - 1;
    if (labelCount < optionCount) fail(`${file}: ${label} appears ${labelCount} times for ${optionCount} options`);
  }

  if (/\b(?:SRC|OBS|INF|ASM|DEC|RISK|PROBE)-\d+\b/.test(text)) {
    fail(`${file}: exposes machine IDs in the human brainstorming artifact`);
  }
  if (/^\s*(?:Source|Evidence):/gmi.test(text)) {
    fail(`${file}: includes source/evidence notes; keep provenance in initiative-map.json`);
  }
  if (words(text) > 1800) fail(`${file}: brainstorming artifact exceeds 1,800 words`);

  const premises = (map.brainstorm?.options || []).map((option) => option.premise?.trim().toLowerCase()).filter(Boolean);
  if (new Set(premises).size < Math.min(4, optionCount)) {
    fail('initiative-map.json: brainstorm options do not contain at least four distinct governing premises');
  }
}

function validateShape(file, text, map) {
  requireHeadings(file, text, ['Feature scope', 'Decisions and boundaries']);
  for (const label of ['Outcome', 'Primary flow']) {
    if (!new RegExp(`\\*\\*${label}:\\*\\*\\s*\\S`).test(text)) {
      fail(`${file}: missing ${label}`);
    }
  }
  // A missing section is already reported; skip the checks inside it.
  const scope = section(text, 'Feature scope');
  if (scope) {
    if (!/(?:├──|└──|\+--|\|--)/.test(scope)) {
      fail(`${file}: Feature scope needs a nested capability tree`);
    }
    if (!/planned|add(?:itions)?|required|included/i.test(scope)) {
      fail(`${file}: tree must identify the intended additions`);
    }
  }
  const decisions = section(text, 'Decisions and boundaries');
  if (decisions) {
    const missing = ['First proof', 'Try', 'Observe', 'Decide'].filter(
      (label) => !new RegExp(`\\*\\*${label}:\\*\\*\\s*\\S`).test(decisions)
    );
    if (missing.length) {
      fail(`${file}: Decisions and boundaries needs ${missing.join(", ")} (each as a bold "**Label:**" line)`);
    }
  }
  const wordCount = words(text);
  if (wordCount > 1000) fail(`${file}: ${wordCount} words exceeds the 1,000-word shape limit`);
  else if (wordCount > 800) warn(`${file}: ${wordCount} words exceeds the default 400–800 word budget`);

  const success = map.shape?.success_moves || [];
  if (success.length < 3 || success.length > 6) {
    fail(`initiative-map.json: shape.success_moves must contain 3–6 concrete moves; found ${success.length}`);
  }
  if (!map.shape?.first_proof?.question || !map.shape?.first_proof?.artifact || !map.shape?.first_proof?.decision_rule) {
    fail('initiative-map.json: shape.first_proof must include question, artifact, and decision_rule, as {"question": "...", "artifact": "...", "decision_rule": "..."}');
  }
  if ((map.shape?.open_decisions || []).length > 2) {
    fail('initiative-map.json: shape has more than two remaining human decisions');
  }


}

function validatePlan(file, text, map) {
  requireHeadings(file, text, [
    'Plan at a glance',
    'Implementation strategy',
    'Below the cut line'
  ]);

  const milestoneHeadings = [...text.matchAll(/^## Milestone (\d+):\s+(.+)$/gm)];
  if (milestoneHeadings.length < 2) fail(`${file}: needs at least two outcome milestones`);
  if (milestoneHeadings.length > 10) warn(`${file}: ${milestoneHeadings.length} milestones may be too fragmented`);

  const desiredEnds = count(text, /^### Desired end state\s*$/gm);
  if (desiredEnds !== milestoneHeadings.length) {
    fail(`${file}: found ${milestoneHeadings.length} milestones but ${desiredEnds} Desired end state sections`);
  }

  const wordCount = words(text);
  if (wordCount > 6000) fail(`${file}: ${wordCount} words exceeds the 6,000-word hard limit`);
  if (wordCount > 4500) warn(`${file}: ${wordCount} words is heavy; consider moving secondary detail below the cut line or into spikes`);

  const implementation = map.implementation || {};
  const dependencies = implementation.dependencies || [];
  const materialDependencies = dependencies.filter((dependency) => dependency.material);

  if (materialDependencies.length > 0 && !implementation.fast_local_loop?.command) {
    fail('initiative-map.json: material dependencies exist but implementation.fast_local_loop.command is missing');
  }

  for (const dependency of materialDependencies) {
    const prefix = `initiative-map.json dependency ${dependency.id || dependency.name || '<unknown>'}`;
    if (!dependency.application_seam) fail(`${prefix}: missing application_seam`);
    if (!dependency.first_proof_role?.mode || !dependency.first_proof_role?.rationale) fail(`${prefix}: missing first_proof_role.mode or rationale`);
    if (!Array.isArray(dependency.failure_modes) || dependency.failure_modes.length === 0) fail(`${prefix}: missing failure_modes`);
    if (!Array.isArray(dependency.proof_rungs) || dependency.proof_rungs.length === 0) fail(`${prefix}: missing proof_rungs`);
    if (!dependency.local_proof) fail(`${prefix}: missing local_proof or explicit explanation`);
    if (!dependency.live_proof) fail(`${prefix}: missing live_proof or explicit explanation`);
    if (!dependency.rollout) fail(`${prefix}: missing rollout strategy`);
  }

  const milestones = implementation.milestones || [];
  if (milestones.length !== milestoneHeadings.length) {
    fail(`initiative-map.json has ${milestones.length} milestones but ${file} has ${milestoneHeadings.length}`);
  }

  for (const milestone of milestones) {
    const prefix = `initiative-map.json milestone ${milestone.id || milestone.title || '<unknown>'}`;
    const missing = ['outcome', 'proof', 'valid_intermediate_state', 'rollback'].filter((key) => !milestone[key]);
    if (missing.length) {
      fail(`${prefix}: missing ${missing.join(', ')}. Each milestone needs id, title, outcome, dependencies_introduced, proof, valid_intermediate_state, rollback, and status; see "Milestone record" in references/implementation-planning.md`);
    }
  }

  if (materialDependencies.length > 0 && milestones[0]?.dependencies_introduced?.length > 0) {
    warn('initiative-map.json: first milestone introduces a material dependency; verify that a provider-free or dependency-light proof is impossible');
  }

  if ((implementation.open_decisions || []).length > 3) {
    fail('initiative-map.json: implementation has more than three unresolved decisions/spikes');
  }
}

let map;
try {
  map = JSON.parse(read('initiative-map.json'));
} catch (error) {
  fail(`initiative-map.json: invalid JSON (${error.message})`);
  map = {};
}

if (map.schema_version !== '0.5.0') warn(`initiative-map.json: expected schema_version 0.5.0, found ${map.schema_version || '<missing>'}`);
if (!map.initiative?.title) fail('initiative-map.json: missing initiative.title');
if (!map.initiative?.slug) fail('initiative-map.json: missing initiative.slug');
if (!map.initiative?.current_phase) fail('initiative-map.json: missing initiative.current_phase');

const statuses = ['planned', 'active', 'paused', 'completed', 'cancelled'];
const phases = ['intent', 'brainstorm', 'shape', 'plan', 'execution', 'reconciliation'];
const status = map.initiative?.status;
if (status == null) warn('initiative-map.json: lifecycle status not assessed');
else if (!statuses.includes(status)) fail(`initiative-map.json: invalid initiative.status ${status}`);
if (!phases.includes(map.initiative?.current_phase)) fail('initiative-map.json: invalid current_phase');
if (map.schema_version === '0.5.0' && typeof map.initiative?.next_action !== 'string') {
  fail('initiative-map.json: missing initiative.next_action');
}
for (const milestone of map.implementation?.milestones || []) {
  if (!['planned', 'active', 'completed', 'cancelled'].includes(milestone.status)) {
    fail(`initiative-map.json: invalid milestone status ${milestone.status} on ${milestone.id || milestone.title || '<unknown>'}; use planned, active, completed, or cancelled ("not-started" is only for shape.status and implementation.status)`);
  }
  if (milestone.status === 'completed' && !milestone.evidence?.length) {
    fail(`initiative-map.json: completed milestone ${milestone.id} needs observed evidence`);
  }
}

const closed = ['completed', 'cancelled'].includes(status);
const closure = map.closure;
if (closed || retirement) {
  if (!closed) fail('Retirement requires completed or cancelled initiative status');
  if (!closure?.summary?.trim()) fail('Closure requires a summary');
  if (status === 'cancelled' && !closure?.reason?.trim()) fail('Cancellation requires a reason');
  if (status === 'completed' && !closure?.evidence?.length) fail('Completion requires observed verification evidence');
  const rows = closure?.reconciliation || [];
  for (const claim of map.intent?.claims || []) {
    if (!['core', 'supporting'].includes(claim.importance) || ['rejected', 'superseded'].includes(claim.status)) continue;
    if (!rows.some((row) => row.claim_id === claim.id)) fail(`Closure missing reconciliation for ${claim.id}`);
  }
  for (const row of rows) {
    if (!row.claim_id || !['delivered', 'changed', 'omitted', 'unresolved'].includes(row.disposition) || !row.evidence?.trim()) {
      fail('Closure reconciliation requires claim_id, valid disposition, and evidence');
    }
    if (status === 'completed' && row.disposition === 'unresolved') fail(`Completion has unresolved intent ${row.claim_id}`);
  }
  if (rows.some((row) => row.disposition === 'unresolved') && !closure?.follow_ups?.length) {
    fail('Unresolved intent requires durable follow-up or explicit cancellation decisions');
  }
  if (!Array.isArray(closure?.follow_ups)) fail('Closure requires follow_ups, even when empty');
}

if (retirement) {
  const repository = map.implementation?.repository_snapshot?.root;
  if (!repository || !fs.existsSync(repository)) fail('Retirement requires an existing repository root');
  else {
    const repo = fs.realpathSync(repository);
    const folder = fs.realpathSync(root);
    const inside = (base, target) => target.startsWith(`${base}${path.sep}`);
    if (!inside(repo, folder)) fail('Initiative folder must be inside its repository');
    const docs = closure?.documentation || [];
    if (status === 'completed' && !docs.length) fail('Completed retirement requires durable documentation');
    for (const doc of docs) {
      const target = path.resolve(repo, doc);
      if (path.isAbsolute(doc) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
        fail(`Invalid durable documentation path: ${doc}`);
        continue;
      }
      const actual = fs.realpathSync(target);
      if (!inside(repo, actual) || actual === folder || inside(folder, actual)) fail(`Documentation must survive retirement: ${doc}`);
    }
    const files = closure?.retirement_files || [];
    if (!files.includes('initiative-map.json')) fail('Removal list must include initiative-map.json');
    for (const file of files) {
      const target = path.resolve(folder, file);
      if (path.isAbsolute(file) || !inside(folder, target) || !fs.existsSync(target) || !fs.lstatSync(target).isFile()) {
        fail(`Invalid planning-file removal path: ${file}`);
      } else if (!inside(folder, fs.realpathSync(target))) fail(`Removal path escapes initiative folder: ${file}`);
    }
  }
  // Human authorization and semantic fidelity require conversation and code review; JSON cannot prove them.
}

for (const source of map.sources || []) {
  if (!source.id || !source.type || !source.location || !source.anchor || !source.authority) {
    fail(`initiative-map.json: every source needs id, type, location, anchor, and authority (${source.id || '<unknown>'})`);
  }
}

if (map.question_rounds) {
  const qr = map.question_rounds;
  if (qr.status && !['in-progress', 'complete', 'stopped-early'].includes(qr.status)) {
    fail(`initiative-map.json: question_rounds.status must be in-progress, complete, or stopped-early (got ${qr.status})`);
  }
  for (const round of qr.rounds || []) {
    if (!Number.isInteger(round.round) || !Array.isArray(round.questions)) {
      fail('initiative-map.json: every question_rounds.rounds entry needs an integer round and a questions array, as {"round": 1, "questions": [{"question": "..."}]}');
    } else if (round.questions.some((item) => !item?.question)) {
      fail(`initiative-map.json: question round ${round.round} has a question without question text`);
    }
  }
}

const artifacts = map.artifacts || {};
const phaseOrder = ['intent', 'brainstorm', 'shape', 'plan'];
const currentPhase = map.initiative?.current_phase;

const artifactDefinitions = [
  ['intent_brief', 'intent-brief.md', validateIntent],
  ['brainstorm', 'brainstorm.md', validateBrainstorm],
  ['shape_brief', 'shape-brief.md', validateShape],
  ['implementation_plan', 'implementation-plan.md', validatePlan]
];

for (const [key, fallbackPath, validator] of artifactDefinitions) {
  const artifact = artifacts[key];
  if (!artifact) {
    if (key === 'intent_brief') fail(`initiative-map.json: missing artifacts.${key}`);
    continue;
  }

  const relativePath = artifact.path || fallbackPath;
  if (retirement) continue;
  if (artifact.status === 'current') {
    const text = read(relativePath);
    if (text) validator(relativePath, text, map);
  } else if (artifact.status === 'stale' && currentPhase === phaseOrder[artifactDefinitions.findIndex(([candidate]) => candidate === key)]) {
    warn(`${relativePath}: marked stale while initiative current_phase is the same phase`);
  }
}

if (!retirement && artifacts.implementation_plan?.status === 'current' && artifacts.shape_brief?.status !== 'current') {
  fail('initiative-map.json: implementation plan is current while shape brief is not current');
}
if (!retirement && artifacts.shape_brief?.status === 'current' && artifacts.intent_brief?.status !== 'current') {
  fail('initiative-map.json: shape brief is current while intent brief is not current');
}
if (!retirement && artifacts.brainstorm?.status === 'current' && artifacts.intent_brief?.status !== 'current') {
  fail('initiative-map.json: brainstorm is current while intent brief is not current');
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);

if (errors.length > 0) {
  console.error(`\nValidation failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}

console.log(`Validation passed: ${warnings.length} warning(s).`);
