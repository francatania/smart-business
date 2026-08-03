#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
checkout_directory="$(mktemp -d /tmp/smart-business-clean-XXXXXX)"

cleanup() {
  case "$checkout_directory" in
    /tmp/smart-business-clean-*) ;;
    *)
      echo "Refusing to clean an unexpected directory: $checkout_directory" >&2
      return 1
      ;;
  esac
  docker --context default run --rm --volume "$checkout_directory:/clean-checkout" \
    alpine:3.23.3 chmod -R a+rwX /clean-checkout >/dev/null 2>&1 || true
  rm -rf "$checkout_directory"
}
trap cleanup EXIT

git -C "$repository_root" archive HEAD | tar -x -C "$checkout_directory"

docker --context default compose \
  --env-file "$checkout_directory/infra/.env.example" \
  -f "$checkout_directory/infra/compose.yaml" \
  --profile applications config --quiet

docker --context default run --rm \
  --add-host host.docker.internal:host-gateway \
  --env TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  --volume /var/run/docker.sock:/var/run/docker.sock \
  --volume smart-business-maven-cache:/root/.m2 \
  --volume "$checkout_directory:/workspace" \
  --workdir /workspace/backend \
  maven:3.9.16-eclipse-temurin-25-noble \
  ./mvnw --batch-mode --no-transfer-progress verify

docker --context default run --rm \
  --volume smart-business-pnpm-store:/pnpm/store \
  --volume "$checkout_directory:/workspace" \
  --workdir /workspace \
  node:24.18.1-bookworm \
  sh -lc 'corepack enable && corepack pnpm config set store-dir /pnpm/store && corepack pnpm install --frozen-lockfile && corepack pnpm verify'

docker --context default compose \
  --env-file "$checkout_directory/infra/.env.example" \
  -f "$checkout_directory/infra/compose.yaml" \
  --profile applications build backend portal admin

echo "Clean-checkout build, test, and Compose verification completed successfully."
