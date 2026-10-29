import type {
  AgentContract, CompileOptions, IntentIR, Role, ToolSpec,
  SuccessCriterion, Constraint, VerificationStep, IntentParser,
} from './types.js';
import { ruleParser } from './parser-rules.js';

const ROLE_TEMPLATES: Record<string, { name: string; capabilities: string[]; restrictions: string[] }> = {
  modify:   { name: 'modifier',   capabilities: ['read','edit','test'],          restrictions: ['no-delete','no-shell'] },
  create:   { name: 'creator',    capabilities: ['read','write','test'],         restrictions: ['no-delete'] },
  delete:   { name: 'remover',    capabilities: ['read','delete'],               restrictions: ['require-confirm','dry-run'] },
  fix:      { name: 'fixer',      capabilities: ['read','edit','test','debug'],  restrictions: ['no-shell'] },
  test:     { name: 'tester',     capabilities: ['read','run-tests'],            restrictions: ['no-edit'] },
  migrate:  { name: 'migrator',   capabilities: ['read','edit','dry-run'],       restrictions: ['require-confirm','backup-required'] },
  deploy:   { name: 'deployer',   capabilities: ['read','deploy','verify'],      restrictions: ['require-confirm','staging-first'] },
  review:   { name: 'reviewer',   capabilities: ['read','comment'],              restrictions: ['no-edit','no-shell'] },
  refactor: { name: 'refactorer', capabilities: ['read','edit','test'],          restrictions: ['no-behavior-change'] },
};

function buildRoles(ir: IntentIR): Role[] {
  const base = ROLE_TEMPLATES[ir.action] ?? ROLE_TEMPLATES.modify;
  const roles: Role[] = [{ ...base }];
  if (ir.riskHints.includes('data-mutation')) {
    roles.push({ name: 'data-guardian', capabilities: ['validate-migration','check-rollback'], restrictions: ['no-execute'] });
  }
  if (ir.riskHints.includes('secrets')) {
    roles.push({ name: 'security-reviewer', capabilities: ['scan-secrets'], restrictions: ['no-edit'] });
  }
  return roles;
}

function buildTools(ir: IntentIR, allowed?: string[]): ToolSpec[] {
  const needed = new Set<string>(['read_file']);
  if (['modify','create','fix','migrate','refactor'].includes(ir.action)) needed.add('write_file');
  if (['fix','test','migrate','refactor'].includes(ir.action))       needed.add('run_tests');
  if (ir.riskHints.includes('shell-exec'))    needed.add('run_shell');
  if (ir.riskHints.includes('data-mutation')) needed.add('run_migration');
  if (ir.action === 'deploy')                 needed.add('deploy');

  const list = allowed ? [...needed].filter(n => allowed.includes(n)) : [...needed];
  return list.map(name => ({ name, args: {}, required: true }));
}

function buildSuccessCriteria(ir: IntentIR): SuccessCriterion[] {
  const out: SuccessCriterion[] = [];
  let i = 1;
  const add = (d: string, check: SuccessCriterion['check']) =>
    out.push({ id: `sc-${i++}`, description: d, check });

  if (['modify','create','fix','refactor'].includes(ir.action)) {
    add('All targeted files compile without errors', 'automated');
    add('Relevant tests pass', 'automated');
  }
  if (ir.action === 'migrate') {
    add('Migration is reversible (rollback verified)', 'automated');
    add('No data loss in dry-run', 'automated');
  }
  if (ir.action === 'deploy') {
    add('Staging verification passed', 'automated');
    add('Production health check green', 'automated');
  }
  if (ir.riskHints.includes('secrets')) add('No secrets committed or logged', 'automated');
  if (ir.targets.length) add(`Targets changed: ${ir.targets.join(', ')}`, 'automated');
  add('Changes match stated intent', 'llm-judge');
  return out;
}

function buildConstraints(ir: IntentIR): Constraint[] {
  const out: Constraint[] = [];
  if (ir.riskHints.includes('production-touch'))
    out.push({ kind: 'safety', description: 'Requires explicit approval before production changes' });
  if (ir.riskHints.includes('destructive'))
    out.push({ kind: 'safety', description: 'Destructive operations must run in dry-run first' });
  if (ir.riskHints.includes('secrets'))
    out.push({ kind: 'policy', description: 'Do not read or output secrets' });
  if (ir.scope.length)
    out.push({ kind: 'scope', description: `Limit changes to: ${ir.scope.join(', ')}` });
  out.push({ kind: 'resource', description: 'Abort if cost exceeds configured budget' });
  return out;
}

function buildVerification(ir: IntentIR): VerificationStep[] {
  const out: VerificationStep[] = [];
  if (['modify','create','fix','refactor','migrate'].includes(ir.action))
    out.push({ step: 'Run tests', command: 'npm test', expects: 'exit 0' });
  if (ir.action === 'migrate')
    out.push({ step: 'Run migration dry-run', command: 'npm run migrate -- --dry-run', expects: 'no errors' });
  if (ir.targets.length)
    out.push({ step: 'Review diff', command: 'git diff', expects: 'only intended changes' });
  if (ir.riskHints.includes('secrets'))
    out.push({ step: 'Scan for leaked secrets', command: 'git diff | grep -Ei "secret|token|password"', expects: 'no matches' });
  return out;
}

export async function compileIntent(opts: CompileOptions): Promise<AgentContract> {
  const parser: IntentParser = opts.parser ?? ruleParser;
  const ir = await parser.parse(opts.intent, opts.context);

  const warnings: string[] = [];
  if (!ir.targets.length) warnings.push('No file targets detected; scope may be too broad');
  if (ir.riskHints.length) warnings.push(`Risk hints: ${ir.riskHints.join(', ')}`);
  if (opts.allowedTools) {
    for (const t of buildTools(ir)) {
      if (!opts.allowedTools.includes(t.name))
        warnings.push(`Tool "${t.name}" is required but not in allowedTools`);
    }
  }
  if (warnings.length) {
    for (const w of warnings) console.error(`[agent-task-compiler] ${w}`);
  }

  const confidence = Math.min(1, 0.4 + ir.targets.length * 0.1 + (ir.action !== 'modify' ? 0.2 : 0));

  if (opts.strict && confidence < 0.6) {
    throw new Error(`Low confidence (${confidence.toFixed(2)}); refusing strict compile. Refine the intent.`);
  }

  return {
    version: '1.0',
    intent: opts.intent,
    roles: buildRoles(ir),
    tools: buildTools(ir, opts.allowedTools),
    successCriteria: buildSuccessCriteria(ir),
    constraints: buildConstraints(ir),
    verification: buildVerification(ir),
    metadata: { compiledAt: new Date().toISOString(), parser: parser.name, confidence },
  };
}
