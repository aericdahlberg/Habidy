'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { loadDraft, deleteDraft } from '@/lib/onboarding-draft'

const DRAFT_STEP_ROUTES: Record<string, string> = {
  profile:       '/onboarding/profile',
  philosophy:    '/onboarding/philosophy',
  identity:      '/onboarding/identity',
  questionnaire: '/onboarding/questionnaire',
}

export default function WelcomePage() {
  const router = useRouter()

  useEffect(() => {
    async function checkAndRedirect() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('users')
        .select('new_user, identity_statement')
        .eq('id', user.id)
        .maybeSingle()

      if (data?.new_user === false && data?.identity_statement) {
        // Completed onboarding — clean up any stale draft and go to dashboard.
        deleteDraft(user.id)
        router.replace('/dashboard')
        return
      }

      // Ensure the users row exists before checking for a draft.
      await supabase
        .from('users')
        .upsert({ id: user.id, new_user: false }, { onConflict: 'id' })

      // Resume mid-onboarding if a draft exists.
      const draft = await loadDraft(user.id)
      const resumeRoute = draft ? (DRAFT_STEP_ROUTES[draft.step] ?? null) : null
      router.replace(resumeRoute ?? '/onboarding')
    }
    checkAndRedirect()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-teal-50">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
