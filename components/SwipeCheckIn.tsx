'use client'

import { useState, useCallback } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
  type PanInfo,
} from 'framer-motion'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HabitCard {
  id: string
  name: string
  description?: string
}

interface SwipeCheckInProps {
  habits: HabitCard[]
  onComplete: (completed: Set<string>) => void
}

const SWIPE_THRESHOLD = 100

const CardStack = ({
  habits,
  currentIndex,
  onSwipe,
}: {
  habits: HabitCard[]
  currentIndex: number
  onSwipe: (direction: 'left' | 'right') => void
}) => {
  const remaining = habits.slice(currentIndex)
  const visible = remaining.slice(0, 3)

  return (
    <div className="relative h-[340px] w-full max-w-[320px]">
      {visible
        .map((habit, stackIdx) => {
          if (stackIdx === 0) {
            return (
              <ActiveCard
                key={habit.id}
                habit={habit}
                onSwipe={onSwipe}
                index={currentIndex}
                total={habits.length}
              />
            )
          }
          return (
            <motion.div
              key={habit.id}
              className="absolute inset-0 rounded-3xl border border-border bg-card shadow-lg"
              style={{ zIndex: -stackIdx }}
              initial={false}
              animate={{
                scale: 1 - stackIdx * 0.05,
                y: stackIdx * 10,
                opacity: 1 - stackIdx * 0.2,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )
        })
        .reverse()}
    </div>
  )
}

const ActiveCard = ({
  habit,
  onSwipe,
  index,
  total,
}: {
  habit: HabitCard
  onSwipe: (direction: 'left' | 'right') => void
  index: number
  total: number
}) => {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-18, 18])
  const doneOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onSwipe('right')
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onSwipe('left')
    }
  }

  return (
    <motion.div
      className="absolute inset-0 z-10 cursor-grab touch-none active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="relative flex h-full flex-col items-center justify-center rounded-3xl border-2 border-border bg-card p-8 shadow-xl">
        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-primary/10"
          style={{ opacity: doneOpacity }}
        >
          <div className="rounded-full border-4 border-primary p-3">
            <Check size={40} className="text-primary" strokeWidth={3} />
          </div>
        </motion.div>

        <motion.div
          className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-3xl bg-destructive/10"
          style={{ opacity: skipOpacity }}
        >
          <div className="rounded-full border-4 border-destructive p-3">
            <X size={40} className="text-destructive" strokeWidth={3} />
          </div>
        </motion.div>

        <p className="font-body text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {index + 1} of {total}
        </p>
        <h3 className="mt-4 text-center font-heading text-2xl font-extrabold text-foreground">
          {habit.name}
        </h3>
        {habit.description && (
          <p className="mt-2 text-center font-body text-sm text-muted-foreground">
            {habit.description}
          </p>
        )}
        <p className="mt-8 font-body text-xs text-muted-foreground/60">
          Swipe right = done · left = not yet
        </p>
      </div>
    </motion.div>
  )
}

export default function SwipeCheckIn({ habits, onComplete }: SwipeCheckInProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [exiting, setExiting] = useState<{ id: string; dir: 'left' | 'right' } | null>(null)

  const handleSwipe = useCallback(
    (direction: 'left' | 'right') => {
      const habit = habits[currentIndex]
      if (!habit) return

      setExiting({ id: habit.id, dir: direction })

      if (direction === 'right') {
        setCompleted((prev) => new Set(prev).add(habit.id))
      }

      setTimeout(() => {
        setExiting(null)
        const nextIndex = currentIndex + 1
        if (nextIndex >= habits.length) {
          const finalCompleted = new Set(completed)
          if (direction === 'right') finalCompleted.add(habit.id)
          onComplete(finalCompleted)
        } else {
          setCurrentIndex(nextIndex)
        }
      }, 250)
    },
    [currentIndex, habits, completed, onComplete]
  )

  const allDone = currentIndex >= habits.length

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <motion.div
        className="mb-8 text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-heading text-2xl font-extrabold text-foreground">
          Daily Check-in ✨
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Did you do it today?
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!allDone && (
          <CardStack
            key={currentIndex}
            habits={habits}
            currentIndex={currentIndex}
            onSwipe={handleSwipe}
          />
        )}
      </AnimatePresence>

      {!allDone && (
        <div className="mt-8 flex items-center gap-8">
          <button
            onClick={() => handleSwipe('left')}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-destructive/30 bg-destructive/10 text-destructive transition-colors hover:bg-destructive/20"
          >
            <X size={24} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => handleSwipe('right')}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
          >
            <Check size={24} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  )
}
