#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const rootArg = args.find((arg) => !arg.startsWith('--')) || '.';
const root = path.resolve(rootArg);

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
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

function clamp(value) {
  return Math.max(0, Math.min(10, Math.round(value * 10) / 10));
}

function result(name, score, reason, improvements = []) {
  return { name, score: clamp(score), reason, improvements };
}

let map;
try {
  map = loadJson('initiative-map.json');
} catch (error) {
  console.error(`Unable to read initiative-map.json: ${error.message}`);
  process.exit(1);
}

const intent = read(map.artifacts?.intent_brief?.path || 'intent-brief.md');
const brainstorm = read(map.artifacts?.brainstorm?.path || 'brainstorm.md');
const shape = read(map.artifacts?.shape_brief?.path || 'shape-brief.md');
const plan = read(map.artifacts?.implementation_plan?.path || 'implementation-plan.md');
const scores = [];

{
  const wc = words(intent);
  const sections = count(intent, /^## /gm);
  const bullets = count(intent, /^\s*(?:[-*]|\d+\.)\s+/gm);
  const forbidden = count(intent, /Evidence ledger|Source inventory|Risk register|Capability map|Active human frontier/gi);
  let score = 10;
  if (wc > 1500) score -= 5;
  else if (wc > 1200) score -= 2;
  if (sections > 10) score -= 2;
  if (bullets > 35) score -= 2;
  if (forbidden > 0) score -= 3;
  scores.push(result('Intent readability', score, `${wc} words, ${sections} major sections, ${bullets} bullets.`, score < 9 ? ['Compress repeated points and keep provenance in JSON.'] : []));
}

{
  const claims = map.intent?.claims || [];
  const core = claims.filter((claim) => claim.importance === 'core');
  const anchoredSources = (map.sources || []).filter((source) => source.anchor && source.authority).length;
  const examplesPromoted = claims.filter((claim) => claim.type === 'example' && ['explicit', 'repeated'].includes(claim.commitment)).length;
  let score = 4;
  score += Math.min(3, core.length * 0.75);
  score += (map.sources?.length || 0) > 0 ? Math.min(2, anchoredSources / Math.max(1, map.sources.length) * 2) : 0;
  score += (map.intent?.human_questions?.length || 0) <= 3 ? 1 : -1;
  score -= examplesPromoted * 1.5;
  scores.push(result('Intent fidelity', score, `${claims.length} claims, ${core.length} core claims, ${anchoredSources} anchored sources.`, score < 9 ? ['Check that examples and implementation hypotheses remain below durable outcomes.'] : []));
}

{
  const options = map.brainstorm?.options || [];
  const premises = new Set(options.map((option) => option.premise?.trim().toLowerCase()).filter(Boolean));
  let score = brainstorm ? 4 : 7;
  if (brainstorm) {
    score += Math.min(3, options.length / 7 * 3);
    score += Math.min(2, premises.size / Math.max(1, options.length) * 2);
    score += /minimal|null|omit|absent|deployment-time/i.test(brainstorm) ? 0.5 : 0;
    score += /invert|opposite|free|operator|sidecar|service/i.test(brainstorm) ? 0.5 : 0;
    if (words(brainstorm) > 1800) score -= 2;
  }
  scores.push(result('Brainstorm diversity', score, brainstorm ? `${options.length} options with ${premises.size} distinct recorded premises.` : 'Brainstorm mode was not requested.', score < 9 && brainstorm ? ['Add a true null/minimal option and an ownership or authority inversion.'] : []));
}

{
  const moves = map.shape?.success_moves || [];
  const proof = map.shape?.first_proof;
  const hasTree = /## Feature scope/m.test(shape) && /(?:├──|└──|\+--|\|--)/.test(shape);
  const hasDecisions = /## Decisions and boundaries/m.test(shape);
  const hasHumanProof = ['First proof', 'Try', 'Observe', 'Decide'].every((label) =>
    new RegExp(`\\*\\*${label}:\\*\\*\\s*\\S`).test(shape));
  let score = shape ? 1 : 0;
  if (hasTree) score += 2;
  if (hasDecisions) score += 1;
  score += Math.min(2, moves.length / 3 * 2);
  if (proof?.question && proof?.artifact && proof?.decision_rule) score += 1.5;
  if (hasHumanProof) score += 1.5;
  if (shape && words(shape) <= 800) score += 1;
  scores.push(result('Shape clarity and challenge', score, `${moves.length} recorded success moves; scope tree ${hasTree ? 'present' : 'missing'}; human first proof ${hasHumanProof ? 'present' : 'missing'}.`, score < 9 ? ['Expose additions in a capability tree and retain a visible Try/Observe/Decide proof. Keep detailed success moves in the map.'] : []));
}

{
  const dependencies = (map.implementation?.dependencies || []).filter((dependency) => dependency.material);
  const withSeams = dependencies.filter((dependency) => dependency.application_seam).length;
  const withFirstProofRoles = dependencies.filter((dependency) => dependency.first_proof_role?.mode && dependency.first_proof_role?.rationale).length;
  const milestones = map.implementation?.milestones || [];
  const crowded = milestones.filter((milestone) => (milestone.dependencies_introduced || []).length > 1).length;
  let score = dependencies.length === 0 ? 9 : 2.5 + (withSeams / dependencies.length) * 3.5 + (withFirstProofRoles / dependencies.length) * 1;
  score += crowded === 0 ? 2 : Math.max(0, 2 - crowded);
  if (milestones[0]?.dependencies_introduced?.length === 0) score += 1;
  scores.push(result('Dependency isolation', score, `${dependencies.length} material dependencies, ${withSeams} named seams, ${withFirstProofRoles} first-proof roles, ${crowded} crowded milestones.`, score < 9 ? ['Put each difficult dependency behind a named application seam and introduce at most one new external risk per slice.'] : []));
}

{
  const loop = map.implementation?.fast_local_loop;
  const dependencies = map.implementation?.dependencies || [];
  const failureModes = dependencies.reduce((sum, dependency) => sum + (dependency.failure_modes?.length || 0), 0);
  let score = loop?.command ? 5 : 1;
  if (loop && loop.shared_infrastructure_required === false) score += 1.5;
  if (loop && loop.network_required === false) score += 1.5;
  if (loop?.failure_injection?.length) score += 1;
  if (failureModes >= 4) score += 1;
  scores.push(result('Fast local feedback', score, loop?.command ? `Focused loop: ${loop.command}; ${failureModes} named dependency failure modes.` : 'No focused local loop recorded.', score < 9 ? ['Add one reproducible local command and deterministic failure injection before relying on live infrastructure.'] : []));
}

{
  const milestones = map.implementation?.milestones || [];
  const complete = milestones.filter((milestone) => milestone.outcome && milestone.proof && milestone.valid_intermediate_state).length;
  let score = milestones.length ? 3 + (complete / milestones.length) * 5 : 0;
  if (milestones[0]?.dependencies_introduced?.length === 0) score += 1;
  if (/## Below the cut line/m.test(plan)) score += 1;
  scores.push(result('Vertical slicing', score, `${complete}/${milestones.length} milestones have outcome, proof, and valid intermediate state.`, score < 9 ? ['Make the first milestone prove observable behavior and ensure each later milestone leaves a runnable system.'] : []));
}

{
  const dependencies = (map.implementation?.dependencies || []).filter((dependency) => dependency.material);
  const complete = dependencies.filter((dependency) => dependency.local_proof && dependency.live_proof && dependency.proof_rungs?.length).length;
  let score = dependencies.length === 0 ? 9 : 3 + (complete / dependencies.length) * 6;
  if (dependencies.some((dependency) => dependency.proof_rungs?.includes('contract-test'))) score += 1;
  scores.push(result('Verification ladder', score, `${complete}/${dependencies.length} material dependencies have local and live proof strategies.`, score < 9 ? ['Assign each property to the lightest faithful rung: fake, emulator/container, contract, sandbox, or deployed proof.'] : []));
}

{
  const milestones = map.implementation?.milestones || [];
  const reversible = milestones.filter((milestone) => milestone.rollback).length;
  const rollout = (map.implementation?.dependencies || []).filter((dependency) => dependency.rollout).length;
  let score = milestones.length ? 3 + (reversible / milestones.length) * 5 : 0;
  if (rollout > 0) score += 1;
  if (/rollback|fallback|bypass|source selection|feature flag/i.test(shape + plan)) score += 1;
  scores.push(result('Reversibility', score, `${reversible}/${milestones.length} milestones record rollback; ${rollout} dependency rollout strategies.`, score < 9 ? ['Keep an explicit disable, bypass, prior revision, or old path until the new behavior is observed.'] : []));
}

{
  const artifacts = map.artifacts || {};
  const stale = Object.values(artifacts).filter((artifact) => artifact?.status === 'stale').length;
  const current = Object.values(artifacts).filter((artifact) => artifact?.status === 'current').length;
  const history = map.history?.length || 0;
  let score = 5;
  if (current > 0) score += 2;
  if (history > 0) score += 2;
  if (stale === 0) score += 1;
  scores.push(result('State continuity', score, `${current} current artifacts, ${stale} stale artifacts, ${history} history entries. Lifecycle: ${map.initiative?.status || 'not assessed'}.`, score < 9 ? ['Mark invalidated downstream artifacts stale immediately and record the semantic delta.'] : []));
}

const overall = clamp(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
const output = { overall, dimensions: scores };

if (jsonMode) {
  console.log(JSON.stringify(output, null, 2));
  process.exit(0);
}

console.log(`# Software Design Sleuth audit\n`);
console.log(`**Overall: ${overall}/10**\n`);
console.log('| Dimension | Score | Assessment |');
console.log('|---|---:|---|');
for (const item of scores) {
  console.log(`| ${item.name} | ${item.score.toFixed(1)} | ${item.reason.replace(/\|/g, '\\|')} |`);
}

const improvements = scores
  .filter((item) => item.score < 9 && item.improvements.length > 0)
  .sort((a, b) => a.score - b.score);

if (improvements.length > 0) {
  console.log('\n## Highest-leverage improvements\n');
  for (const item of improvements.slice(0, 5)) {
    console.log(`- **${item.name}:** ${item.improvements[0]}`);
  }
}
