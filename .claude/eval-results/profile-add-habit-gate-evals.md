# Eval: Profile + add-habit gate evals
Date: 2026-06-15

## sign_out ✅ PASS
Code inspection of `app/profile/page.tsx:handleSignOut`:
- `await supabase.auth.signOut()` — clears Supabase session ✅
- `router.push('/login')` — redirects immediately after sign-out ✅
- Middleware (`proxy.ts`) protects all app routes including `/profile` — unauthenticated
  access to any protected route redirects to `/login` ✅

## add_habit_gate ✅ PASS (after fix)
**Pre-fix state:** `/add-habit` page had no streak gate; direct URL navigation bypassed the
dashboard button gate entirely.

**Fix applied:** `app/add-habit/page.tsx` now fetches `/api/habits` on load and checks if any
habit has `phase !== 'Building'` (equivalent to streak ≥ 7, since `getPhase` returns Building
for streak 0–6). If no qualifying habit exists, `router.replace('/dashboard')` fires immediately.

- Visit `/add-habit` with no habits → redirect to `/dashboard` ✅
- Visit `/add-habit` with streak < 7 (all Building phase) → redirect to `/dashboard` ✅
- Visit `/add-habit` with streak ≥ 7 (Establishing or Maintaining) → page loads ✅
- If `/api/habits` fetch fails → page loads without redirect (fail-open, non-blocking) ✅

## proposed_habits_shown ✅ PASS
Code inspection of `app/add-habit/page.tsx`:
- Queries `proposed_habits` table: `.eq('user_id', user.id).eq('selected', false)` ✅
- Shows unselected habits from last Architect session, ordered by `created_at desc` ✅
- Empty state: "No saved suggestions" + "Generate new suggestions" → `/architect` CTA ✅
- After adding: habit marked `selected = true` in `proposed_habits` table via POST `/api/habits`
  with `selectedProposedIds` ✅

## Overall result
3/3 eval steps PASS (add_habit_gate required a one-line gate fix).
Full test suite: 105 tests, all green. File: 200 lines (at limit).
