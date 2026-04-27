'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function OnboardingWelcome() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-purple-50 px-6 text-center">
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <img src="/mascot.png" alt="Habidy mascot" width={200} height={200} className="mx-auto mb-6" />
      </motion.div>

      <motion.h1
        className="font-heading text-5xl font-black tracking-tight text-primary sm:text-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Habidy
      </motion.h1>

      <motion.p
        className="mt-4 max-w-md text-lg font-medium text-foreground/80"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        We&apos;re here to help you become the person you know you can be.
      </motion.p>

      <motion.button
        onClick={() => router.push('/onboarding/profile')}
        className="mt-10 rounded-full bg-primary px-10 py-4 font-heading text-lg font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Get Started
      </motion.button>
    </div>
  )
}
