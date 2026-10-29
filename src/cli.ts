#!/usr/bin/env node
import { compileIntent } from './compiler.js';
import { validateContract } from './validator.js';

const args = process.argv.slice(2);
if (!args.length || args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage: agent-task-compiler "<intent>" [--tools a,b,c] [--strict] [--validate]`);
  console.log(`Example: agent-task-compiler "migrate database schema for users.ts and orders.ts"`);
  process.exit(0);
}

const intent = args[0];
const toolsIdx = args.indexOf('--tools');
const allowedTools = toolsIdx >= 0 ? args[toolsIdx + 1].split(',') : undefined;
const strict = args.includes('--strict');
const doValidate = args.includes('--validate');

compileIntent({ intent, allowedTools, strict })
  .then((contract) => {
    const payload: Record<string, unknown> = { contract };
    if (doValidate) payload.validation = validateContract(contract);
    process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  })
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
