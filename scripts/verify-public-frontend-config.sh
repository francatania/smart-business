#!/usr/bin/env sh
set -eu

invalid_names="$(grep --recursive --only-matching --no-filename --extended-regexp \
  --include='*.ts' --include='*.tsx' \
  'import\.meta\.env\.[A-Z0-9_]+' frontend \
  | sort -u \
  | grep -Ev '^import\.meta\.env\.VITE_PUBLIC_[A-Z0-9_]+$' || true)"

if [ -n "$invalid_names" ]; then
  echo "Frontend source references configuration that is not explicitly public:" >&2
  echo "$invalid_names" >&2
  exit 1
fi

confidential_patterns='(DATABASE_PASSWORD|CLIENT_SECRET|GARAGE_SECRET_KEY|local-smart-business-app)'
for bundle in frontend/apps/portal/dist frontend/apps/admin/dist; do
  if [ -d "$bundle" ] && grep --recursive --line-number --binary-files=without-match \
    --extended-regexp "$confidential_patterns" "$bundle"; then
    echo "Confidential configuration found in frontend bundle: $bundle" >&2
    exit 1
  fi
done

echo "Frontend configuration surface is explicitly public."
