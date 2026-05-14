# GC2: Onboarding skip still saves
Date: 2026-05-13
Type: EVAL (static code trace — no live browser)

## Result: PASS

## Step 1 — "Skip for now" routes to /onboarding/loading
`handleSkip()` in `app/onboarding/calendar/page.tsx:32` calls `router.push('/onboarding/loading')` directly. ✅

## Step 2 — Redirect hits /onboarding/loading
Direct `router.push` — no intermediate redirects, no conditional logic. ✅

## Step 3 — All onboarding data saved

Data chain verified:
| sessionStorage key | Set by | Consumed by loading page |
|---|---|---|
| `habidy_onboarding_profile` | `profile/page.tsx:86` | `profile.name`, `profile.email` |
| `habidy_onboarding_identity` | `identity/page.tsx:22` | `identity_statement` |
| `habidy_onboarding_questionnaire` | `questionnaire/page.tsx:96` | `goal_category`, `friction_point`, `time_available` |

API route (`/api/onboarding`) saves all four fields to `users` via upsert on `id`. ✅

## Step 4 — No null overwrites

Two guards prevent null overwrites:
1. Loading page (`loading/page.tsx:47-52`): if `identityStatement` is empty, bail without calling API.
2. API route (`route.ts:19-21`): if `identity_statement` missing, return 400.
Empty string fields use `|| null` in corePayload — never write empty strings to DB. ✅

## Caveats
- Eval is a static code trace, not a live browser run.
- Could not verify actual Supabase rows — a live test account would confirm end-to-end.