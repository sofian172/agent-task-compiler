import Ajv from 'ajv';
import * as addFormatsNS from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// `ajv-formats` ships as CommonJS; under NodeNext + esModuleInterop the
// callable plugin can land either on the namespace or on `.default`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats: (ajv: any, opts?: any) => any =
  (addFormatsNS as any).default ?? (addFormatsNS as any);

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, 'schema', 'contract.schema.json');
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ajv = new (Ajv as any)({ allErrors: true });
addFormats(ajv);
const validateFn = ajv.compile(schema);

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateContract(contract: unknown): ValidationResult {
  const valid = validateFn(contract) as boolean;
  return {
    valid,
    errors: valid ? [] : ((validateFn.errors ?? []) as Array<{ instancePath?: string; message?: string }>).map(
      (e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`
    ),
  };
}

export function assertValidContract(contract: unknown): asserts contract is Record<string, unknown> {
  const result = validateContract(contract);
  if (!result.valid) {
    throw new Error(`Invalid AgentContract:\n- ${result.errors.join('\n- ')}`);
  }
}
