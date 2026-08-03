# Local Infrastructure

Docker Compose provisions PostgreSQL, Keycloak, Garage, and Mailpit for local development. The infrastructure stack runs independently of application containers.

## Start and inspect

```bash
make infra-up
docker compose --env-file infra/.env.example -f infra/compose.yaml ps
make infra-logs
```

Local endpoints:

| Service                   | Endpoint                |
| ------------------------- | ----------------------- |
| PostgreSQL                | `localhost:5432`        |
| Keycloak                  | `http://localhost:8081` |
| Garage S3 API             | `http://localhost:3900` |
| Garage administration API | `http://localhost:3903` |
| Mailpit SMTP              | `localhost:1025`        |
| Mailpit web UI            | `http://localhost:8025` |

The committed credentials in `.env.example` are intentionally limited to local development. Copy the file to `.env` to override values; never reuse these credentials in a shared environment.

## Persistence and reset

Ordinary restarts preserve data in these explicitly named volumes:

- `smart-business-postgres-data`
- `smart-business-garage-metadata`
- `smart-business-garage-data`
- `smart-business-mailpit-data`

To permanently remove exactly these local volumes, run:

```bash
make infra-reset CONFIRM=delete-smart-business-local-data
```

This operation cannot recover the removed local databases, objects, realm state, or captured messages.
