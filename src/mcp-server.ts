#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { compileIntent } from './compiler.js';
import { validateContract } from './validator.js';

const server = new Server(
  { name: 'agent-task-compiler', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'compile_intent',
      description:
        'Compile a natural-language agent task into a verifiable JSON Agent Contract with roles, tools, success criteria, constraints, and verification steps.',
      inputSchema: {
        type: 'object',
        required: ['intent'],
        properties: {
          intent: { type: 'string', description: 'Natural language task description.' },
          allowedTools: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional whitelist of tool names to restrict output.',
          },
          strict: {
            type: 'boolean',
            description: 'If true, fails when confidence is below 0.6.',
          },
          context: {
            type: 'object',
            properties: {
              repo: { type: 'string' },
              domain: { type: 'string' },
              files: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    {
      name: 'validate_contract',
      description: 'Validate an existing AgentContract object against the JSON Schema.',
      inputSchema: {
        type: 'object',
        required: ['contract'],
        properties: { contract: { type: 'object' } },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;

  if (name === 'compile_intent') {
    const input = args as {
      intent: string;
      allowedTools?: string[];
      strict?: boolean;
      context?: { repo?: string; domain?: string; files?: string[] };
    };
    const contract = await compileIntent(input);
    const check = validateContract(contract);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ contract, validation: check }, null, 2),
        },
      ],
    };
  }

  if (name === 'validate_contract') {
    const { contract } = args as { contract: unknown };
    const result = validateContract(contract);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
