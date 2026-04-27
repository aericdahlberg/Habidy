'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WelcomePage() {
  const router = useRouter()

  useEffect(() => {
    async function checkAndRedirect() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('users')
        .select('new_user, identity_statement')
        .eq('id', user.id)
        .maybeSingle()

      if (data?.new_user === false && data?.identity_statement) {
        router.replace('/dashboard')
      } else {
        // Mark welcome as seen and go to new onboarding
        if (user) {
          await supabase.from('users').update({ new_user: false }).eq('id', user.id)
        }
        router.replace('/onboarding')
      }
    }
    checkAndRedirect()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-white to-teal-50">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-full bg-primary animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
