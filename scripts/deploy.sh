#!/usr/bin/env bash
# Deploy IST Security: D1 migrate remote → OpenNext build → wrangler deploy
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKSPACE="$(cd "$ROOT/../../../.." && pwd)"
APP_ENV="$ROOT/.env"
CF_ENV="$WORKSPACE/settings/cloudflare/.env"
DB_NAME="ist-security"
WORKER_NAME="ist-security"

export HOME="${HOME_OVERRIDE:-$HOME}"
if [[ "$HOME" == *".agent-home"* ]]; then
  export HOME="/Users/rendydt360"
fi

cd "$ROOT"

if [[ ! -f "$APP_ENV" ]]; then
  echo "==> .env belum ada — sync dari settings/cloudflare"
  bash "$ROOT/scripts/sync-env-from-settings.sh"
fi

set -a
# shellcheck disable=SC1090
source "$APP_ENV"
set +a

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -f "$CF_ENV" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$CF_ENV"
  set +a
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "ERROR: CLOUDFLARE_API_TOKEN tidak ada"
  exit 1
fi

DB_NAME="${D1_DATABASE_NAME:-ist-security}"
WORKER_NAME="${CLOUDFLARE_WORKER_NAME:-ist-security}"

echo "==> Cek akun Wrangler"
WHOAMI="$(npx wrangler whoami 2>&1 || true)"
echo "$WHOAMI"
if echo "$WHOAMI" | grep -qi 'deskteam360'; then
  echo "ERROR: Akun Cloudflare tidak diizinkan untuk proyek ini. Stop."
  exit 1
fi
if ! echo "$WHOAMI" | grep -qi 'umrplku'; then
  echo "WARN: whoami tidak menyebut umrplku — cek manual."
fi

echo "==> Apply migrations D1 remote (${DB_NAME})"
npx wrangler d1 migrations apply "${DB_NAME}" --remote

echo "==> OpenNext build + deploy"
npx opennextjs-cloudflare build
npx opennextjs-cloudflare deploy

echo "==> SESSION_SECRET"
SECRET_FILE="${ROOT}/.deploy-session-secret"
if [[ -f "${SECRET_FILE}" ]]; then
  SESSION_SECRET="$(cat "${SECRET_FILE}")"
elif [[ -f "${ROOT}/.dev.vars" ]] && grep -q '^SESSION_SECRET=' "${ROOT}/.dev.vars"; then
  SESSION_SECRET="$(grep '^SESSION_SECRET=' "${ROOT}/.dev.vars" | cut -d= -f2- | tr -d '"')"
else
  SESSION_SECRET="$(openssl rand -hex 32)"
  echo "${SESSION_SECRET}" > "${SECRET_FILE}"
  chmod 600 "${SECRET_FILE}"
fi
printf '%s' "${SESSION_SECRET}" | npx wrangler secret put SESSION_SECRET

echo ""
echo "Selesai. App: https://${WORKER_NAME}.umrplku.workers.dev"
echo "Demo: password ist2026 · PIN 123456 (superadmin / kepala / admin / sec01)"
