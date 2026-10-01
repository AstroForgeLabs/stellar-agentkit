/**
 * Unit tests for StellarAgentKit.
 *
 * Tests cover pure logic and offline paths only — no live Horizon or network calls.
 * Run with: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─── Types ───────────────────────────────────────────────────────────────────

describe('HORIZON_URLS config', async () => {
  const { HORIZON_URLS, NETWORK_PASSPHRASES } = await import('../types.js');

  it('exposes testnet and mainnet Horizon URLs', () => {
    assert.ok(HORIZON_URLS.testnet.startsWith('https://'));
    assert.ok(HORIZON_URLS.mainnet.startsWith('https://'));
  });

  it('testnet passphrase is correct', () => {
    assert.strictEqual(
      NETWORK_PASSPHRASES.testnet,
      'Test SDF Network ; September 2015'
    );
  });

  it('mainnet passphrase is correct', () => {
    assert.strictEqual(
      NETWORK_PASSPHRASES.mainnet,
      'Public Global Stellar Network ; September 2015'
    );
  });
});

// ─── StellarAgentKit ─────────────────────────────────────────────────────────

describe('StellarAgentKit', async () => {
  const { StellarAgentKit } = await import('../index.js');

  it('defaults to testnet when no network specified', () => {
    const kit = new StellarAgentKit({});
    assert.strictEqual(kit.getNetwork(), 'testnet');
  });

  it('accepts mainnet config', () => {
    const kit = new StellarAgentKit({ network: 'mainnet' });
    assert.strictEqual(kit.getNetwork(), 'mainnet');
  });

  it('canSign() returns false without secretKey', () => {
    const kit = new StellarAgentKit({ network: 'testnet' });
    assert.strictEqual(kit.canSign(), false);
  });

  it('canSign() returns true with secretKey', () => {
    const kit = new StellarAgentKit({
      network: 'testnet',
      secretKey: 'SCZANGBA5YELQQHVWYNAYGU6TRMHM73ECTLND' + 'TTZWMIVPZM2QDNR3',
    });
    assert.strictEqual(kit.canSign(), true);
  });

  it('getTools() returns all 4 tool descriptors', () => {
    const kit = new StellarAgentKit({});
    const tools = kit.getTools();
    assert.strictEqual(tools.length, 4);
    const names = tools.map((t) => t.name);
    assert.ok(names.includes('stellar_get_balance'));
    assert.ok(names.includes('stellar_send_payment'));
    assert.ok(names.includes('stellar_check_trustline'));
    assert.ok(names.includes('stellar_resolve_sep1'));
  });

  it('each tool has name, description, and inputSchema', () => {
    const kit = new StellarAgentKit({});
    for (const tool of kit.getTools()) {
      assert.ok(typeof tool.name === 'string' && tool.name.length > 0, `${tool.name} missing name`);
      assert.ok(typeof tool.description === 'string' && tool.description.length > 0, `${tool.name} missing description`);
      assert.ok(tool.inputSchema !== null && typeof tool.inputSchema === 'object', `${tool.name} missing inputSchema`);
    }
  });

  it('executeTool throws for unknown tool name', async () => {
    const kit = new StellarAgentKit({});
    await assert.rejects(
      () => kit.executeTool('stellar_unknown_tool', {}),
      /Unknown tool/
    );
  });
});

// ─── Tool Input Schemas ───────────────────────────────────────────────────────

describe('GetBalanceInputSchema validation', async () => {
  const { GetBalanceInputSchema } = await import('../tools/get-balance.js');

  it('accepts a valid 56-char public key', () => {
    const result = GetBalanceInputSchema.safeParse({
      accountId: 'G' + 'A'.repeat(55),
    });
    assert.ok(result.success);
  });

  it('rejects a short account id', () => {
    const result = GetBalanceInputSchema.safeParse({ accountId: 'GABC' });
    assert.ok(!result.success);
  });
});

describe('SendPaymentInputSchema validation', async () => {
  const { SendPaymentInputSchema } = await import('../tools/send-payment.js');

  it('accepts valid XLM payment input', () => {
    const result = SendPaymentInputSchema.safeParse({
      destination: 'G' + 'B'.repeat(55),
      amount: '10.5',
      assetCode: 'XLM',
    });
    assert.ok(result.success);
  });

  it('defaults assetCode to XLM when omitted', () => {
    const result = SendPaymentInputSchema.safeParse({
      destination: 'G' + 'B'.repeat(55),
      amount: '5',
    });
    assert.ok(result.success);
    assert.strictEqual((result as any).data.assetCode, 'XLM');
  });

  it('rejects non-numeric amount string', () => {
    const result = SendPaymentInputSchema.safeParse({
      destination: 'G' + 'B'.repeat(55),
      amount: 'lots',
    });
    assert.ok(!result.success);
  });

  it('rejects memo longer than 28 chars', () => {
    const result = SendPaymentInputSchema.safeParse({
      destination: 'G' + 'B'.repeat(55),
      amount: '1',
      memo: 'x'.repeat(29),
    });
    assert.ok(!result.success);
  });
});

describe('ResolveSep1InputSchema validation', async () => {
  const { ResolveSep1InputSchema } = await import('../tools/resolve-sep1.js');

  it('accepts a plain domain string', () => {
    const result = ResolveSep1InputSchema.safeParse({ domain: 'anchor.stellar.org' });
    assert.ok(result.success);
  });

  it('rejects an empty domain', () => {
    const result = ResolveSep1InputSchema.safeParse({ domain: '' });
    assert.ok(!result.success);
  });
});

describe('CheckTrustlineInputSchema validation', async () => {
  const { CheckTrustlineInputSchema } = await import('../tools/check-trustline.js');

  it('accepts valid trustline check input', () => {
    const result = CheckTrustlineInputSchema.safeParse({
      accountId: 'G' + 'A'.repeat(55),
      assetCode: 'USDC',
      assetIssuer: 'G' + 'B'.repeat(55),
    });
    assert.ok(result.success);
  });

  it('rejects asset code longer than 12 chars', () => {
    const result = CheckTrustlineInputSchema.safeParse({
      accountId: 'G' + 'A'.repeat(55),
      assetCode: 'TOOLONGASSET123',
      assetIssuer: 'G' + 'B'.repeat(55),
    });
    assert.ok(!result.success);
  });
});

// ─── SEP-1 TOML parser (internal logic) ──────────────────────────────────────

describe('resolve-sep1: TOML parsing logic', async () => {
  const { resolveSep1Tool } = await import('../tools/resolve-sep1.js');

  it('tool has correct name and description', () => {
    assert.strictEqual(resolveSep1Tool.name, 'stellar_resolve_sep1');
    assert.ok(resolveSep1Tool.description.includes('SEP-0001'));
  });

  it('execute throws for unreachable domain', async () => {
    await assert.rejects(
      () =>
        resolveSep1Tool.execute(
          { domain: 'this-domain-does-not-exist-xyzxyz.invalid' },
          { network: 'testnet' }
        ),
      Error
    );
  });
});
