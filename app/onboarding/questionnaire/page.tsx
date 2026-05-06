'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { useOnboardingDraft } from '@/hooks/use-onboarding-draft'

type QType = 'single' | 'multi'
type Answers = Record<string, string | string[]>

interface Question {
  key: string
  label: string
  type: QType
  options: string[]
  maxSelect?: number
}

const TIME_OPTIONS = ['Morning (before work/school)', 'Midday', 'Afternoon', 'Evening', 'Late night', 'It varies']

const SCREENS: { title: string; subtitle: string; questions: Question[] }[] = [
  {
    title: 'Who you are',
    subtitle: 'Quick context. No wrong answers.',
    questions: [
      { key: 'focus', label: "What's your #1 focus right now?", type: 'single', options: ['Sleep & recovery', 'Stress & mental health', 'Building a new skill', 'Fitness & movement', 'Productivity', 'Creativity', 'Exploring / not sure yet'] },
      { key: 'goalClarity', label: "How would you describe where you're at with your goals?", type: 'single', options: ['I know exactly what I want, I just need to do it', "I have a sense of direction but it's fuzzy", "I'm still figuring out what matters to me"] },
      { key: 'blockers', label: "What's your biggest blocker right now? (pick up to 2)", type: 'multi', maxSelect: 2, options: ["Time — I don't have enough of it", 'Consistency — I start strong then stop', "Motivation — I know what to do but don't do it", "Clarity — I'm not sure what to focus on", 'Accountability — I need someone/something to check in', 'Overwhelm — too much going on to add anything new'] },
    ],
  },
  {
    title: 'Your day',
    subtitle: 'Help us understand your energy and schedule.',
    questions: [
      { key: 'energyTime', label: 'When do you have the most mental energy?', type: 'single', options: TIME_OPTIONS },
      { key: 'stickTime', label: 'When are you most likely to stick to something new?', type: 'single', options: TIME_OPTIONS },
      { key: 'sleep', label: 'How much sleep do you get on a typical night?', type: 'single', options: ['Under 5h', '5–6h', '6–7h', '7–8h', '8h+'] },
      { key: 'stress', label: 'How stressed are you right now on average?', type: 'single', options: ['Pretty calm', 'Busy but okay', 'Noticeably stressed', 'Running on empty'] },
    ],
  },
  {
    title: 'Your habits',
    subtitle: "We'll use this to build around your real life.",
    questions: [
      { key: 'anchorHabits', label: 'Which of these do you already do every day without thinking?', type: 'multi', options: ['Make coffee/tea', 'Brush teeth', 'Eat breakfast', 'Commute', 'Lunch break', 'Come home from work', 'Eat dinner', 'Watch TV', 'Scroll phone before bed'] },
      { key: 'wastedTime', label: 'Is there a time in your day that feels wasted?', type: 'single', options: ['Morning before work', 'Commute', 'Lunch', 'After work wind-down', 'Before bed', "I'm not sure"] },
      { key: 'location', label: 'Where do you spend most of your time?', type: 'single', options: ['Home office', 'Kitchen', 'Bedroom', 'Gym', 'Commuting', 'Office/school', 'Mix'] },
    ],
  },
]

export default function Questionnaire() {
  const router = useRouter()
  const { draft, loading, save } = useOnboardingDraft()
  const [answers, setAnswers] = useState<Answers>({})
  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  const totalScreens = SCREENS.length
  const currentScreen = SCREENS[step]

  // Restore answers and sub-page from draft.
  useEffect(() => {
    if (loading || hydrated) return
    setHydrated(true)
    if (draft?.questionnaire) setAnswers(draft.questionnaire as Answers)
    if (typeof draft?.questionnaire_page === 'number') setStep(draft.questionnaire_page)
  }, [loading, draft, hydrated])

  const isScreenComplete = useMemo(() => {
    if (step >= totalScreens) return true
    return currentScreen.questions.every((q) => {
      const v = answers[q.key]
      if (q.type === 'multi') return Array.isArray(v) && v.length > 0
      return typeof v === 'string' && v.length > 0
    })
  }, [answers, currentScreen, step, totalScreens])

  const selectSingle = (key: string, value: string) => setAnswers((a) => ({ ...a, [key]: value }))

  const toggleMulti = (key: string, value: string, max?: number) => {
    setAnswers((a) => {
      const arr = (a[key] as string[] | undefined) ?? []
      if (arr.includes(value)) return { ...a, [key]: arr.filter((v) => v !== value) }
      if (max && arr.length >= max) return { ...a, [key]: [...arr.slice(1), value] }
      return { ...a, [key]: [...arr, value] }
    })
  }

  const handleNext = () => {
    if (step < totalScreens - 1) {
      save({ step: 'questionnaire', questionnaire: answers, questionnaire_page: step + 1 })
      setStep(step + 1)
    } else {
      sessionStorage.setItem('habidy_onboarding_questionnaire', JSON.stringify(answers))
      router.push('/onboarding/loading')
    }
  }

  const handleBack = () => {
    if (step === 0) {
      save({ step: 'identity', questionnaire: answers, questionnaire_page: 0 })
      router.push('/onboarding/identity')
    } else {
      save({ step: 'questionnaire', questionnaire: answers, questionnaire_page: step - 1 })
      setStep(step - 1)
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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 to-purple-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 gap-2">
            {SCREENS.map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>
          <span className="font-body text-sm font-semibold text-muted-foreground">{step + 1}/{totalScreens}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="mt-6 flex-1"
          >
            <h2 className="font-heading text-2xl font-extrabold text-foreground sm:text-3xl">{currentScreen.title}</h2>
            <p className="mt-1 font-body text-muted-foreground">{currentScreen.subtitle}</p>

            <div className="mt-6 space-y-8 pb-32">
              {currentScreen.questions.map((q) => (
                <div key={q.key}>
                  <h3 className="font-heading text-base font-bold text-foreground">{q.label}</h3>
                  <div className="mt-3 grid gap-2">
                    {q.options.map((opt) => {
                      const isSelected =
                        q.type === 'single'
                          ? answers[q.key] === opt
                          : Array.isArray(answers[q.key]) && (answers[q.key] as string[]).includes(opt)
                      return (
                        <button
                          key={opt}
                          onClick={() => q.type === 'single' ? selectSingle(q.key, opt) : toggleMulti(q.key, opt, q.maxSelect)}
                          className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3.5 text-left font-body text-sm font-medium transition-all ${isSelected ? 'border-primary bg-primary/10 text-foreground' : 'border-border bg-card text-foreground hover:border-primary/40'}`}
                        >
                          <span>{opt}</span>
                          {isSelected && (
                            <span className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                              <Check className="h-4 w-4" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="sticky bottom-0 left-0 right-0 -mx-6 border-t border-border bg-background/95 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg gap-3">
          <button onClick={handleBack} className="rounded-full border border-border bg-card px-6 py-3 font-heading font-bold text-foreground">
            Back
          </button>
          <motion.button
            onClick={handleNext}
            disabled={!isScreenComplete}
            whileTap={{ scale: isScreenComplete ? 0.97 : 1 }}
            className="flex-1 rounded-full bg-primary px-6 py-3 font-heading text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-40"
          >
            {step === totalScreens - 1 ? 'Done' : 'Continue'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
