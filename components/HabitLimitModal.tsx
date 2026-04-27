'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ExistingHabit {
  id: string
  habit_name: string
}

interface Props {
  open: boolean
  newHabitName: string
  existingHabits: ExistingHabit[]
  maxHabits: number
  onClose: () => void
  onReplace: (habitIdToRemove: string) => void
}

export default function HabitLimitModal({
  open,
  newHabitName,
  existingHabits,
  maxHabits,
  onClose,
  onReplace,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-heading text-lg font-extrabold text-foreground">
              Habit limit reached!
            </h3>
            <p className="mt-2 font-body text-sm text-muted-foreground">
              You can track up to {maxHabits} habits. Replace one to add{' '}
              <span className="font-semibold text-primary">{newHabitName}</span>.
            </p>

            <div className="mt-4 space-y-2">
              {existingHabits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => onReplace(habit.id)}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-destructive hover:bg-destructive/10"
                >
                  <p className="font-heading text-sm font-bold text-foreground">
                    {habit.habit_name}
                  </p>
                  <p className="text-xs text-muted-foreground">Tap to replace</p>
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="mt-4 w-full rounded-full border border-border py-3 font-heading text-sm font-bold text-muted-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
