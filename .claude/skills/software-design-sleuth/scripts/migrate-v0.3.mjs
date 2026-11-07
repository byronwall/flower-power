#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || '.');
const oldPath = path.join(root, 'intent-map.json');
const newPath = path.join(root, 'initiative-map.json');

if (fs.existsSync(newPath)) {
  console.error(`Refusing to overwrite existing ${newPath}`);
  process.exit(1);
}

if (!fs.existsSync(oldPath)) {
  console.error(`Legacy intent-map.json not found in ${root}`);
  process.exit(1);
}

let old;
try {
  old = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
} catch (error) {
  console.error(`Unable to parse ${oldPath}: ${error.message}`);
  process.exit(1);
}

const legacyInitiative = old.initiative || {};
const claims = old.claims || [];
const firstCoreOutcome = claims.find((claim) => claim.priority === 'core' && claim.kind === 'outcome')?.statement
  || claims.find((claim) => claim.priority === 'core')?.statement
  || '';

const hasShape = fs.existsSync(path.join(root, 'shape-brief.md'));
const hasPlan = fs.existsSync(path.join(root, 'implementation-plan.md'));
const hasBrainstorm = fs.existsSync(path.join(root, 'brainstorm.md'));
const now = new Date().toISOString().slice(0, 10);

const map = {
  schema_version: '0.5.0',
  initiative: {
    title: legacyInitiative.title || path.basename(root),
    slug: legacyInitiative.slug || path.basename(root),
    scale: legacyInitiative.scope || 'capability',
    current_phase: 'intent',
    // Lifecycle remains unassessed until repository evidence is checked.
    status: null,
    next_action: 'Assess initiative lifecycle against repository evidence',
    last_updated: legacyInitiative.last_updated || now,
    summary: firstCoreOutcome
  },
  closure: null,
  artifacts: {
    intent_brief: {
      path: 'intent-brief.md',
      status: fs.existsSync(path.join(root, 'intent-brief.md')) ? 'current' : 'not-created',
      updated_at: legacyInitiative.last_updated || now
    },
    brainstorm: {
      path: 'brainstorm.md',
      status: hasBrainstorm ? 'stale' : 'not-requested',
      updated_at: hasBrainstorm ? now : null
    },
    shape_brief: {
      path: 'shape-brief.md',
      status: hasShape ? 'stale' : 'not-created',
      updated_at: hasShape ? now : null
    },
    implementation_plan: {
      path: 'implementation-plan.md',
      status: hasPlan ? 'stale' : 'not-created',
      updated_at: hasPlan ? now : null
    }
  },
  sources: (old.sources || []).map((source) => ({
    id: source.id,
    type: source.type || source.origin || 'unknown',
    location: source.location || source.title || 'unknown',
    anchor: Array.isArray(source.anchors) ? source.anchors.join('; ') : source.anchor || 'legacy source; anchor not recorded',
    authority: source.authority || source.origin || 'legacy',
    title: source.title,
    date: source.date,
    notes: source.notes,
    legacy: source
  })),
  intent: {
    claims: claims.map((claim) => ({
      id: claim.id,
      type: claim.kind || 'derived-implication',
      statement: claim.statement,
      commitment: normalizeCommitment(claim.strength),
      importance: normalizeImportance(claim.priority),
      status: claim.status || 'active',
      time_horizon: claim.time_horizon || claim.scope || 'unspecified',
      sources: claim.source_refs || [],
      confidence: claim.confidence,
      anchors: claim.anchors,
      conflicts_with: claim.conflicts_with,
      supersedes: claim.supersedes,
      notes: claim.notes,
      legacy: claim
    })),
    themes: old.themes || [],
    conflicts: claims
      .filter((claim) => Array.isArray(claim.conflicts_with) && claim.conflicts_with.length > 0)
      .map((claim) => ({ claim: claim.id, conflicts_with: claim.conflicts_with })),
    human_questions: (old.open_questions || []).map((question, index) => ({
      id: question.id || `HQ-${String(index + 1).padStart(3, '0')}`,
      question: question.question || question.text || String(question),
      reason: question.reason || question.why || 'Migrated from v0.3 open question.',
      status: question.status || 'open',
      recommendation: question.recommendation,
      default: question.default
    }))
  },
  brainstorm: {
    status: hasBrainstorm ? 'stale' : 'not-requested',
    requested_count: 7,
    options: [],
    selected_option: null
  },
  shape: {
    status: hasShape ? 'stale' : 'not-started',
    appetite: null,
    problem: null,
    recommended_shape: null,
    success_moves: [],
    first_proof: null,
    rabbit_holes: [],
    open_decisions: []
  },
  implementation: {
    status: hasPlan ? 'stale' : 'not-started',
    repository_snapshot: {
      root: null,
      revision: null,
      worktree_status: null,
      subsystems: [],
      test_commands: [],
      deployment_surfaces: []
    },
    dependencies: [],
    fast_local_loop: null,
    milestones: [],
    cut_line: [],
    open_decisions: []
  },
  history: [
    ...(old.history || []),
    {
      date: now,
      phase: 'migration',
      change: 'Migrated v0.3 intent-map.json into v0.4 initiative-map.json. Legacy file preserved. Existing downstream artifacts were marked stale for re-evaluation.'
    }
  ]
};

fs.writeFileSync(newPath, `${JSON.stringify(map, null, 2)}\n`);
console.log(`Created ${newPath}`);
console.log(`Preserved ${oldPath}`);
if (hasBrainstorm || hasShape || hasPlan) {
  console.log('Existing downstream artifacts were marked stale because v0.4 adds new shaping and implementation-success requirements.');
}

function normalizeCommitment(value) {
  if (['explicit', 'repeated', 'tentative', 'illustrative', 'derived'].includes(value)) return value;
  return value === 'strong' ? 'explicit' : 'derived';
}

function normalizeImportance(value) {
  if (['core', 'supporting', 'peripheral'].includes(value)) return value;
  return 'supporting';
}
