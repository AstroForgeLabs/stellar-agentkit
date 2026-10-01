/**
 * StellarAgentKit — main entry point.
 *
 * Bundles all tools and exposes them as a structured toolkit compatible with
 * MCP servers, Vercel AI SDK, LangChain tool schemas, and OpenAI function calling.
 */

import type { AgentKitConfig, AgentTool } from './types.js';
import { getBalanceTool } from './tools/get-balance.js';
import { sendPaymentTool } from './tools/send-payment.js';
import { checkTrustlineTool } from './tools/check-trustline.js';
import { resolveSep1Tool } from './tools/resolve-sep1.js';

export class StellarAgentKit {
  private config: AgentKitConfig;
  private tools: Map<string, AgentTool>;

  constructor(config: Partial<AgentKitConfig> & { network?: AgentKitConfig['network'] }) {
    this.config = {
      network: config.network ?? 'testnet',
      secretKey: config.secretKey,
      horizonUrl: config.horizonUrl,
    };

    this.tools = new Map([
      [getBalanceTool.name, getBalanceTool],
      [sendPaymentTool.name, sendPaymentTool],
      [checkTrustlineTool.name, checkTrustlineTool],
      [resolveSep1Tool.name, resolveSep1Tool],
    ]);
  }

  /**
   * Returns all tools in MCP-compatible format (name, description, inputSchema).
   * Use this with Claude Desktop, Cursor, or any MCP server implementation.
   */
  getTools(): Array<{ name: string; description: string; inputSchema: object }> {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute a tool by name with a validated input payload.
   * Used by MCP server dispatch and AI SDK tool runners.
   */
  async executeTool(toolName: string, input: unknown): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: "${toolName}". Available: ${[...this.tools.keys()].join(', ')}`);
    }
    const parsed = tool.inputSchema.parse(input);
    return tool.execute(parsed as never, this.config);
  }

  /** Get the current network configuration. */
  getNetwork(): AgentKitConfig['network'] {
    return this.config.network;
  }

  /** Check if the kit has a signing key configured (needed for payments). */
  canSign(): boolean {
    return Boolean(this.config.secretKey);
  }
}

// Re-export types and individual tools for direct use
export * from './types.js';
export { getBalanceTool } from './tools/get-balance.js';
export { sendPaymentTool } from './tools/send-payment.js';
export { checkTrustlineTool } from './tools/check-trustline.js';
export { resolveSep1Tool } from './tools/resolve-sep1.js';
export type { GetBalanceInput } from './tools/get-balance.js';
export type { SendPaymentInput } from './tools/send-payment.js';
export type { CheckTrustlineInput } from './tools/check-trustline.js';
export type { ResolveSep1Input } from './tools/resolve-sep1.js';
