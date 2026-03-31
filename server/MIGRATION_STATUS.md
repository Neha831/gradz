# GradEzy MERN migration status

This document summarizes the current state of the PHP/HTML to MERN migration for this repo root (`client/` + `server/`).

## Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT, bcryptjs, Multer.
- **Frontend:** React (Vite), React Router, Axios.
- **Data:** Legacy MySQL can be imported via scripts; runtime uses MongoDB.

## Primary REST API (preferred for new code)

Mounted under `http://localhost:<PORT>/api` (see `src/index.js`):

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Login, register, security question, password reset |
| `/api/users` | Admin: list/create/update/delete students, CSV export |
| `/api/exams` | Exam CRUD flows, student lists, submit, guest validate/fetch/submit |
| `/api/questions` | Question CRUD, bulk create, bulk delete by exam code(s) |
| `/api/contact` | Contact messages |
| `/api/feedback` | Student feedback |
| `/api/results` | Admin results, share, CSV export, delete all; student analysis/list/detail |
| `/api/profile` | Profile get/update, file uploads |
| `/api/snapshots` | Webcam snapshot upload (auth); admin viewer APIs |
| `/api/admin` | Dashboard stats |
| `/api/proctor` | Tab-switch / proctor event logging |
| `/api/chatbot` | Admin: list/append log (`/responses`); student: read history (`/history`), append user line (`/message`); JSON file store |

Static:

- `/snapshot-files` — proctor snapshot images
- `/uploads` — profile uploads

Health: `GET /health`

## Legacy PHP compatibility layer

For migration, many old `*.php` URLs are aliased at the **server root** via `src/routes/legacyRoutes.js` (mounted with `app.use('/', legacyRoutes)`).

**Compatibility audit:** run from `server/`:

```bash
npm run audit:legacy-compat
npm run audit:legacy-root-coverage
npm run audit:legacy-recursive-coverage
npm run audit:legacy-all
```

Output JSON: `legacy-compat-report.json`. The audit separates:

- **actionable unmapped** — app endpoints still missing a handler (target: **0**)
- **non-actionable unmapped** — library/internal string matches (e.g. PHPMailer paths) that are not GradEzy app APIs

Root file coverage report output: `legacy-root-coverage-report.json` (fails with non-zero exit code if any root `*.html` or `*.php` file is not referenced by the migration layer).
Recursive coverage report output: `legacy-recursive-coverage-report.json` (scans legacy `.html/.php` recursively, excluding build/vendor folders, and fails non-zero when unmapped files are found).

## Data migration (MySQL → MongoDB)

From `server/` (configure `.env` first — see `.env.example`):

| Command | Purpose |
|---------|---------|
| `npm run migrate:doctor` | Preflight: Mongo + MySQL + required tables |
| `npm run migrate:mysql` | Import registrations, questions, answers, evaluate fallback |
| `npm run verify:migration` | Count/sample reconciliation vs MySQL |
| `npm run migrate:all` | Doctor → migrate → verify + reports |
| `npm run migrate:latest-report` | Print latest run summary |
| `npm run migrate:tail-logs` | Tail latest migrate/verify logs |
| `npm run migrate:open-latest` | JSON paths to latest artifacts |

Details: `MIGRATION_GUIDE.md`

## React app entry and legacy HTML paths

The React client maps many old `.html` paths to new routes (see `client/src/App.jsx` and `client/src/data/legacyHtmlRedirects.js`), and the server includes safe GET aliases for common legacy page-style `.php` entry URLs in `src/routes/legacyRoutes.js`. Bookmarks to legacy filenames can land on the correct MERN screens where applicable.

## Legacy root file coverage

Root legacy entry files have now been covered as follows:

- **HTML pages:** mapped to React routes through `client/src/App.jsx` and `client/src/data/legacyHtmlRedirects.js` (current list includes 32 root `.html` files).
- **PHP files:** covered by `src/routes/legacyRoutes.js` as either:
  - `GET`/`POST` endpoint compatibility handlers (legacy API behavior), or
  - safe `GET` page aliases redirecting to MERN UI routes where appropriate.

Coverage result: all root `*.html` and `*.php` files currently present in repo root are referenced by the migration layer.

## Operational notes

- **MongoDB** must be running (or `MONGO_URI` must point to a reachable cluster) or the server will fail to start in `bootstrap()`.
- **JWT:** set `JWT_SECRET` in production.
- **CORS:** set `CORS_ORIGIN` to the Vite dev URL (e.g. `http://localhost:5173`) when not using `*`.

## Single-process production (API + React)

1. Build the client: from repo root, `cd client` and set `VITE_API_BASE=/api` in `.env` (or env) for same-host API, then `npm run build` (output: `client/dist`).
2. Set environment (example):
   - `NODE_ENV=production` **or** `SERVE_CLIENT=true`
   - `CLIENT_DIST=../client/dist` (default; relative to `server/` working directory)
   - `CORS_ORIGIN=http://localhost:5000` (or your public site URL)
3. Start the server from `server/`: `npm start`

Express will serve static assets from `dist` and `index.html` for client-side routes. Paths under `/api`, `/snapshot-files`, `/uploads`, and unknown `*.php` are not overridden by the SPA fallback.

## Summary

MERN parity for core exam, auth, profile, results, snapshots, contact, feedback, admin student management, bulk question operations, and admin chatbot log (`/api/chatbot`) is in place. Legacy `.php` callers are supported through `legacyRoutes.js` until all clients are switched to `/api/*`.

For the latest numeric compatibility breakdown, run `npm run audit:legacy-compat` and open `legacy-compat-report.json`.
