# CATDI App

CATDI is a mobile daily check-in and interview app for patient-scoped mood,
energy, and pain ratings. The app is built with Expo and React Native, is
primarily designed for iOS and iPadOS, and includes a FastAPI + MySQL backend
for synchronization and data export.

The client is offline-first: check-ins are saved locally to SQLite, queued in an
outbox, and synced with the backend when connectivity is available. The app can
also integrate with an optional comment server to send start/stop markers during
an interview workflow.

## Features

- Patient creation, selection, deletion, and "latest patient" tracking.
- Daily check-in flow with 1-7 ratings for mood, energy, and pain.
- Interview timer flow for aligning check-ins with recording sessions.
- Past-interview list for the selected patient.
- Local SQLite persistence through Expo SQLite.
- Patient-scoped sync with a FastAPI backend and MySQL storage.
- CSV export endpoint for time-bounded interview dumps.
- Optional settings password and optional comment server integration.

## Architecture

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router screens and tab layout. |
| `components/` | Reusable UI, workflow modals, settings, preflight checks, and warnings. |
| `contexts/` | Patient selection state and interview start-state coordination. |
| `db/` | Local SQLite schema, repository layer, app data API, and sync engine. |
| `api/` | FastAPI backend, SQLModel models, sync routes, and export route. |
| `mysql/` | MySQL config and initialization SQL. |
| `apptainer/` | Optional Apptainer orchestration for backend services. |

Sync flow:

1. The app writes patients and interviews to local SQLite first.
2. Mutations are queued as outbox operations.
3. The sync engine pushes queued operations to `POST /sync/push`.
4. The app pulls patient-scoped changes from `GET /sync/pull`.
5. Existing server patients can be rehydrated by EMU ID through
   `GET /sync/bootstrap`.

## Prerequisites

- Node.js and npm.
- Expo workflow through `npx expo` or the npm scripts in `package.json`.
- Docker and Docker Compose for the default local backend setup.
- iOS Simulator or an Expo development build for iOS/iPadOS testing.
- Optional: Apptainer for cluster or HPC-style environments.

## Quick Start

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Configure the mobile app

Create a local `.env` file:

```bash
EXPO_PUBLIC_DATABASE_URL=http://localhost:8090
EXPO_PUBLIC_COMMENT_SERVER_URL=http://localhost:8001
EXPO_PUBLIC_DEVICE_SECRET=replace-with-dev-device-secret
EXPO_PUBLIC_SETTINGS_PASSWORD=replace-with-optional-settings-password
```

`EXPO_PUBLIC_COMMENT_SERVER_URL` is only needed when using a comment server.
`EXPO_PUBLIC_SETTINGS_PASSWORD` is optional; if omitted, Settings opens without
a password prompt.

### 3. Start the backend

```bash
make build
make up
```

Useful backend URLs:

- FastAPI: `http://localhost:8090`
- API docs: `http://localhost:8090/docs`
- MySQL host port: `3390`

### 4. Start the app

```bash
npm run ios
```

Other development options:

```bash
npm run start
npm run web
```

## Using the App

1. Start the backend.
2. Start the Expo app.
3. Let the startup preflight checks run.
4. Open Settings from the tab header.
5. Add or select a patient by EMU ID.
6. Start a Daily Check-in.
7. Rate mood, energy, and pain from 1-7.
8. Continue to the timer screen and save the interview.
9. Review saved check-ins from the Past Interviews tab.

If the backend or comment server is unavailable, the app still saves local data.
Queued sync operations are retried later when connectivity returns. Comment
server failures prompt the user to retry or continue manually.

The Settings password is a lightweight UI lock, not a secure authentication
boundary. Do not rely on it to protect sensitive data.

## Configuration

### Frontend environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `EXPO_PUBLIC_DATABASE_URL` | Yes | FastAPI base URL used for health checks and sync. |
| `EXPO_PUBLIC_COMMENT_SERVER_URL` | No | Optional comment server base URL for start/stop/annotation markers. |
| `EXPO_PUBLIC_DEVICE_SECRET` | For sync push/comment auth | Sent as `X-Device-Key` by the app. |
| `EXPO_PUBLIC_SETTINGS_PASSWORD` | No | Optional password gate for the Settings drawer. |

