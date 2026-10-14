import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StellarAgentKit } from '../index.js';
import { createMcpServer } from '../mcp-server.js';

describe('MCP server', () => {
  it('lists every AgentKit tool with a JSON schema', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer(new StellarAgentKit({}));
    const client = new Client({ name: 'test-client', version: '1.0.0' });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.listTools();
      assert.strictEqual(result.tools.length, 4);
      assert.ok(result.tools.every((tool) => tool.inputSchema.type === 'object'));
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('returns a protocol error result for an unknown tool', async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createMcpServer(new StellarAgentKit({}));
    const client = new Client({ name: 'test-client', version: '1.0.0' });

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const result = await client.callTool({ name: 'stellar_missing', arguments: {} });
      assert.strictEqual(result.isError, true);
      assert.match((result.content[0] as { text: string }).text, /Unknown tool/);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
