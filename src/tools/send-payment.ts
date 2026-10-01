/**
 * send-payment tool — signs and submits a Stellar payment using the configured
 * secret key. Supports XLM (native) and SAC token payments.
 */

import { z } from 'zod';
import {
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Keypair,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import type { AgentTool, AgentKitConfig, PaymentResult } from '../types.js';
import { HORIZON_URLS, NETWORK_PASSPHRASES } from '../types.js';

export const SendPaymentInputSchema = z.object({
  destination: z
    .string()
    .min(56)
    .max(56)
    .describe('The recipient Stellar public key (G...).'),
  amount: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Amount must be a positive decimal string')
    .describe('Amount to send as a decimal string, e.g. "10.5".'),
  assetCode: z
    .string()
    .default('XLM')
    .describe('Asset code to send. Use "XLM" for native lumens. Default: "XLM".'),
  assetIssuer: z
    .string()
    .optional()
    .describe('Asset issuer public key. Required for non-XLM assets.'),
  memo: z
    .string()
    .max(28)
    .optional()
    .describe('Optional text memo (max 28 chars).'),
});

export type SendPaymentInput = z.infer<typeof SendPaymentInputSchema>;

export const sendPaymentTool: AgentTool<SendPaymentInput, PaymentResult> = {
  name: 'stellar_send_payment',
  description:
    'Send an XLM or SAC token payment on the Stellar network. Requires STELLAR_SECRET_KEY to be configured.',
  inputSchema: SendPaymentInputSchema,

  async execute(input, config): Promise<PaymentResult> {
    if (!config.secretKey) {
      return {
        success: false,
        error: 'STELLAR_SECRET_KEY is not configured. Cannot sign payments.',
      };
    }

    const horizonUrl = config.horizonUrl ?? HORIZON_URLS[config.network];
    const networkPassphrase = NETWORK_PASSPHRASES[config.network];
    const server = new Horizon.Server(horizonUrl);

    try {
      const keypair = Keypair.fromSecret(config.secretKey);
      const sourceAccount = await server.loadAccount(keypair.publicKey());

      const asset =
        input.assetCode === 'XLM'
          ? Asset.native()
          : new Asset(input.assetCode, input.assetIssuer!);

      const txBuilder = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase,
      })
        .addOperation(
          Operation.payment({
            destination: input.destination,
            asset,
            amount: input.amount,
          })
        )
        .setTimeout(30);

      if (input.memo) {
        txBuilder.addMemo({ type: 'text', value: input.memo } as any);
      }

      const tx = txBuilder.build();
      tx.sign(keypair);

      const result = await server.submitTransaction(tx);

      return {
        success: true,
        transactionHash: result.hash,
        ledger: result.ledger,
        fee: tx.fee.toString(),
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  },
};
