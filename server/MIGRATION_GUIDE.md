# Migration Guide

Use these commands from the `server/` folder.

## 1) Preflight checks

```bash
npm run migrate:doctor
```

Checks:
- MongoDB connectivity
- MySQL connectivity
- required legacy tables

## 2) Full pipeline (recommended)

```bash
npm run migrate:all
```

Runs in order:
1. `migrate:doctor`
2. `migrate:mysql`
3. `verify:migration`

## 3) Read latest report quickly

```bash
npm run migrate:latest-report
```

## 4) Tail latest logs

```bash
npm run migrate:tail-logs
```

## 5) Get latest artifact paths as JSON

```bash
npm run migrate:open-latest
```

## 6) Legacy compatibility audits (recommended before deployment)

Run all legacy audits in one command:

```bash
npm run audit:legacy-all
```

This runs:
1. `audit:legacy-compat` (legacy endpoint string audit)
2. `audit:legacy-root-coverage` (root `*.html/*.php` file coverage)
3. `audit:legacy-recursive-coverage` (recursive legacy `*.html/*.php` coverage, excluding build/vendor dirs)

Reports written under `server/`:
- `legacy-compat-report.json`
- `legacy-root-coverage-report.json`
- `legacy-recursive-coverage-report.json`

## Important env values

Set these in `.env`:

- `MONGO_URI`
- `MYSQL_HOST`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DB`

Optional:

- `MIGRATE_BATCH_SIZE` (default `1000`)
- `VERIFY_SAMPLE_SIZE` (default `10`)
- `MIGRATION_STATUS_FILE` (default `./migration-status.json`)
- `MIGRATION_REPORTS_DIR` (default `./migration-reports`)
- `MIGRATION_TAIL_LINES` (default `30`)
- `MIGRATION_DOCTOR_TIMEOUT_MS` (default `8000`)

