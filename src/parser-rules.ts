import type { IntentParser, IntentIR } from './types.js';

const VERB_MAP: Record<string, string> = {
  refactor: 'refactor', rename: 'refactor', move: 'refactor',
  fix: 'fix', bug: 'fix', repair: 'fix',
  create: 'create', add: 'create', build: 'create',
  delete: 'delete', remove: 'delete', drop: 'delete',
  test: 'test', verify: 'test',
  migrate: 'migrate', upgrade: 'migrate',
  deploy: 'deploy', release: 'deploy',
  review: 'review', audit: 'review',
};

const RISK_PATTERNS: Array<[RegExp, string]> = [
  [/\b(prod|production|live)\b/i, 'production-touch'],
  [/\b(delete|drop|truncate|rm -rf)\b/i, 'destructive'],
  [/\b(secret|password|token|credential)\b/i, 'secrets'],
  [/\b(database|schema|migration)\b/i, 'data-mutation'],
  [/\b(shell|command|exec)\b/i, 'shell-exec'],
];

const PATH_RE = /(?:^|\s)([\w./-]+\.(?:ts|js|tsx|jsx|py|go|rs|java|rb|php|md|json|ya?ml|toml|sql))/g;

export const ruleParser: IntentParser = {
  name: 'rules-v1',
  parse(intent: string): IntentIR {
    const lower = intent.toLowerCase();
    const words = lower.split(/\s+/).map(w => w.replace(/[^\w-]/g, ''));

    let action = 'modify';
    for (const w of words) if (VERB_MAP[w]) { action = VERB_MAP[w]; break; }

    const targets = new Set<string>();
    const pathRe = new RegExp(PATH_RE);
    let m: RegExpExecArray | null;
    while ((m = pathRe.exec(intent))) targets.add(m[1]);

    const riskHints: string[] = [];
    for (const [re, label] of RISK_PATTERNS) if (re.test(lower)) riskHints.push(label);

    const stop = new Set(['with','that','this','from','into','then','than','when','want','need','make','should','also','have']);
    const objects = words
      .filter(w => w.length > 3 && !stop.has(w) && !VERB_MAP[w])
      .slice(0, 10);

    return { action, targets: [...targets], objects, scope: [...targets], riskHints, raw: intent };
  },
};
