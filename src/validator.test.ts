import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContract, assertValidContract } from './validator.js';
import { compileIntent } from './compiler.js';

test('valid contract passes', async () => {
  const c = await compileIntent({ intent: 'fix bug in app.ts' });
  assert.deepEqual(validateContract(c).errors, []);
});

test('missing field fails', () => {
  const bad = { version: '1.0', intent: 'x' };
  const r = validateContract(bad);
  assert.equal(r.valid, false);
  assert.ok(r.errors.length > 0);
});

test('assertValidContract throws on bad contract', () => {
  assert.throws(() => assertValidContract({ version: '1.0' }), /Invalid AgentContract/);
});
