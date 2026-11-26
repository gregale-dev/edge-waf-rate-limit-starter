#!/usr/bin/env bash
set -euo pipefail

APP_SLUG="${1:?Usage: ./scripts/apply-edge-rules.sh <app-slug>}"

echo "Applying pre-wake protection rules to ${APP_SLUG}..."

# 1. Cache public catalog GET/HEAD responses at the edge so reads never wake the microVM.
gregale --non-interactive --json edge rule create \
  --app "${APP_SLUG}" \
  --kind cache \
  --match-host "@app" \
  --match-path "/catalog" \
  --cache-max-age-seconds 60 \
  --cache-stale-while-revalidate-seconds 120

# 2. Composite IP + X-Username rate limit on failed POST /login responses (401 only).
gregale --non-interactive --json edge rule create \
  --app "${APP_SLUG}" \
  --kind throttle \
  --match-host "@app" \
  --match-path "/login" \
  --match-method POST \
  --throttle-requests-per-second 0.1 \
  --throttle-burst 5 \
  --throttle-key-by composite \
  --throttle-key-field ip \
  --throttle-key-field header:x-username \
  --throttle-count-status 401

# 3. Proof-of-work browser challenge for unverified scrapers on /search (Hobby+; verified bots/API keys/JWTs pass).
gregale --non-interactive --json edge rule create \
  --app "${APP_SLUG}" \
  --kind challenge \
  --match-host "@app" \
  --match-path "/search" \
  --match '{"field":"verified_bot","op":"missing"}' \
  --challenge-difficulty 16 \
  --challenge-max-difficulty 20 \
  --challenge-pass-ttl 1800

# 4. In-path OWASP Core Rule Set WAF in block mode with 15m penalty box (Pro+).
# Start with --waf-mode observe in production and review with `gregale edge rule waf-review`.
gregale --non-interactive --json edge rule create \
  --app "${APP_SLUG}" \
  --kind waf \
  --match-host "@app" \
  --match-path "/**" \
  --waf-mode block \
  --waf-paranoia-level 1 \
  --penalty-for 15m

echo "Checking current monthly hard spend cap and creating monitored preview budget..."
gregale --non-interactive --json billing spend-cap
gregale --non-interactive --json billing budgets create --file ./budget.json --key "preview-stop-${APP_SLUG}"
