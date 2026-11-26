# Agent instructions

This project runs on Gregale (https://gregale.dev) with pre-wake Edge Rules,
OWASP WAF, proof-of-work bot challenges, and hard spend caps.

## Overview
- Entrypoint: `src/server.js` (routes in `src/app.js`)
- Edge traces: `traces/*.json` (version 1 format for `gregale edge rule trace --config`)
- Rule setup script: `scripts/apply-edge-rules.sh`
- Budget spec: `budget.json` (`gregale billing budgets create --file budget.json`)
- Tests: `node --test`

## Edge & budget safety workflow
1. Always test edge changes with `gregale --non-interactive --json edge rule trace --config traces/<name>.json --add-rule @rules/<rule>.json` before creating live blocking rules.
2. Target `@app` in `--match-host @app` on security rules (`waf`, `challenge`, `throttle`) so custom domains and PR previews inherit protection.
3. Roll out new WAF or challenge rules safely (`--waf-mode observe` first, review via `gregale edge rule waf-review --app <app>`, then switch to `block`).
4. Check hard spend caps with `gregale --non-interactive --json billing spend-cap` and configure preview stops via `gregale --non-interactive --json billing budgets create --file budget.json --key <key>`.

More: https://gregale.dev/docs/edge-rules and https://gregale.dev/docs/edge-rule-trace
