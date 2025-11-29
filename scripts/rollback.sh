#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <service_id> <deploy_hook_key> <tag>"
  exit 1
fi

SERVICE_ID="$1"
DEPLOY_HOOK_KEY="$2"
TAG="$3"

API_URL="https://api.render.com/v1/services/${SERVICE_ID}/deploys"

payload=$(cat <<JSON
{
  "clearCache": false,
  "commitId": "${TAG}"
}
JSON
)

resp=$(curl -sS -X POST "$API_URL" \
  -H "Authorization: Bearer ${RENDER_API_KEY:-}" \
  -H "Content-Type: application/json" \
  -d "$payload")

echo "Triggered deploy: $resp"
