/**
 * check-trustline tool — verifies whether a Stellar account has an active
 * trustline for a given SAC token and returns the current balance and limit.
 */

import { z } from 'zod';
import { Horizon } from '@stellar/stellar-sdk';
import type { AgentTool, AgentKitConfig, TrustlineResult } from '../types.js';
import { HORIZON_URLS } from '../types.js';

export const CheckTrustlineInputSchema = z.object({
  accountId: z
    .string()
    .min(56)
    .max(56)
    .describe('Stellar public key (G...) of the account to check.'),
  assetCode: z
    .string()
    .min(1)
    .max(12)
    .describe('Asset code to check trustline for, e.g. "USDC".'),
  assetIssuer: z
    .string()
    .min(56)
    .max(56)
    .describe('Issuer public key of the asset.'),
});

export type CheckTrustlineInput = z.infer<typeof CheckTrustlineInputSchema>;

export const checkTrustlineTool: AgentTool<CheckTrustlineInput, TrustlineResult> = {
  name: 'stellar_check_trustline',
  description:
    'Check if a Stellar account has an active trustline for a specific SAC token asset. Returns balance and limit if the trustline exists.',
  inputSchema: CheckTrustlineInputSchema,

  async execute(input, config): Promise<TrustlineResult> {
    const horizonUrl = config.horizonUrl ?? HORIZON_URLS[config.network];
    const server = new Horizon.Server(horizonUrl);

    try {
      const account = await server.loadAccount(input.accountId);

      const trustline = account.balances.find(
        (b) =>
          b.asset_type !== 'native' &&
          'asset_code' in b &&
          b.asset_code === input.assetCode &&
          'asset_issuer' in b &&
          b.asset_issuer === input.assetIssuer
      );

      if (!trustline) {
        return {
          accountId: input.accountId,
          assetCode: input.assetCode,
          assetIssuer: input.assetIssuer,
          hasTrustline: false,
        };
      }

      return {
        accountId: input.accountId,
        assetCode: input.assetCode,
        assetIssuer: input.assetIssuer,
        hasTrustline: true,
        balance: trustline.balance,
        limit: 'limit' in trustline ? trustline.limit : undefined,
      };
    } catch (err) {
      return {
        accountId: input.accountId,
        assetCode: input.assetCode,
        assetIssuer: input.assetIssuer,
        hasTrustline: false,
      };
    }
  },
};
