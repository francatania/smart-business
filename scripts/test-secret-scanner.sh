#!/usr/bin/env sh
set -eu

fixture_directory="$(mktemp -d)"
trap 'rm -rf "$fixture_directory"' EXIT

printf '%s%s\n' '-----BEGIN PRIVATE ' 'KEY-----' > "$fixture_directory/representative-secret.txt"

if ./scripts/verify-no-secrets.sh "$fixture_directory" >/dev/null 2>&1; then
  echo "Secret scanner failed to detect its representative fixture." >&2
  exit 1
fi

echo "Secret scanner representative fixture detected successfully."
