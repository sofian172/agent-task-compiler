import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileIntent } from './compiler.js';
import { validateContract } from './validator.js';

test('migrate intent produces data-guardian + rollback criterion', async () => {
  const c = await compileIntent({ intent: 'migrate database schema migration for users.ts and orders.ts' });
  assert.ok(c.roles.some((r) => r.name === 'data-guardian'));
  assert.ok(c.successCriteria.some((s) => /rollback/i.test(s.description)));
  assert.ok(c.verification.some((v) => v.command?.includes('migrate')));
  assert.equal(validateContract(c).valid, true);
});

test('delete intent requires confirm + dry-run', async () => {
  const c = await compileIntent({ intent: 'delete legacy module old.ts' });
  const remover = c.roles.find((r) => r.name === 'remover');
  assert.ok(remover?.restrictions.includes('require-confirm'));
  assert.ok(remover?.restrictions.includes('dry-run'));
  assert.equal(validateContract(c).valid, true);
});

test('allowedTools filters tools', async () => {
  const c = await compileIntent({ intent: 'fix bug in auth.ts', allowedTools: ['read_file'] });
  assert.ok(c.tools.every((t) => t.name === 'read_file'));
});

test('secrets hint adds security-reviewer + constraint', async () => {
  const c = await compileIntent({ intent: 'update password handling in auth.ts' });
  assert.ok(c.roles.some((r) => r.name === 'security-reviewer'));
  assert.ok(c.constraints.some((k) => k.kind === 'policy'));
});

test('strict mode throws on low confidence', async () => {
  await assert.rejects(
    () => compileIntent({ intent: 'do something', strict: true }),
    /Low confidence/
  );
});

test('output validates against JSON Schema', async () => {
  const c = await compileIntent({ intent: 'refactor utils.ts' });
  const result = validateContract(c);
  assert.equal(result.valid, true, result.errors.join('; '));
});
