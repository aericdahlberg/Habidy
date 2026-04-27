'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']

const inputClass =
  'w-full rounded-xl border border-border bg-card px-4 py-3.5 font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all'

const dobInputClass =
  'rounded-xl border border-border bg-card px-3 py-3.5 font-body text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all'

export default function ProfileSetup() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')
  const [gender, setGender] = useState('')
  const [address, setAddress] = useState('')
  const [pushNotifications, setPushNotifications] = useState(false)
  const [dataSharing, setDataSharing] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [genderOpen, setGenderOpen] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const parseDob = (): Date | null => {
    const d = parseInt(dobDay, 10)
    const m = parseInt(dobMonth, 10)
    const y = parseInt(dobYear, 10)
    if (!d || !m || !y) return null
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1920 || y > new Date().getFullYear()) return null
    const date = new Date(y, m - 1, d)
    if (date > new Date()) return null
    return date
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (!parseDob()) e.dob = 'Please enter a valid date of birth'
    if (!gender) e.gender = 'Please select a gender'
    if (!termsAccepted) e.terms = 'You must accept the terms'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinue = async () => {
    if (!validate()) return

    const { data: { user } } = await supabase.auth.getUser()

    const profile = {
      name: name.trim(),
      dob: parseDob()!.toISOString(),
      gender,
      address: address.trim(),
      pushNotifications,
      dataSharing,
      email: user?.email ?? '',
    }

    sessionStorage.setItem('habidy_onboarding_profile', JSON.stringify(profile))
    router.push('/onboarding/philosophy')
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-teal-50 to-purple-50 px-6 pb-10 pt-14">
      <motion.div
        className="mx-auto w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <h2 className="font-heading text-3xl font-extrabold text-foreground">
          Let&apos;s get to know you
        </h2>
        <p className="mt-2 font-body text-sm text-muted-foreground">
          We&apos;ll use this to personalise your experience.
        </p>

        <div className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block font-heading text-sm font-bold text-foreground">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={cn(inputClass, errors.name && 'border-destructive ring-1 ring-destructive')}
              maxLength={100}
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-bold text-foreground">
              Date of Birth
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { val: dobDay, set: setDobDay, max: 2, placeholder: 'DD', label: 'Day' },
                { val: dobMonth, set: setDobMonth, max: 2, placeholder: 'MM', label: 'Month' },
                { val: dobYear, set: setDobYear, max: 4, placeholder: 'YYYY', label: 'Year' },
              ].map(({ val, set, max, placeholder, label }) => (
                <div key={label}>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={val}
                    onChange={(e) => set(e.target.value.slice(0, max))}
                    placeholder={placeholder}
                    className={cn(dobInputClass, 'w-full', errors.dob && 'border-destructive ring-1 ring-destructive')}
                  />
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            {errors.dob && <p className="mt-1 text-xs text-destructive">{errors.dob}</p>}
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-bold text-foreground">
              Gender
            </label>
            <div className="relative">
              <button
                onClick={() => setGenderOpen(!genderOpen)}
                className={cn(
                  inputClass,
                  'flex items-center justify-between text-left',
                  !gender && 'text-muted-foreground',
                  errors.gender && 'border-destructive ring-1 ring-destructive'
                )}
              >
                {gender || 'Select gender'}
                <ChevronDown size={18} className={cn('text-muted-foreground transition-transform', genderOpen && 'rotate-180')} />
              </button>
              {genderOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-border bg-card shadow-lg"
                >
                  {GENDER_OPTIONS.map((g, idx) => (
                    <button
                      key={g}
                      onClick={() => { setGender(g); setGenderOpen(false) }}
                      className={cn(
                        'w-full px-4 py-3 text-left font-body text-sm transition-colors hover:bg-muted',
                        g === gender && 'font-bold text-primary',
                        idx === 0 && 'rounded-t-xl',
                        idx === GENDER_OPTIONS.length - 1 && 'rounded-b-xl'
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>
            {errors.gender && <p className="mt-1 text-xs text-destructive">{errors.gender}</p>}
          </div>

          <div>
            <label className="mb-1.5 block font-heading text-sm font-bold text-foreground">
              Home Address <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, State"
              className={inputClass}
              maxLength={300}
            />
          </div>

          <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
            <p className="font-heading text-sm font-bold text-foreground">Permissions</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm font-semibold text-foreground">Push Notifications</p>
                <p className="font-body text-xs text-muted-foreground">Get daily nudges & motivation</p>
              </div>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm font-semibold text-foreground">Data & Analytics Sharing</p>
                <p className="font-body text-xs text-muted-foreground">Help us improve Habidy anonymously</p>
              </div>
              <Switch checked={dataSharing} onCheckedChange={setDataSharing} />
            </div>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-border accent-primary"
            />
            <span className="font-body text-sm text-foreground">
              I agree to the{' '}
              <span className="font-semibold text-primary underline">Terms & Conditions</span>{' '}
              and{' '}
              <span className="font-semibold text-primary underline">Privacy Policy</span>
            </span>
          </label>
          {errors.terms && <p className="-mt-3 text-xs text-destructive">{errors.terms}</p>}
        </div>

        <motion.button
          onClick={handleContinue}
          className="mt-8 w-full rounded-full bg-primary px-8 py-4 font-heading text-lg font-bold text-primary-foreground shadow-lg"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  )
}
