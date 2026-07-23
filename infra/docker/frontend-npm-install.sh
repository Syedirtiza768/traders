#!/bin/sh
# Resilient npm install for Docker frontend builds.
set -eu

ok=0
attempt=1
while [ "$attempt" -le 3 ]; do
  echo "npm ci attempt ${attempt}…"
  if npm ci --no-audit --no-fund; then
    ok=1
    break
  fi
  echo "npm ci failed on attempt ${attempt}"
  rm -rf node_modules
  sleep $((attempt * 5))
  attempt=$((attempt + 1))
done

if [ "$ok" != "1" ]; then
  echo "npm ci exhausted — falling back to npm install"
  rm -rf node_modules
  npm install --no-audit --no-fund
fi

test -x node_modules/.bin/tsc
test -x node_modules/.bin/vite
echo "Frontend toolchain ready."
