# Security Checks

Run `make security-check` to scan the current Git history for secrets and the repository dependency manifests for high or critical vulnerabilities. The command uses exact container versions and sends findings only to standard output.

The lightweight repository scanner is also self-tested with a generated private-key marker. It complements Gitleaks; it does not replace it.

Runtime credentials must come from the deployment platform's secret manager. If a real credential reaches Git history or CI logs, rotate it immediately before rewriting or redacting repository history.

Temporary dependency exceptions follow the allowlist and expiry policy in [Continuous Integration and Security Gates](./continuous-integration.md).

## Active exception

`GHSA-qwww-vcr4-c8h2` is temporarily ignored for `react-router` until 2026-09-15. The advisory concerns React Server Components action handling; both current applications are client-only Vite SPAs and expose no RSC server actions. npm does not yet publish the fixed version identified by the advisory. [Issue #26](https://github.com/francatania/smart-business/issues/26) tracks the upgrade and removal of the exception.
