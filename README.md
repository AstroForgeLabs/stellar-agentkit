# Stellar AgentKit

[![CI](https://github.com/SmartCraftGroup/stellar-agentkit/actions/workflows/ci.yml/badge.svg)](https://github.com/SmartCraftGroup/stellar-agentkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.0-blue.svg)](https://www.typescriptlang.org/)
[![Drips Wave](https://img.shields.io/badge/Drips-Stellar%20Wave-blue.svg)](https://drips.network)

**Stellar AgentKit** is a modular Model Context Protocol (MCP) server and AI SDK toolkit that enables AI agents (Claude, OpenAI GPTs, LangChain, Vercel AI SDK) to autonomously execute Stellar payments, query network state, parse `stellar.toml` metadata (SEP-0001), and interact with off-chain Stellar Anchors (SEP-0024 / SEP-0031).

---

## Why Stellar AgentKit Exists

While AI agent frameworks exist for Ethereum and Solana (such as Coinbase AgentKit), the Stellar ecosystem has lacked a plug-and-play toolkit for LLM agents to interact with Horizon RPCs and SEP payment rails. 

`stellar-agentkit` bridges this gap by exposing type-safe, structured MCP tools that allow AI assistants to perform micropayments, check account balances, verify trustlines, and execute cross-border remittance flows without requiring custom smart contract logic.

---

## Key Features

- **MCP Server Integration:** Exposes standard Model Context Protocol (MCP) tools for instant integration with Claude Desktop, Cursor, and custom agentic pipelines.
- **Payment & Balance Operations:** Enables agents to query XLM and SAC token balances, check active trustlines, and execute single or batch payment operations.
- **SEP Standard Automation:** Built-in tools for parsing `stellar.toml` (SEP-1) domain metadata and resolving anchor deposit/withdrawal endpoints (SEP-24 / SEP-31).
- **Type-Safe SDK:** Built with TypeScript and `@stellar/stellar-sdk` with full Zod schema validation for all tool inputs.

---

## Architecture Overview

```
                  +--------------------------+
                  |  AI Agent (Claude/GPT-4)  |
                  +------------+-------------+
                               | (MCP Protocol / JSON-RPC)
                               v
                  +--------------------------+
                  |    stellar-agentkit      |
                  |       (MCP Server)       |
                  +------------+-------------+
                               |
        +----------------------+----------------------+
        |                      |                      |
        v                      v                      v
+---------------+      +---------------+      +---------------+
|  Horizon RPC  |      | SEP-0001 TOML |      | SEP-24 / 31   |
| (Balance/Tx)  |      |   (Resolver)  |      | (Anchor API)  |
+---------------+      +---------------+      +---------------+
```

---

## Quickstart & Installation

### 1. Install via npm
```bash
npm install @stellar-agentkit/core
```

### 2. Basic Usage (Vercel AI SDK Example)
```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { StellarAgentKit } from "@stellar-agentkit/core";

const kit = new StellarAgentKit({
  secretKey: process.env.STELLAR_SECRET_KEY,
  network: "testnet", // or "mainnet"
});

const result = await generateText({
  model: openai("gpt-4o"),
  tools: kit.getTools(),
  prompt: "Check the XLM balance of GABC... and send 10 XLM if balance > 50",
});

console.log(result.text);
```

---

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `STELLAR_SECRET_KEY` | Optional | Private key for signing payments initiated by agent | `S...` |
| `STELLAR_NETWORK` | Required | Target network (`testnet` or `mainnet`) | `testnet` |
| `HORIZON_RPC_URL` | Optional | Custom Horizon RPC endpoint URL | `https://horizon-testnet.stellar.org` |

---

## Maintainers & Contact

| Maintainer | Role | Contact |
|---|---|---|
| **Abdulmalik Ojo** (`@tecmalik`) |  Maintainer | [abdulmalikojo2@gmail.com](mailto:abdulmalikojo2@gmail.com) |
| **Hikmah Oladele** (`@Hikmaholadele`) | Maintainer | [edit@gmail.com](mailto:edit@gmail.com) |
---

## License

MIT — see [`LICENSE`](./LICENSE).
