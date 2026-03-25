#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

if command -v iconv >/dev/null 2>&1; then
  OPENAI_API_KEY="$(iconv -f utf-16 -t utf-8 "${ENV_FILE}" | awk -F= '$1=="OPENAI_API_KEY"{print substr($0, index($0, "=") + 1); exit}')"
else
  OPENAI_API_KEY="$(awk -F= '$1=="OPENAI_API_KEY"{print substr($0, index($0, "=") + 1); exit}' "${ENV_FILE}")"
fi

if [[ -z "${OPENAI_API_KEY}" ]]; then
  echo "OPENAI_API_KEY is missing from ${ENV_FILE}" >&2
  exit 1
fi

docker build -t microprelegal "${REPO_ROOT}"
docker rm -f microprelegal >/dev/null 2>&1 || true
docker run -d --name microprelegal -e OPENAI_API_KEY="${OPENAI_API_KEY}" -p 8000:8000 microprelegal >/dev/null
echo "Application available at http://localhost:8000"
