'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const dots = [0, 1, 2, 3, 4]

export default function OnboardingLoading() {
  const router = useRouter()

  useEffect(() => {
    async function saveAndRedirect() {
      const { data: { user } } = await supabase.auth.getUser()

      const profile = JSON.parse(sessionStorage.getItem('habidy_onboarding_profile') ?? '{}')
      const identityStatement = sessionStorage.getItem('habidy_onboarding_identity') ?? ''
      const questionnaire = JSON.parse(sessionStorage.getItem('habidy_onboarding_questionnaire') ?? '{}')

      try {
        await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identity_statement: identityStatement,
            goal_category: questionnaire.focus ?? '',
            friction_point: (questionnaire.blockers?.[0]) ?? '',
            time_available: questionnaire.energyTime ?? '',
            user_id: user?.id ?? null,
            email: user?.email ?? profile.email ?? null,
            profile_name: profile.name ?? null,
            questionnaire,
          }),
        })
      } catch {
        // Non-fatal — continue to constellation even if save fails
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
