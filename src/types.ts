/**
 * Core types shared across all stellar-agentkit tools.
 */

import { z } from 'zod';

export type StellarNetwork = 'testnet' | 'mainnet';

export const HORIZON_URLS: Record<StellarNetwork, string> = {
  testnet: 'https://horizon-testnet.stellar.org',
  mainnet: 'https://horizon.stellar.org',
};

export const NETWORK_PASSPHRASES: Record<StellarNetwork, string> = {
  testnet: 'Test SDF Network ; September 2015',
  mainnet: 'Public Global Stellar Network ; September 2015',
};

/** A single MCP-compatible tool descriptor. */
export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  // ZodTypeAny avoids incompatibilities with ZodDefault, ZodOptional wrappers
  inputSchema: z.ZodTypeAny;
  execute(input: TInput, config: AgentKitConfig): Promise<TOutput>;
}

/** Config passed into StellarAgentKit. */
export interface AgentKitConfig {
  /** 'testnet' or 'mainnet'. Defaults to 'testnet'. */
  network: StellarNetwork;
  /** Secret key for signing payments. Optional for read-only tools. */
  secretKey?: string;
  /** Override the default Horizon URL. */
  horizonUrl?: string;
}

/** Standard account balance entry from Horizon. */
export interface AssetBalance {
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
  limit?: string;
}

/** Result returned by the get-balance tool. */
export interface BalanceResult {
  accountId: string;
  network: StellarNetwork;
  balances: AssetBalance[];
  xlmBalance: string;
}

/** Result returned by the send-payment tool. */
export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  ledger?: number;
  fee?: string;
  error?: string;
}

/** Result returned by the resolve-sep1 tool. */
export interface Sep1Result {
  domain: string;
  tomlUrl: string;
  raw: string;
  parsed: {
    networkPassphrase?: string;
    horizonUrl?: string;
    signingKey?: string;
    accounts?: string[];
    documentation?: Record<string, string>;
    currencies?: Array<Record<string, string>>;
    validators?: Array<Record<string, string>>;
    sep24Endpoint?: string;
  };
}

/** Result returned by the check-trustline tool. */
export interface TrustlineResult {
  accountId: string;
  assetCode: string;
  assetIssuer: string;
  hasTrustline: boolean;
  balance?: string;
  limit?: string;
}
