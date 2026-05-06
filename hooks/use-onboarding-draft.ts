'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { loadDraft, saveDraft, deleteDraft, type OnboardingDraft } from '@/lib/onboarding-draft'

export type { OnboardingDraft }

export function useOnboardingDraft() {
  const [draft, setDraft] = useState<OnboardingDraft | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    let cancelled = false

    async function init() {
      // Retry: session cookie may not be ready immediately after signup.
      let user = null
      for (let i = 0; i < 3; i++) {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u?.id) { user = u; break }
        if (i < 2) await new Promise((r) => setTimeout(r, 300))
      }

      if (cancelled) return

      if (user?.id) {
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        const d = await loadDraft(user.id)
        if (cancelled) return
        setDraft(d)

        // Re-populate sessionStorage so loading/page.tsx works after a browser restart.
        if (d) {
          if (d.profile) sessionStorage.setItem('habidy_onboarding_profile', JSON.stringify(d.profile))
          if (d.identity) sessionStorage.setItem('habidy_onboarding_identity', d.identity)
          if (d.questionnaire) sessionStorage.setItem('habidy_onboarding_questionnaire', JSON.stringify(d.questionnaire))
        }
      }

      if (!cancelled) setLoading(false)
    }

    init()
    return () => { cancelled = true }
  }, [])

  const save = (data: Partial<OnboardingDraft> & { step: string }) => {
    if (userId) saveDraft(userId, data)
  }

  const remove = () => {
    if (userId) deleteDraft(userId)
  }

  return { draft, loading, userId, userEmail, save, remove }
}
