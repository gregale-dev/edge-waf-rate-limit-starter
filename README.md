# Pre-Wake Edge WAF, Bot Challenge, Rate Limits & Spend Caps

[![Deploy on Gregale](https://gregale.dev/deploy-badge.svg)](https://gregale.dev/deploy?repo=https://github.com/gregale-dev/edge-waf-rate-limit-starter)

Block SQLi/XSS probes, credential stuffing, and unverified scrapers **at the
edge before waking a MicroVM** (`$0` compute on rejected traffic), cache catalog
reads declaratively, replay traffic scenarios offline/live with `gregale edge rule trace`,
and backstop everything with hard monthly spend caps and preview budgets.

See [Pre-wake WAF & edge security](https://gregale.dev/features/edge-security)
and [Hard spend caps](https://gregale.dev/features/strict-budgets).

## What is inside

- [src/app.js](./src/app.js): sample API with `/catalog` (`Cache-Control` + edge
  cache rule), `/search`, and `/login` (returns `401` on invalid credentials for
  failure-only composite throttling).
- [traces/](./traces): reusable version-1 scenarios (`normal-catalog.json`,
  `sqli-probe.json`, `scraper-search.json`, `login-bruteforce.json`) for
  `gregale edge rule trace --config`.
- [rules/](./rules): proposed edge-rule JSON files (`challenge-scrapers.json`,
  `throttle-login.json`, `cache-catalog.json`) formatted for
  `gregale edge rule trace --add-rule @rules/<file>.json`.
- [budget.json](./budget.json): monitored `stop_previews` budget spec for
  `gregale billing budgets create --file budget.json`.
- [scripts/apply-edge-rules.sh](./scripts/apply-edge-rules.sh): provisions the
  full edge stack (including in-path OWASP CRS `kind=waf`) on any deployed app.

## Run locally

```sh
npm test
npm start
```

## Trace before enforcing

Dry-run any trace scenario with proposed rules before changing live edge traffic:

```sh
gregale edge rule trace --config traces/scraper-search.json --add-rule @rules/challenge-scrapers.json
gregale edge rule trace --config traces/login-bruteforce.json --add-rule @rules/throttle-login.json
gregale edge rule trace --config traces/normal-catalog.json --add-rule @rules/cache-catalog.json
```

> **Tip:** Replace `"app": "edge-shield-demo"` and the request URL hosts inside
> `traces/*.json` with your own app slug / `<app>.gregale.app` hostname before running
> live traces. WAF (`kind=waf`) is configured via `gregale edge rule create --kind waf`
> (see [scripts/apply-edge-rules.sh](./scripts/apply-edge-rules.sh)).

## Deploy & apply rules

```sh
gregale deploy --name edge-shield-demo --size small
chmod +x scripts/apply-edge-rules.sh
./scripts/apply-edge-rules.sh edge-shield-demo
```

Plan availability:
- **Free+**: `throttle` (rate limits), `ip`, `geo`, `validate`, `limit`, hard allowance limits.
- **Hobby+**: `challenge` (proof-of-work bot defense), `cache`, `jwt`, `async`, default hard monthly overage spend cap (`gregale billing spend-cap 1000`).
- **Pro+**: `waf` (in-path OWASP Core Rule Set inspection and blocking).

To roll back edge rules cleanly to an earlier version:

```sh
gregale edge rule history --app edge-shield-demo
gregale edge rule rollback --app edge-shield-demo --to <version>
```

## Guides

On [gregale.dev](https://gregale.dev):

- [How to rate-limit an API per IP without writing code](https://gregale.dev/articles/rate-limit-api-per-ip-without-code)
- [How to stop bot traffic cloud bill shock without taking your site down](https://gregale.dev/articles/stop-bot-traffic-cloud-bill-shock)
- [Hard cloud spend caps that actually stop runaway bills](https://gregale.dev/articles/hard-cloud-spend-caps)
- [Programmable edge rules and replayable trace testing without Nginx or Cloudflare](https://gregale.dev/articles/edge-rules-rate-limiting-trace-testing)

## License

MIT — see [LICENSE](./LICENSE).
