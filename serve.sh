#!/usr/bin/env bash
# Elinditja a keresztrejtvenyt localhoston.
#   ./serve.sh          -> http://localhost:8000
#   ./serve.sh 9000     -> http://localhost:9000
set -euo pipefail

PORT="${1:-8000}"
GYOKER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! command -v python3 >/dev/null 2>&1; then
  echo "Hiba: python3 szukseges a helyi kiszolgalohoz." >&2
  exit 1
fi

echo "Keresztrejtveny itt erheto el:  http://localhost:${PORT}"
echo "Leallitas: Ctrl+C"
echo

cd "$GYOKER"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
