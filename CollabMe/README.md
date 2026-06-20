# CollabMe 🤝

A cross-platform mobile app (iOS & Android) that connects people who want to
do things together — from casual gaming sessions to outdoor sports and fitness.

This repository contains the **MVP foundation**: a clean, modular codebase with
a complete, working authentication flow (Sign Up + Log In) and the core app
shell (activity feed, explore, profile) ready for step-by-step feature work.

> Built with **React Native + Expo (Expo Router) + TypeScript**.

---

## ✨ What's included in this first version

- **Authentication system** — registration, login, logout, session
  persistence, and auth-gated navigation.
  - Inline field validation (email format, password strength, matching
    confirmation) plus friendly server-style error messages.
  - Sessions persist across app restarts.
- **App shell** behind auth: a bottom-tab layout with **Feed**, **Explore**,
  and **Profile** screens (populated with sample/placeholder content).
- **Reusable UI kit** — `Button`, `TextField`, `ScreenContainer`, `Logo`.
- **Design system** — centralized colors, spacing, radii, and typography.
- **Clean architecture** — UI ⇄ Context ⇄ Service ⇄ Storage, with a single
  swappable seam for the backend.

### Important: how auth works today

The auth service currently runs **fully on-device** (accounts and sessions are
stored in `AsyncStorage`). This makes the app immediately runnable with **zero
backend setup** — great for prototyping the UX. It is **not** production
security: passwords are stored locally in plain form. Swapping in a real
backend is a single-file change (see [Next steps](#-recommended-next-steps)).

---

## 🚀 Getting started

**Prerequisites:** Node.js 18+, and the
[Expo Go](https://expo.dev/go) app on your phone (or an iOS/Android simulator).

```bash
cd CollabMe
npm install
npm start
```

Then scan the QR code with Expo Go, or press `i` (iOS simulator) / `a`
(Android emulator) / `w` (web) in the terminal.

Useful scripts:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
```

---

## 🗂 Project structure

```
CollabMe/
├── app/                       # Expo Router — file-based routes
│   ├── _layout.tsx            # Root: providers + auth routing guard
│   ├── index.tsx              # Entry redirect
│   ├── (auth)/                # Unauthenticated stack
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (tabs)/                # Authenticated bottom-tab app
│       ├── _layout.tsx
│       ├── index.tsx          # Activity feed
│       ├── explore.tsx        # Browse by category
│       └── profile.tsx        # User profile + logout
├── src/
│   ├── components/            # Reusable UI (Button, TextField, ...)
│   ├── context/               # AuthContext (global auth state)
│   ├── services/              # authService + storage (the backend seam)
│   ├── theme/                 # Design tokens
│   ├── types/                 # Shared domain types
│   └── utils/                 # Validation helpers
├── app.json                   # Expo config
├── tsconfig.json              # Path alias: "@/..." -> "src/..."
└── package.json
```

### Architecture in one line

```
Screens (app/)  →  useAuth() / AuthContext  →  authService  →  storage / API
```

Screens never call the backend directly. They go through `AuthContext`, which
calls `authService`. To change backends, you only edit `src/services/authService.ts`.

---

## 🧭 Recommended next steps

A pragmatic, roughly-ordered roadmap from MVP to a product people love.

### 1. Real backend & secure auth (do this first)
- Adopt **Supabase** (Postgres + Auth + Realtime + Storage) or **Firebase**.
- Replace the body of `src/services/authService.ts` with real calls — the rest
  of the app stays untouched.
- Store the session token in **expo-secure-store** instead of AsyncStorage.
- Add **email verification**, **password reset**, and **social login**
  (Apple — required for iOS, Google).

### 2. User profiles & onboarding
- Post-signup onboarding: pick interests (gaming/sports/fitness/...),
  skill level, location, and availability.
- Editable profile with avatar upload, bio, and verification badges.

### 3. Activities (the core loop)
- Create / browse / join **activities** with category, time, location,
  capacity, and skill level.
- Map view (react-native-maps) + list view, with location & category filters.
- RSVP / join-request flow and attendee lists.

### 4. Matching & discovery
- A **matching algorithm** ranking activities and people by shared interests,
  proximity, availability overlap, and skill compatibility.
- A swipeable "discover people" experience for finding regular partners.

### 5. Messaging
- 1:1 and group chat per activity (Supabase Realtime / Stream / Sendbird).
- Push notifications via **expo-notifications** for matches, messages, RSVPs.

### 6. Trust & safety (non-negotiable for a social app)
- Reporting, blocking, and moderation tooling.
- Ratings/reviews after activities to build reputation.
- Optional identity verification; clear privacy controls for location sharing.

### 7. Engagement & growth
- Activity feed with friends' activity and recommendations.
- Streaks, badges, and a reputation system.
- Calendar integration and reminders.

### Suggested technical additions
- **State/data:** TanStack Query for server state; keep Context for session.
- **Forms:** React Hook Form + Zod (share Zod schemas with the validators here).
- **Navigation:** already using Expo Router (typed routes enabled).
- **Testing:** Jest + React Native Testing Library; Maestro for E2E.
- **CI/CD:** EAS Build & Submit; GitHub Actions for lint/typecheck/test.
- **Quality:** Sentry (crash reporting), and an analytics tool (PostHog/Amplitude).
- **Theming:** extend `src/theme` with a dark-mode palette + a `useTheme()` hook.

---

## 📄 License

Private project — all rights reserved (update as needed).
