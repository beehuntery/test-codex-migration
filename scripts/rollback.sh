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

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "RENDER_API_KEY is required" >&2
  exit 2
fi

payload=$(cat <<JSON
{
  "clearCache": false,
  "commitId": "${TAG}"
}
JSON
)

resp=$(curl -sS -X POST "$API_URL" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$payload")

deploy_id=$(echo "$resp" | jq -r '.id // empty')
status=$(echo "$resp" | jq -r '.status // empty')

if [[ -z "$deploy_id" ]]; then
  echo "Failed to trigger deploy: $resp" >&2
  exit 3
fi

echo "Triggered deploy: $deploy_id (status: $status)"

echo "Polling deploy status..."
for i in {1..30}; do
  poll=$(curl -sS "${API_URL}/${deploy_id}" -H "Authorization: Bearer ${RENDER_API_KEY}")
  st=$(echo "$poll" | jq -r '.status // empty')
  echo "[$i] status=$st"
  if [[ "$st" == "live" ]]; then
    echo "Deploy succeeded"
    exit 0
  fi
  if [[ "$st" == "failed" ]]; then
    echo "Deploy failed: $poll" >&2
    exit 4
  fi
  sleep 10
 done

echo "Timeout waiting for deploy to finish" >&2
exit 5
