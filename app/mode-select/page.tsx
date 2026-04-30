'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

type Mode = 'quick' | 'guided' | 'deep'

const MODES: {
  id: Mode
  icon: string
  title: string
  subtitle: string
  description: string
  badge: string
  badgeHighlight: boolean
  accent: string
  border: string
  badgeBg: string
  badgeText: string
  dest: string
}[] = [
  {
    id: 'quick',
    icon: '⚡',
    title: 'I know what I want',
    subtitle: '2 minutes',
    description: "Tell us the habit you have in mind. We'll help you make it stick.",
    badge: 'Quick start',
    badgeHighlight: false,
    accent: 'text-primary',
    border: 'border-primary/20 hover:border-primary/50',
    badgeBg: 'bg-primary/10',
    badgeText: 'text-primary',
    dest: '/quick-habit',
  },
  {
    id: 'guided',
    icon: '🧭',
    title: 'Give me some direction',
    subtitle: '7 minutes',
    description: "Answer a few questions and we'll find the right habit for your life.",
    badge: 'Recommended',
    badgeHighlight: true,
    accent: 'text-secondary',
    border: 'border-secondary/40 hover:border-secondary/70',
    badgeBg: 'bg-secondary',
    badgeText: 'text-white',
    dest: '/constellation',
  },
  {
    id: 'deep',
    icon: '🔮',
    title: 'Coach me through it',
    subtitle: '20 minutes',
    description: "A deep dive into your identity, motivations, and what's been getting in your way.",
    badge: 'Full experience',
    badgeHighlight: false,
    accent: 'text-amber-600',
    border: 'border-amber-200 hover:border-amber-400',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    dest: '/constellation',
  },
]

export default function ModeSelectPage() {
  const router = useRouter()

  async function selectMode(mode: Mode, dest: string) {
    sessionStorage.setItem('habidy_mode', mode)

    // Fire-and-forget — save to DB in background, don't block navigation
    fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }).catch(() => {})

    router.push(dest)
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-purple-50 via-white to-teal-50 px-5 pt-16 pb-10">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <img src="/mascot.png" alt="Hab-Idy" className="mx-auto mb-4 h-16 w-16 object-contain" />
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          How do you want to start?
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Choose the experience that fits you right now.
        </p>
      </motion.div>

      <div className="mx-auto w-full max-w-sm space-y-3">
        {MODES.map((m, i) => (
          <motion.button
            key={m.id}
            onClick={() => selectMode(m.id, m.dest)}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.1, duration: 0.35 }}
            whileTap={{ scale: 0.98 }}
            className={`relative w-full rounded-3xl border-2 bg-white px-5 py-5 text-left shadow-sm transition-all ${m.border} ${m.badgeHighlight ? 'ring-2 ring-secondary/30' : ''}`}
          >
            {/* Badge */}
            <span className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 font-body text-[10px] font-bold ${m.badgeBg} ${m.badgeText}`}>
              {m.badge}
            </span>

            <div className="flex items-start gap-4 pr-20">
              <span className="mt-0.5 text-3xl leading-none">{m.icon}</span>
              <div className="min-w-0">
                <p className={`font-heading text-base font-extrabold leading-snug ${m.accent}`}>
                  {m.title}
                </p>
                <p className="font-body text-xs font-semibold text-muted-foreground">
                  {m.subtitle}
                </p>
                <p className="mt-1.5 font-body text-sm leading-relaxed text-muted-foreground">
                  {m.description}
                </p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
