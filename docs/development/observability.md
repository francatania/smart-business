# Observability and Audit Conventions

The first operational baseline is intentionally provider-neutral. It supplies request correlation, machine-readable deployed logs, health probes, and Prometheus metrics without introducing distributed tracing infrastructure.

## Correlation and logging

Every HTTP request accepts a safe `X-Correlation-ID` value or receives a generated UUID. The identifier is returned in the same response header, stored in the logging context for the request, and added to standardized API problems.

The `deployed` profile writes Logstash-compatible JSON to standard output. Local and test profiles retain readable console output. Request completion logs contain only the method, path, status, duration, and correlation identifier. Do not log query strings, request bodies, cookies, authorization headers, tokens, credentials, customer notes, or media locations.

Unexpected exceptions are represented by a generic `internal_error` problem and logged by exception type without the exception message. Operators should use the correlation identifier to join the response with the safe request log.

## Health and metrics

Management endpoints are available only on port `8082`:

- `/actuator/health/liveness` reports whether the process can continue running. It must not depend on PostgreSQL or another remote service.
- `/actuator/health/readiness` includes PostgreSQL connectivity and removes an unhealthy instance from traffic.
- `/actuator/prometheus` exposes HTTP server, JVM, process, and datasource-pool metrics.
- `/actuator/info` exposes build information.

Docker Compose publishes the management port only on loopback. Deployed infrastructure must make it reachable solely from authorized monitoring and orchestration networks. Endpoint-level authorization is deferred until operational identity is selected; network isolation is mandatory in the meantime.

Initial alerts should focus on sustained readiness failure, elevated HTTP 5xx rate, request latency, JVM memory pressure, and exhausted database connections. Alert thresholds depend on real traffic and are not fixed in this repository.

## Audit events

Business and security audit events are domain records, not ordinary debug logs. Later modules use these conventions:

- Use a stable event name in past tense, such as `appointment.cancelled` or `customer_record.viewed`.
- Record event time in UTC, organization identifier, actor identifier and actor type, affected aggregate identifier, outcome, and correlation identifier.
- Store structured reason codes instead of free-form sensitive content.
- Never store credentials, tokens, biometric material, uploaded media, or complete before/after state in an audit event.
- Make retention, business visibility, and security-operator visibility explicit for each event family.
- Emit audit events through module-owned public APIs and persist them only when the corresponding domain behavior exists.

No speculative audit tables or domain events are created by the platform foundation.
