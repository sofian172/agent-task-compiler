export type Role = {
  name: string;
  capabilities: string[];
  restrictions: string[];
  model?: string;
};

export type ToolSpec = {
  name: string;
  args: Record<string, unknown>;
  required: boolean;
};

export type SuccessCriterion = {
  id: string;
  description: string;
  check: 'automated' | 'manual' | 'llm-judge';
};

export type Constraint = {
  kind: 'scope' | 'safety' | 'resource' | 'policy';
  description: string;
};

export type VerificationStep = {
  step: string;
  command?: string;
  expects?: string;
};

export type AgentContract = {
  version: '1.0';
  intent: string;
  roles: Role[];
  tools: ToolSpec[];
  successCriteria: SuccessCriterion[];
  constraints: Constraint[];
  verification: VerificationStep[];
  metadata: {
    compiledAt: string;
    parser: string;
    confidence: number;
  };
};

export type CompileOptions = {
  intent: string;
  context?: { repo?: string; domain?: string; files?: string[] };
  allowedTools?: string[];
  strict?: boolean;
  parser?: IntentParser;
};

export type IntentIR = {
  action: string;
  targets: string[];
  objects: string[];
  scope: string[];
  riskHints: string[];
  raw: string;
};

export interface IntentParser {
  name: string;
  parse(intent: string, context?: CompileOptions['context']): IntentIR | Promise<IntentIR>;
}