Expo embeds `EXPO_PUBLIC_*` values in the client bundle. Treat these as public
configuration, not high-value secrets.

### Backend settings

The backend currently reads settings from `api/config.py` through Pydantic
settings:

| Setting | Used by | Description |
| --- | --- | --- |
| `device_secret` | `POST /sync/push` | Must match the app's `X-Device-Key` header. |
| `dump_key` | `POST /dump-db` | Required as `X-Dump-Key` for CSV exports. |

Before open-sourcing or deploying this repo, replace any hard-coded default
secrets with environment-specific values and rotate any values that were ever
committed.

## Backend API

Important endpoints:

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Backend health check used by app preflight checks. |
| `POST /sync/push` | Accepts queued patient/interview operations from a device. |
| `GET /sync/pull` | Returns patient-scoped changes after a change cursor. |
| `GET /sync/bootstrap` | Rehydrates a local patient by EMU ID from server state. |
| `GET /patients/by-emu/{emu_id}` | Looks up a server patient UUID by EMU ID. |
| `POST /dump-db` | Writes CSV exports for interviews within a requested time range. |

Core sync entities:

- `Patient`: EMU ID, UUID, latest flag, update/delete timestamps.
- `SimpleInterview`: mood, energy, pain, task name, timestamps, and status.
- `SyncOperation`: idempotency record for pushed operations.
- `Change`: authoritative server-side change feed used by pull sync.

`POST /dump-db` writes CSV files under `LOG_PATH`, grouped by patient EMU ID.

## Development Commands

Frontend:

```bash
npm run start
npm run ios
npm run web
npm run lint
```

Backend with Docker Compose:

```bash
make help
make up
make logs
make db-shell
make db-reset
make down
```

Optional Apptainer backend:

```bash
make apptainer-build
make apptainer-up
make apptainer-status
make apptainer-down
```

See `DOCKER_README.md` and `apptainer/README.md` for deeper backend runtime
details.

## Adding Features or Interview Types

For UI-only changes, prefer adding routes under `app/` and reusable pieces under
`components/`, following the existing Expo Router and NativeWind patterns.

For new persisted interview data, update each layer deliberately:

- Types and local schema: `db/types.ts` and `db/schema.ts`.
- Local data access: the relevant repository files under `db/repo/`.
- App-facing API: `db/api.ts`.
- Sync serialization and application: `db/sync/syncClient.ts`,
  `db/sync/apply.ts`, and the payload helpers in `db/api.ts`.
- Backend models and validation: `api/db/models.py`, `api/db/payload.py`, and
  `api/db/operations.py`.
- Backend routes: `api/main.py`, if the feature needs new endpoints.
- Export behavior: `/dump-db`, if the new data should appear in CSV output.

New interview checklist:

- Define the data shape and patient ownership.
- Add or migrate the local SQLite schema.
- Save locally before network sync.
- Queue outbox operations for every mutation.
- Add backend upsert/delete handling.
- Confirm bootstrap, pull sync, and CSV export behavior.
- Smoke test offline save, reconnect sync, and patient switching.

## Testing and Verification

Current automated coverage is limited to linting:

```bash
npm run lint
```

Recommended manual smoke test before opening a PR:

1. Start the backend with `make up`.
2. Confirm `http://localhost:8090/health` returns healthy.
3. Start the app with `npm run ios` or `npm run start`.
4. Create or select a patient.
5. Save a Daily Check-in.
6. Open Past Interviews and confirm the record appears.
7. Watch `make logs` and confirm sync activity or expected offline warnings.

Future tests worth adding:

- Frontend unit tests for rating validation, patient selection, and sync notices.
- Backend tests for `sync/push`, `sync/pull`, bootstrap, and dump export.
- Migration/sync regression tests when adding new interview types.

## Privacy, Security, and Open-Source Readiness

Do not commit protected health information, real patient data, production logs,
database dumps, or production secrets. Local `.env*` files, `logs/`, Apptainer
runtime data, and local backend config are ignored by `.gitignore`.

Before publishing the repository, add or confirm:

- `CONTRIBUTING.md`
- Optional `CODE_OF_CONDUCT.md`

Also review any sample IDs, default passwords, bundle identifiers, EAS metadata,
and backend defaults to make sure they are appropriate for a public repo.

## License

This project is licensed under the MIT License. See `LICENSE` for details.