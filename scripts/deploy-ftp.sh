#!/usr/bin/env bash
# Local FTP deploy using credentials from .env
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Missing .env. Run: cp .env.example .env  and fill FTP_PASSWORD"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

: "${FTP_SERVER:?}"
: "${FTP_PORT:?}"
: "${FTP_USERNAME:?}"
: "${FTP_PASSWORD:?}"
FTP_SERVER_DIR="${FTP_SERVER_DIR:-./}"

if [[ ! -d build ]]; then
  echo "build/ not found. Run: npm run build"
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "lftp is required. Install with: sudo apt install lftp"
  exit 1
fi

echo "Uploading build/ → ftp://${FTP_SERVER}:${FTP_PORT}/${FTP_SERVER_DIR}"
lftp -u "${FTP_USERNAME}","${FTP_PASSWORD}" -p "${FTP_PORT}" "ftp://${FTP_SERVER}" <<EOF
set ftp:ssl-allow no
set net:max-retries 3
cd ${FTP_SERVER_DIR}
mirror -R --delete --verbose --parallel=4 ./build .
bye
EOF

echo "Done. Check https://latent-action.com/docs/"
