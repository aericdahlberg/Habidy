'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

type Props = {
  lastReviewAt: string | null
  habitsCount: number
}

const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000

function isReviewDue(lastReviewAt: string | null): boolean {
  if (!lastReviewAt) return true
  return Date.now() - new Date(lastReviewAt).getTime() >= MS_7_DAYS
}

export default function WeeklyReviewCard({ lastReviewAt, habitsCount }: Props) {
  const router = useRouter()

  if (habitsCount === 0 || !isReviewDue(lastReviewAt)) return null

  return (
    <motion.section
      className="px-6 pt-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <button
        onClick={() => router.push('/coach')}
        className="w-full rounded-3xl border border-secondary/30 bg-gradient-to-br from-secondary/10 to-secondary/5 p-5 text-left transition-all active:scale-[0.98]"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/20">
            <Sparkles size={20} className="text-secondary" />
          </div>
          <div className="flex-1">
            <p className="font-heading text-sm font-bold text-foreground">
              Weekly Check-In Ready
            </p>
            <p className="mt-0.5 font-body text-xs text-muted-foreground">
              Your coach has reviewed this week&apos;s habits and has thoughts for next week.
            </p>
          </div>
          <span className="font-heading text-xs font-bold text-secondary shrink-0 mt-0.5">
            Let&apos;s talk →
          </span>
        </div>
      </button>
    </motion.section>
  )
}
