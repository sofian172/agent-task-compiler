# agent-task-compiler

> Compile natural-language intent into a **verifiable, executable agent contract** — a stable JSON interface that any AI agent can consume.

[![npm](https://img.shields.io/npm/v/agent-task-compiler)](https://www.npmjs.com/package/agent-task-compiler)
[![license](https://img.shields.io/npm/l/agent-task-compiler)](./LICENSE)

## Why?

LLMs are great at editing code but unreliable at *specifying* what they are about to do. `agent-task-compiler` turns vague intents into a strict `AgentContract` — roles, allowed tools, success criteria, constraints, and verification steps — so agents behave predictably and can be tested.

## Install

```bash
npm install agent-task-compiler
```

## Usage — CLI

```bash
npx agent-task-compiler "migrate database schema for users.ts and orders.ts"
```

## Usage — Library

```ts
import { compileIntent, validateContract } from 'agent-task-compiler';

const contract = await compileIntent({
  intent: 'refactor utils.ts without changing behavior',
  allowedTools: ['read_file', 'write_file', 'run_tests'],
});

const { valid, errors } = validateContract(contract);
if (!valid) throw new Error(errors.join('\n'));
```

## Usage — MCP Server

Add to your MCP client config (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "agent-task-compiler": {
      "command": "npx",
      "args": ["-y", "agent-task-compiler-mcp"]
    }
  }
}
```

The server exposes two tools:

- `compile_intent` — same input as the library, returns `{ contract, validation }`
- `validate_contract` — validates any contract object

## Contract shape

```ts
type AgentContract = {
  version: '1.0';
  intent: string;
  roles: { name: string; capabilities: string[]; restrictions: string[]; model?: string }[];
  tools: { name: string; args: object; required: boolean }[];
  successCriteria: { id: string; description: string; check: 'automated' | 'manual' | 'llm-judge' }[];
  constraints: { kind: 'scope' | 'safety' | 'resource' | 'policy'; description: string }[];
  verification: { step: string; command?: string; expects?: string }[];
  metadata: { compiledAt: string; parser: string; confidence: number };
};
```

JSON Schema is at `schema/contract.schema.json` (also exported as `agent-task-compiler/schema`).

## Pluggable parser

The default parser is rule-based and deterministic. Swap it for any LLM:

```ts
import { compileIntent, type IntentParser } from 'agent-task-compiler';

const llmParser: IntentParser = {
  name: 'gpt-4o',
  async parse(intent) {
    // ...call the model, return IntentIR
  },
};

await compileIntent({ intent: 'fix bug in auth.ts', parser: llmParser });
```

## Safety defaults

- Every destructive intent ships with `require-confirm` + `dry-run` restrictions.
- Secrets in intent trigger a `security-reviewer` role and a policy constraint.
- Production/migration intents require explicit approval.
- `strict: true` fails fast on low confidence.

## License

MIT
