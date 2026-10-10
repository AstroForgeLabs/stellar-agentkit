# Stellar Wave — Application Package

Everything `AstroForgeLabs/stellar-agentkit` needs to be accepted as a
maintainer repo in the Stellar Wave Program on Drips, and to run it well.

---

## 1. Application checklist (human steps only you can do)

- [ ] **Repo is Public** — confirm in GitHub → Settings. (`stellar-agentkit` is already public.)
- [ ] **Set your Ethereum address** in [`FUNDING.json`](./FUNDING.json).
- [ ] **Claim the project on Drips** — [drips.network](https://drips.network) → connect wallet → Projects → **Claim**. Drips reads `FUNDING.json` and verifies the wallet you connect owns that address.
- [ ] **Install the Drips Wave GitHub App** on the `AstroForgeLabs` org (read/write on issues, labels, PRs). Only needed for the org hosting the repo.
- [ ] **Create the complexity labels** (see §3).
- [ ] **File the six issues** from §4 and apply one `complexity:*` label + `drips-wave` to each.
- [ ] **Apply to the Stellar Wave Program** on the Drips Wave app: **Maintainers → Orgs and Repos** → sync the repo → **Apply** to the Stellar program, and wait for approval.
- [ ] **Complete KYC / identity verification** on Drips (required before rewards can be distributed).

> If the application is rejected, appeal from **Maintainers → Orgs and Repos**
> (first appeal 2 weeks after rejection; up to 3 appeals; must show substantive change).

---

## 2. FUNDING.json

`FUNDING.json` at the repo root declares the wallet that owns the project:

```json
{ "drips": { "ethereum": { "ownedBy": "0xYOUR_ETHEREUM_ADDRESS" } } }
```

Drips uses this to verify you are the legitimate maintainer when you claim the
project. If a future Wave settles on another chain, add that network:

```json
{
  "drips": {
    "ethereum": { "ownedBy": "0x..." },
    "optimism": { "ownedBy": "0x..." }
  }
}
```

---

## 3. Complexity labels

Create these in GitHub → Issues → Labels (or with the GitHub CLI):

```bash
gh label create "complexity: trivial" --color BFE9F0 --description "Drips Wave — small, well-bounded task"
gh label create "complexity: medium"  --color D7F94B --description "Drips Wave — moderate scope, some design"
gh label create "complexity: high"    --color FF8A3C --description "Drips Wave — large or cross-cutting task"
gh label create "drips-wave"          --color 6C4DF6 --description "Tracked in a Drips Wave program"
gh label create "good first issue"    --color 0E8A16 --description "Good entry point for new contributors"
```

Rules that matter once you're approved:

- Apply **exactly one** `complexity:*` label per issue, plus `drips-wave`.
- Issues added via the `drips-wave` GitHub label are treated as **Trivial (100 pts)**.
  To raise a task to Medium (150) or High (200), set the complexity in the
  Drips app: **Maintainers → Issues**.
- The Wave runs 1 week/month. Review applications **daily** and assign fast.
- Mark issues **Resolved before the Wave ends** so contributors earn points.

---

## 4. Bounty queue (ready to paste)

Each issue is scoped to the existing codebase with explicit acceptance criteria.
Assign labels as noted in each issue.

### Issue 1 — `good first issue`, `complexity: trivial`
**Title: Add SECURITY.md and a responsible-disclosure note**
- Add `SECURITY.md` documenting how to privately report a vulnerability
  (e.g. `STELLAR_SECRET_KEY` misuse, network abuse).
- Add a short "Security" section to `README.md` warning operators not to place
  funds this tool signs into unsafe agent environments, and to prefer
  read-only tools for untrusted prompts.
- Acceptance: `SECURITY.md` exists; README security section renders; README links to `SECURITY.md`.

### Issue 2 — `complexity: medium`
**Title: get-balance and check-trustline should distinguish missing accounts from query errors**
- `get-balance` currently lets `loadAccount` throw raw (ugly `exception_occurred` flashes
  reach the agent). `check-trustline` swallows every error and returns
  `hasTrustline: false`, conflating "account doesn't exist" with "no trustline".
- Add an `accountExists: boolean` to `TrustlineResult` (and appropriate error
  handling in `BalanceResult`), returning a clear, structured result instead of
  throwing for the common `G...` account-does-not-exist case.
- Acceptance: unit tests cover (a) 404/Not Found account, (b) existing account
  without the trustline, (c) existing account with the trustline; `npm test` and
  `npm run typecheck` pass.

### Issue 3 — `complexity: medium`
**Title: Validate AgentKit config at construction time**
- `AgentKitConfig` fields are only validated when tools run. A typo like
  `network: "TestNet"` or a malformed `horizonUrl` fails somewhere opaque later.
- Validate `network` against `'testnet' | 'mainnet'`, reject invalid `horizonUrl`
  values, and only accept `secretKey` strings that decrypt with
  `Keypair.fromSecret`.
- Acceptance: `new StellarAgentKit(...)` throws clear errors for invalid config;
  tests added for each invalid case; `npm test` + `npm run typecheck` pass.

### Issue 4 — `complexity: high`
**Title: Implement a real MCPServer (stdio) that exposes the four tools**
- The README advertises "MCP Server Integration", but the package only returns
  MCP-shaped descriptors via `getTools()`; there's no MCP server yet.
- Add a `serve-mcp` entry (`src/mcp/server.ts`) using the official
  `@modelcontextprotocol/sdk` that registers `stellar_get_balance`,
  `stellar_send_payment`, `stellar_check_trustline`, `stellar_resolve_sep1`
  over stdio, reads `STELLAR_NETWORK` / `STELLAR_SECRET_KEY` from the
  environment, and wires `executeTool` to each call.
- Update `package.json` (`bin`, script), README ("Run as an MCP server for
  Claude Desktop / Cursor"), and add a smoke test that boots the server,
  calls `tools/list`, and invokes one read-only tool.
- Acceptance: `npm run serve-mcp` starts and serves `tools/list` + a tool call
  against testnet; typecheck and tests pass; docs updated.

### Issue 5 — `complexity: high`
**Title: Harden the SEP-1 TOML parser and add [ORG] / nested array support**
- `resolve-sep1` uses a naive line parser (`/^key=value/`) that mis-parses:
  inline comments, quoted keys, multi-line and bracketed values, and array-of-objects
  fields like `[[DOCUMENTATION]]`. Currencies/validators are split on regex and
  miss nested fields (e.g. `is_asset_anchored`, `anchor_asset_type`, `redemption_instructions`).
- Replace with a small, tested TOML subset parser (or a maintained zero-dep
  TOML parser) that handles sections, arrays-of-tables, quoted strings, and inline
  comments; enrich `Sep1Result.parsed` with `org`, `documentation`, and full
  currency/validator objects.
- Acceptance: parsing fixtures cover flat keys, `[ORG]` section,
  `[[CURRENCIES]]` with nested keys, quoted strings and comments; all existing
  tests still pass; `npm test` + `npm run typecheck` pass.

### Issue 6 — `complexity: medium`
**Title: SEP-24 transfer-server metadata tool**
- README promises "resolving anchor deposit/withdrawal endpoints (SEP-24 / SEP-31)",
  but no tool consumes the `TRANSFER_SERVER_SEP0024_URL` the resolver discovers.
- Add `stellar_sep24_info` that takes a domain (or a `sep1Url`), resolves
  `stellar.toml`, reads `TRANSFER_SERVER_SEP0024_URL`, fetches the
  `GET /info` response, and returns supported assets + deposit/withdraw fields.
- Acceptance: tool exists in `getTools()`, has Zod schema + unit tests (mocked
  fetch), typecheck and `npm test` pass.

---

## 5. Suggested application answers

See this file's companion notes in the Wave application form:
- **"We plan to add issues related to..."** — the six issues above (features,
  hardening, tests, MCP server, SEP-24 support, docs).
- **Resource links** — repo, README, Actions/CI, Drips Wave page, Stellar docs,
  `stellar-sdk` repo, org page.

## 6. Requirements

- Node.js 22 (LTS) — see `.github/workflows/ci.yml`.
- `npm ci && npm test`