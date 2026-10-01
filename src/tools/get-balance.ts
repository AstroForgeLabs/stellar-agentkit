/**
 * get-balance tool — queries XLM and SAC token balances for a Stellar account
 * via Horizon's /accounts/{id} endpoint.
 */

import { z } from 'zod';
import { Horizon } from '@stellar/stellar-sdk';
import type { AgentTool, AgentKitConfig, BalanceResult } from '../types.js';
import { HORIZON_URLS } from '../types.js';

export const GetBalanceInputSchema = z.object({
  accountId: z
    .string()
    .min(56)
    .max(56)
    .describe('The Stellar public key (G...) to query balances for.'),
});

export type GetBalanceInput = z.infer<typeof GetBalanceInputSchema>;

export const getBalanceTool: AgentTool<GetBalanceInput, BalanceResult> = {
  name: 'stellar_get_balance',
  description:
    'Get XLM and all SAC token balances for a Stellar account. Returns all asset balances including trustlines.',
  inputSchema: GetBalanceInputSchema,

  async execute(input, config): Promise<BalanceResult> {
    const horizonUrl = config.horizonUrl ?? HORIZON_URLS[config.network];
    const server = new Horizon.Server(horizonUrl);

    const account = await server.loadAccount(input.accountId);

    const balances = account.balances.map((b) => ({
      assetType: b.asset_type,
      assetCode: 'asset_code' in b ? b.asset_code : undefined,
      assetIssuer: 'asset_issuer' in b ? b.asset_issuer : undefined,
      balance: b.balance,
      limit: 'limit' in b ? b.limit : undefined,
    }));

    const xlmEntry = account.balances.find((b) => b.asset_type === 'native');
    const xlmBalance = xlmEntry?.balance ?? '0';

    return {
      accountId: input.accountId,
      network: config.network,
      balances,
      xlmBalance,
    };
  },
};
