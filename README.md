## AMK Tutors – Notifications

This project is a Next.js 16 app (App Router) with Firebase (client + admin) and now a multi-channel notifications system:

- **Push** (Web Push with VAPID, custom `sw.js`)
- **Email** (Nodemailer + SMTP)
- **SMS** (schema + UI stub only, not sending yet)

### Env vars

Add these to `.env.local` (and production env):

```bash
# Web Push (VAPID)
VAPID_PUBLIC_KEY="your_public_vapid_key"
VAPID_PRIVATE_KEY="your_private_vapid_key"
VAPID_SUBJECT="mailto:you@example.com"

# Client-side copy of VAPID public key
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your_public_vapid_key"

# SMTP (for Nodemailer)
SMTP_HOST="smtp.yourprovider.com"
SMTP_PORT="587"
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
SMTP_FROM="\"AMK Tutors\" <no-reply@amktutors.com>"
```

#### Generate VAPID keys

From the project root:

```bash
npx web-push generate-vapid-keys
```

Copy `publicKey` to `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, and `privateKey` to `VAPID_PRIVATE_KEY`.

### New Firestore collections

The notification system uses these collections (all in Firestore via `adminDb`):

- `user_notification_settings` – per-user channel preferences
- `push_subscriptions` – browser push subscriptions mapped to users
- `notification_rules` – admin-configured rules
- `notification_logs` – audit/debug logs for dispatch attempts

Session reminder flags are stored on `sessions` documents:

- `reminder24SentAt?: string`
- `reminder1SentAt?: string`

### Scripts

```bash
# Run dev server
npm run dev

# Lint
npm run lint

# Production build
npm run build
```

#### Reminder cron (SESSION_REMINDER_24H / SESSION_REMINDER_1H)

There is a scaffolded cron runner at `scripts/notifications-cron.ts`. It is intended
to run as a standalone Node process (not inside Vercel lambdas).

Example (after building the app with `next build` and transpiling scripts if needed):

```bash
node dist/scripts/notifications-cron.js
```

Schedule this every 5 minutes in your infrastructure so it can:

- Find upcoming sessions in the next 24h / 1h
- Fire `SESSION_REMINDER_24H` / `SESSION_REMINDER_1H` via the dispatcher
- Mark `reminder24SentAt` / `reminder1SentAt` on the session so reminders are not duplicated

### Manual test checklist

1. **Push subscription**
   - Log in as Admin/Tutor/Parent in Chrome.
   - Go to the corresponding Notification settings page:
     - Admin: `Admin → Settings → Admin notifications`
     - Tutor: `/tutor/notifications`
     - Parent: `/parent/notifications`
   - Toggle **Push** on:
     - Browser prompts for permission.
     - After accepting, toggle stays on and no error toast appears.

2. **Email preferences**
   - On the same settings page, toggle **Email** on/off.
   - Confirm state persists after refresh (via `/api/notifications/settings`).
   - If the profile has no email, turning Email on should show a warning.

3. **Admin rules UI**
   - In the Admin sidebar, open **Notifications**.
   - Create a new rule:
     - Event: `SESSION_SCHEDULED`
     - Audience: `PARENT_OF_STUDENT`
     - Channels: Push + Email.
     - Provide simple templates using `{{studentName}}`, `{{tutorName}}`, `{{sessionDate}}`, `{{sessionTime}}`, `{{portalLink}}`.
   - Save and verify it appears in the rules list.

4. **Session scheduled trigger**
   - Using the admin Sessions “Schedule Session” flow, create a new session for a student whose parent has:
     - Email notifications enabled.
     - Push notifications enabled in at least one browser.
   - Confirm:
     - Parent receives a push notification (if browser open).
     - Parent receives an email (check SMTP inbox).
   - In Admin → Notifications → Logs, verify new rows for `SESSION_SCHEDULED`.

5. **Session cancelled trigger**
   - Edit an existing session and change status → **Cancelled**.
   - Confirm:
     - Parent and tutor receive notifications per rules.
     - Logs show `SESSION_CANCELLED` entries.

6. **Invoice created (rule only)**
   - Create a rule for `INVOICE_CREATED` and target `PARENT_OF_STUDENT` with email + push.
   - Generate an invoice in the Admin billing flow.
   - Confirm notifications/logs fire if the rule is enabled (event scaffolding is in place; adjust as needed based on actual invoice creation path).

7. **Reminders cron (manual)**
   - Create a test session starting 25–26 hours from now and another 60–70 minutes from now.
   - Run `node dist/scripts/notifications-cron.js` manually.
   - Confirm:
     - 24h / 1h reminder notifications are sent as expected.
     - `reminder24SentAt` / `reminder1SentAt` are written on the session.

8. **PWA behavior**
   - Install the PWA and verify push notifications still arrive when the app is closed but the browser is running.
   - In Safari/Chrome, ensure the app no longer randomly loads as unstyled HTML (service worker fallback is navigation-only).

