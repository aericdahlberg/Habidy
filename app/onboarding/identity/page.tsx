'use client'

import { useState, useEffect, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft'

export default function Identity() {
  const router = useRouter()
  const { draft, loading, save } = useOnboardingDraft()
  const [text, setText] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (loading || hydrated) return
    setHydrated(true)
    if (draft?.identity) setText(draft.identity)
  }, [loading, draft, hydrated])

  const handleContinue = () => {
    if (!text.trim()) return
    sessionStorage.setItem('habidy_onboarding_identity', text.trim())
    save({ step: 'questionnaire', identity: text.trim() })
    router.push('/onboarding/questionnaire')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleContinue()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-purple-50">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 w-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-purple-50 px-6">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-heading text-3xl font-extrabold text-foreground sm:text-4xl">
          How would you describe who you are today, and how do you envision yourself evolving over the next year?
        </h2>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. I'm a college student who procrastinates a lot. In one year, I want to be disciplined, fit, and confident in interviews."
          className="mt-8 h-40 w-full resize-none rounded-lg border border-border bg-card p-4 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          autoFocus
        />

        <motion.button
          onClick={handleContinue}
          disabled={!text.trim()}
          className="mt-6 w-full rounded-full bg-primary px-8 py-4 font-heading text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
          whileHover={{ scale: text.trim() ? 1.02 : 1 }}
          whileTap={{ scale: text.trim() ? 0.98 : 1 }}
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  )
}
