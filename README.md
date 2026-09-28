# Glow Money

Phone-first money tracker for Indian rupees. People sign in, add income, log spends, and see what is left. Optional tools cover repeats, category limits, a savings target, bill splits, and exports.

## Architecture

The UI is a Create React App (JavaScript, not TypeScript) with React, Redux Toolkit, React Router, and Tailwind.

| Area | Path | Role |
| --- | --- | --- |
| App shell | `src/app` | Router, Redux store |
| Auth | `src/modules/auth` | Email sign-up, sign-in, password reset |
| Dashboard | `src/modules/dashboard` | Today, Income, Reports, Tools |
| Admin | `src/modules/admin` | User directory for `role: "admin"` |
| Shared UI | `src/shared` | Theme, routes, confirm dialog, PWA prompt |

Tabs are `?tab=today|income|reports|tools|admin`.

Firestore layout, owned by the signed-in user:

- `users/{uid}` — profile, accounts, categories, repeats, limits, goals
- `users/{uid}/expenses/{expenseId}` — spends
- `users/{uid}/walletTransactions/{txId}` — income and transfers

Security rules live in `firestore.rules`. A normal user can read and write only their own documents. An admin can read user profiles for the directory and cannot read another person's expenses or wallet rows. The app cannot grant admin; set `role` to `admin` in the Firebase console.

## Firebase setup

1. Create a Firebase project with Authentication (Email/Password) and Cloud Firestore.
2. Copy `.env.example` to `.env` and fill in the web app config.
3. Deploy the rules: `npx firebase deploy --only firestore:rules`

| Variable | Meaning |
| --- | --- |
| `REACT_APP_FIREBASE_API_KEY` | Web API key |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `REACT_APP_FIREBASE_PROJECT_ID` | Project id |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Sender id |
| `REACT_APP_FIREBASE_APP_ID` | App id |

Presence fields on the user profile:

- `lastLoginAt` — a fresh email and password sign-in. A restored session does not update it.
- `lastSeenAt` — the app was opened, including a restored session. Writes are throttled to about 15 minutes and ignored if Firestore rejects them, so sign-in still works.

The first-run guide is derived from this month's income and spends. It is not stored.

## Scripts

```bash
npm start          # dev server at http://localhost:3000
npm test           # Jest
npm run build      # production bundle in build/
npm run test:rules # Firestore rules against the local emulator
```

`npm run build` registers the service worker only in production (`public/sw.js`, `public/manifest.json`). Install is offered in the app after a supported browser fires the install prompt. iOS Safari uses Add to Home Screen; it does not fire that prompt.

## Deployment

```bash
npm run build
npx firebase deploy --only firestore:rules
```

Host the `build/` folder on Firebase Hosting, Netlify, or any static host. Set the same `REACT_APP_*` values at build time. Point the host at `index.html` for client-side routes (`/login`, `/dashboard`).

`npm run test:rules` starts the Firestore emulator through the rules test. It needs a JDK and the `firebase-tools` dev dependency.
