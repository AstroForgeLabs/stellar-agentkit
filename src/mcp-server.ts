#!/usr/bin/env node

import { pathToFileURL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { z } from 'zod';
import { StellarAgentKit } from './index.js';

export function createMcpServer(kit: StellarAgentKit): Server {
  const server = new Server(
    { name: 'stellar-agentkit', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: kit.getTools().map((tool): Tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema as z.ZodTypeAny, {
        target: 'jsonSchema7',
      }) as Tool['inputSchema'],
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await kit.executeTool(request.params.name, request.params.arguments ?? {});
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: error instanceof Error ? error.message : String(error),
        }],
      };
    }
  });

  return server;
}

export async function runMcpServer(): Promise<void> {
  const kit = new StellarAgentKit({
    network: process.env.STELLAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet',
    secretKey: process.env.STELLAR_SECRET_KEY,
    horizonUrl: process.env.HORIZON_RPC_URL,
  });
  await createMcpServer(kit).connect(new StdioServerTransport());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runMcpServer().catch((error) => {
    console.error('Failed to start Stellar AgentKit MCP server:', error);
    process.exitCode = 1;
  });
}
