#!/usr/bin/env sh
set -eu

scan_root="${1:-.}"
secret_patterns='(AKIA[0-9A-Z]{16}|gh[pousr]_[0-9A-Za-z]{30,}|-----BEGIN ([A-Z ]+ )?PRIVATE KEY-----)'

if grep --recursive --line-number --binary-files=without-match --extended-regexp \
  --exclude='verify-no-secrets.sh' \
  --exclude-dir='.git' \
  --exclude-dir='node_modules' \
  --exclude-dir='dist' \
  --exclude-dir='target' \
  "$secret_patterns" "$scan_root"; then
  echo "Potential committed secret detected. Remove it and rotate the credential." >&2
  exit 1
fi

echo "No representative committed-secret patterns detected."
