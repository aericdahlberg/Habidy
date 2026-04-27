'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const dots = [0, 1, 2, 3, 4]

// Retry getting the auth user — session cookie may not be set immediately
// after signup, especially on first render.
async function getAuthUser(attempts = 5, delayMs = 300) {
  for (let i = 0; i < attempts; i++) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) return user
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs))
  }
  return null
}

export default function OnboardingLoading() {
  const router = useRouter()
  const ran = useRef(false) // prevent React StrictMode double-invoke

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function saveAndRedirect() {
      const user = await getAuthUser()

      const profile = JSON.parse(sessionStorage.getItem('habidy_onboarding_profile') ?? '{}')
      const identityStatement = sessionStorage.getItem('habidy_onboarding_identity') ?? ''
      const questionnaire = JSON.parse(sessionStorage.getItem('habidy_onboarding_questionnaire') ?? '{}')

      // Persist under consistent keys BEFORE clearing — constellation reads these
      if (identityStatement) sessionStorage.setItem('habidy_identity', identityStatement)
      if (questionnaire.focus) sessionStorage.setItem('habidy_goal_category', questionnaire.focus)
      if (questionnaire.blockers?.length) sessionStorage.setItem('habidy_friction_point', questionnaire.blockers[0])
      if (questionnaire.energyTime) sessionStorage.setItem('habidy_time_available', questionnaire.energyTime)
      if (profile.name) sessionStorage.setItem('habidy_display_name', profile.name)
      sessionStorage.setItem('habidy_questionnaire', JSON.stringify(questionnaire))

      if (!user?.id) {
        // No auth session after retries — still continue, but onboarding won't save to DB
        console.warn('[onboarding/loading] No auth user found after retries — skipping DB save')
        sessionStorage.removeItem('habidy_onboarding_profile')
        sessionStorage.removeItem('habidy_onboarding_identity')
        sessionStorage.removeItem('habidy_onboarding_questionnaire')
        setTimeout(() => router.replace('/constellation'), 2500)
        return
      }

      console.log('[onboarding/loading] auth user confirmed:', user.id)

      try {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity_statement: identityStatement,
            goal_category: questionnaire.focus ?? '',
            friction_point: (questionnaire.blockers?.[0]) ?? '',
            time_available: questionnaire.energyTime ?? '',
            user_id: user.id,
            email: user.email ?? profile.email ?? null,
            profile_name: profile.name ?? null,
            questionnaire,
          }),
        })

        if (!res.ok) {
          const raw = await res.text()
          let parsed: unknown = raw
          try { parsed = JSON.parse(raw) } catch { /* keep raw text */ }
          console.error('[onboarding/loading] API error', res.status, parsed)
        } else {
          const json = await res.json().catch(() => ({}))
          console.log('[onboarding/loading] saved:', json?.user?.id ?? 'unknown')
        }
      } catch (err) {
        console.error('[onboarding/loading] fetch failed:', err)
      }

      sessionStorage.removeItem('habidy_onboarding_profile')
      sessionStorage.removeItem('habidy_onboarding_identity')
      sessionStorage.removeItem('habidy_onboarding_questionnaire')

      setTimeout(() => router.replace('/constellation'), 2500)
    }

    saveAndRedirect()
  }, [router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-purple-50 px-6 text-center">
      <motion.img
        src="/mascot.png"
        alt="Habidy mascot"
        width={160}
        height={160}
        className="mb-8"
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.h2
        className="font-heading text-3xl font-extrabold text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Building your path…
      </motion.h2>

      <div className="mt-8 flex gap-3">
        {dots.map((i) => (
          <motion.div
            key={i}
            className="h-4 w-4 rounded-full bg-primary"
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>

      <motion.p
        className="mt-6 text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Getting ready to meet your Identity Gatherer…
      </motion.p>
    </div>
  )
}
