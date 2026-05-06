'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft'

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: 'easeOut' as const },
})

export default function Philosophy() {
  const router = useRouter()
  const { save } = useOnboardingDraft()

  const handleContinue = () => {
    save({ step: 'identity' })
    router.push('/onboarding/identity')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-purple-50 px-6 pb-12 pt-12">
      <div className="mx-auto flex max-w-md flex-col gap-10">
        <motion.div {...fadeUp(0.05)} className="space-y-3">
          <h1 className="font-heading text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl">
            Most people don&apos;t fail because they&apos;re lazy.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            They struggle because of misalignment — chasing goals that don&apos;t actually fit who they are.
          </p>
        </motion.div>

        <motion.section {...fadeUp(0.25)} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="font-medium text-foreground">There&apos;s a version of you that:</p>
          <ul className="space-y-2 text-foreground/85">
            <li className="flex gap-3"><span className="text-primary">✦</span> reads every morning</li>
            <li className="flex gap-3"><span className="text-primary">✦</span> moves their body without thinking</li>
            <li className="flex gap-3"><span className="text-primary">✦</span> ends the day feeling like they lived it on purpose</li>
          </ul>
          <p className="pt-2 text-sm leading-relaxed text-muted-foreground">
            That person isn&apos;t out of reach — they&apos;re built from the inside out.
          </p>
        </motion.section>

        <motion.section {...fadeUp(0.45)} className="space-y-3">
          <p className="leading-relaxed text-foreground/90">
            <span className="font-heading font-bold text-primary">Habidy</span> starts by understanding your real
            motivations — not surface-level goals, but the identity underneath them.
          </p>
          <p className="leading-relaxed text-foreground/90">
            Then we help you build the smallest possible habit to move toward that version of you, one day at a time.
          </p>
        </motion.section>

        <motion.div
          {...fadeUp(0.6)}
          className="rounded-2xl bg-gradient-to-br from-primary to-secondary p-6 text-center shadow-lg"
        >
          <p className="font-heading text-xl font-extrabold leading-snug text-primary-foreground sm:text-2xl">
            1% better every day
            <br />
            <span className="opacity-90">→ 37× better in a year.</span>
          </p>
        </motion.div>

        <motion.div {...fadeUp(0.75)} className="space-y-2 text-center">
          <p className="font-medium text-foreground">We&apos;re going to ask you a few questions.</p>
          <p className="text-sm text-muted-foreground">
            Be honest — the more real you are, the more this works.
          </p>
        </motion.div>

        <motion.div {...fadeUp(0.9)} className="sticky bottom-4">
          <button
            onClick={handleContinue}
            className="h-14 w-full rounded-full bg-primary font-heading text-base font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Let&apos;s figure out who you&apos;re becoming
          </button>
        </motion.div>
      </div>
    </div>
  )
}
