#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Daily Life Review — one-shot go-live (GitHub + Turso + Vercel)
#
# Required env vars:
#   GH_TOKEN            GitHub classic PAT with "repo" scope
#   GH_USER             your GitHub username
#   REPO_NAME           repo name to create/push (default: daily-life-review)
#   VERCEL_TOKEN        Vercel access token (https://vercel.com/account/tokens)
#
# Database — provide EITHER:
#   TURSO_API_TOKEN                        (script creates the DB for you)
#   ...or both of:
#   TURSO_DATABASE_URL + TURSO_AUTH_TOKEN  (pre-created database)
#
# Usage:
#   GH_TOKEN=... GH_USER=... VERCEL_TOKEN=... TURSO_API_TOKEN=... ./scripts/go-live.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

REPO_NAME="${REPO_NAME:-daily-life-review}"
TURSO_DB_NAME="${TURSO_DB_NAME:-daily-life-review}"

need() { [ -n "${!1:-}" ] || { echo "✗ Missing required env var: $1"; exit 1; }; }
need GH_TOKEN; need GH_USER; need VERCEL_TOKEN

cd "$(dirname "$0")/.."
echo "▸ Project: $(pwd)"

# ── 1. GitHub ───────────────────────────────────────────────────────────────
echo "▸ [1/4] Creating GitHub repo ${GH_USER}/${REPO_NAME}…"
API="https://api.github.com"
curl -sS -o /tmp/gh_create.json -w "%{http_code}" -X POST "$API/user/repos" \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d "{\"name\":\"${REPO_NAME}\",\"private\":false,\"description\":\"AI journaling app that turns daily notes into weekly insights\"}" \
  > /tmp/gh_code || true
code=$(cat /tmp/gh_code)
if [ "$code" = "201" ]; then
  echo "  ✓ repo created"
elif [ "$code" = "422" ]; then
  echo "  • repo already exists — pushing to it"
else
  echo "  ✗ GitHub repo creation failed (HTTP $code):"; cat /tmp/gh_create.json; exit 1
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://${GH_USER}:${GH_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"
git branch -M main 2>/dev/null || true
echo "▸ Pushing main…"
git push -u origin main --force
git remote set-url origin "https://github.com/${GH_USER}/${REPO_NAME}.git"   # scrub token from remote
echo "  ✓ pushed → https://github.com/${GH_USER}/${REPO_NAME}"

# ── 2. Turso database ───────────────────────────────────────────────────────
if [ -z "${TURSO_DATABASE_URL:-}" ]; then
  need TURSO_API_TOKEN
  echo "▸ [2/4] Installing Turso CLI…"
  curl -sSfL https://get.tur.so/install.sh | bash >/dev/null 2>&1 || true
  export PATH="$HOME/.turso:$PATH"
  echo "▸ Creating Turso database ${TURSO_DB_NAME}…"
  turso auth api-tokens mint ci-token >/dev/null 2>&1 || true
  turso db create "$TURSO_DB_NAME" 2>/dev/null || echo "  • database may already exist"
  TURSO_DATABASE_URL=$(turso db show "$TURSO_DB_NAME" --url)
  TURSO_AUTH_TOKEN=$(turso db tokens create "$TURSO_DB_NAME")
else
  echo "▸ [2/4] Using provided Turso credentials"
fi
[ -n "$TURSO_DATABASE_URL" ] && [ -n "$TURSO_AUTH_TOKEN" ] || { echo "✗ Turso credentials unresolved"; exit 1; }

# ── 3. Schema ───────────────────────────────────────────────────────────────
echo "▸ [3/4] Provisioning schema on remote database…"
TURSO_DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" npm run db:push

# ── 4. Vercel ───────────────────────────────────────────────────────────────
echo "▸ [4/4] Deploying to Vercel…"
vercel() { npx --yes vercel@latest "$@"; }
vercel link --yes --project "$REPO_NAME" --token "$VERCEL_TOKEN" >/dev/null
for env in production preview development; do
  printf '%s' "$TURSO_DATABASE_URL" | vercel env add TURSO_DATABASE_URL "$env" --token "$VERCEL_TOKEN" --force >/dev/null 2>&1 || true
  printf '%s' "$TURSO_AUTH_TOKEN"   | vercel env add TURSO_AUTH_TOKEN   "$env" --token "$VERCEL_TOKEN" --force >/dev/null 2>&1 || true
done
echo "▸ Building & deploying to production…"
vercel deploy --prod --yes --token "$VERCEL_TOKEN"

echo
echo "✅ Done."
echo "   GitHub : https://github.com/${GH_USER}/${REPO_NAME}"
echo "   Demo   : demo@dailyreview.app / demo1234"
