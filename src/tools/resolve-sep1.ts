/**
 * resolve-sep1 tool — fetches and parses a domain's stellar.toml file
 * (SEP-0001) to discover anchor metadata, signing keys, SEP-24 endpoints,
 * supported currencies, and documentation fields.
 */

import { z } from 'zod';
import type { AgentTool, AgentKitConfig, Sep1Result } from '../types.js';

export const ResolveSep1InputSchema = z.object({
  domain: z
    .string()
    .min(1)
    .describe(
      'The domain to fetch stellar.toml from, e.g. "anchor.example.com". Do not include https:// or paths.'
    ),
});

export type ResolveSep1Input = z.infer<typeof ResolveSep1InputSchema>;

/** Naive TOML key=value parser — sufficient for stellar.toml flat fields. */
function parseToml(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Extract [[CURRENCIES]] array entries from raw TOML text. */
function parseCurrencies(raw: string): Array<Record<string, string>> {
  const currencies: Array<Record<string, string>> = [];
  const sections = raw.split('[[CURRENCIES]]');
  for (let i = 1; i < sections.length; i++) {
    const block = sections[i].split('[[')[0]; // stop at next [[...]] block
    currencies.push(parseToml(block));
  }
  return currencies;
}

/** Extract [[VALIDATORS]] array entries from raw TOML text. */
function parseValidators(raw: string): Array<Record<string, string>> {
  const validators: Array<Record<string, string>> = [];
  const sections = raw.split('[[VALIDATORS]]');
  for (let i = 1; i < sections.length; i++) {
    const block = sections[i].split('[[')[0];
    validators.push(parseToml(block));
  }
  return validators;
}

export const resolveSep1Tool: AgentTool<ResolveSep1Input, Sep1Result> = {
  name: 'stellar_resolve_sep1',
  description:
    'Fetch and parse a stellar.toml file (SEP-0001) from a domain to discover signing keys, SEP-24 anchor endpoints, supported assets, and network metadata.',
  inputSchema: ResolveSep1InputSchema,

  async execute(input, _config): Promise<Sep1Result> {
    const cleanDomain = input.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const tomlUrl = `https://${cleanDomain}/.well-known/stellar.toml`;

    const response = await fetch(tomlUrl, {
      headers: { Accept: 'text/plain,text/toml,*/*' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch stellar.toml from ${tomlUrl}: HTTP ${response.status}`);
    }

    const raw = await response.text();
    const flat = parseToml(raw);

    // Find SEP-24 transfer server from TOML
    const sep24Endpoint = flat['TRANSFER_SERVER_SEP0024'] ?? flat['TRANSFER_SERVER'];

    return {
      domain: cleanDomain,
      tomlUrl,
      raw,
      parsed: {
        networkPassphrase: flat['NETWORK_PASSPHRASE'],
        horizonUrl: flat['HORIZON_URL'],
        signingKey: flat['SIGNING_KEY'],
        accounts: flat['ACCOUNTS']
          ? flat['ACCOUNTS'].replace(/[\[\]"'\s]/g, '').split(',').filter(Boolean)
          : undefined,
        documentation: flat['org_name']
          ? {
              org_name: flat['ORG_NAME'] ?? flat['org_name'] ?? '',
              org_url: flat['ORG_URL'] ?? '',
              org_description: flat['ORG_DESCRIPTION'] ?? '',
            }
          : undefined,
        currencies: parseCurrencies(raw),
        validators: parseValidators(raw),
        sep24Endpoint,
      },
    };
  },
};
