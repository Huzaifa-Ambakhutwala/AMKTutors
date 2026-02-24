# AGENTS

## Cursor Cloud specific instructions

### Overview

AMK Tutors is a Next.js 16 app (not a monorepo) with API routes under `app/api/`. Uses npm as package manager.

### Commands

- Dev: `npm run dev` (port 3000, Turbopack)
- Lint: `npm run lint` (pre-existing lint warnings/errors in codebase)
- Build: `npm run build`

### Notes

- Node.js 22+ required.
- Always use `npm` (lockfile is `package-lock.json`).
- No Docker, no local databases. Only local service is the Next.js dev server.
- External services (all cloud-hosted): see `lib/firebase.ts` and `lib/firebase-admin.ts` for required env var names. Landing page works without credentials; auth/dashboard features require real credentials.
