# Firestore read targets (per route)

Measured with `FirestoreReadCounter` in development (`lib/firestore-debug.ts` tracks `wrapFirestoreResult` calls). Revisit = within React Query `staleTime` / IndexedDB cache window (no new `getDocs`/`getDoc`).

| Route | First load (target) | Revisit (cached) | Notes |
|-------|--------------------:|-----------------:|-------|
| `/login` | 0 | 0 | Cookie API only; Firebase Auth is not a Firestore read |
| `/tutor` | 2–27 | 0 | 1 profile (`useProfile`) + up to 25 upcoming sessions |
| `/parent` | 2–28 | 0 | 1 students query + up to 25 upcoming sessions |
| `/admin` | 5–15 | 0 | Count aggregations + week sessions + ≤100 paid invoices sample |
| `/admin/sessions` (today) | 1–15 | 0 | IndexedDB + today range query |
| `/admin/calendar` | 5–40 | 0–5 | Month sessions + tutors/admins only (not all users) |
| `/admin/billing` | 0 | 0 | Archived placeholder |
| `/admin/students/[id]` | 3–30 | 0 | Student + parents/tutors + 25 upcoming; history on demand |
| `/messages` | 1+ listener | listener | Conversations listener; messages capped at 50 |
| Global theme | 0–1 | 0 | localStorage first; Firestore at most once per 24h |

## Changes implemented

1. **Billing archived** — nav removed; routes show placeholder (saves ~900 reads if billing was opened).
2. **React Query** — `QueryProvider`, dashboard summary, theme colors, parent/tutor sessions.
3. **Upcoming-only defaults** — tutor/parent load `startTime >= now`, `limit(25)`; history paginated (`limit(20)` + Load more).
4. **Dashboard** — `getCountFromServer` for students/evaluations; `monthlyStats` for session counts; week-only session fetch for chart.
5. **Login** — `withFirestoreTimeout` on Firebase sign-in; quota/timeout errors surfaced.
6. **Cache** — IndexedDB session cache + Firestore `persistentLocalCache` + React Query stale times.

## Success criteria

- Daily reads should drop substantially vs ~48K/day baseline with billing disabled and tutor/parent on upcoming-only loads.
- Peak hour target: &lt;2K reads with normal tutor/parent usage.
