import { sanitizeUserInput } from '@/lib/sanitize'

// Shared types — imported by both google-calendar.ts and callers
export type CalendarEvent = {
  id: string
  title: string
  startTime: string
  endTime: string
  isAllDay: boolean
}

export type HabitTimeBlock = {
  habitName: string
  cue: string
  twoMinuteVersion: string
  suggestedTime: string
  userTimezone: string
  identityLabel?: string
  category?: string
  reminderMinutesBefore?: number[]
  emailReminderEnabled?: boolean
}

export const VALID_TIMES = new Set(['morning', 'midday', 'afternoon', 'evening', 'late_night'])

export const TIME_HOUR: Record<string, number> = {
  morning: 7,
  midday: 12,
  afternoon: 15,
  evening: 19,
  late_night: 21,
}

export const CATEGORY_EMOJI: Record<string, string> = {
  'Health & Fitness':  '🏃',
  'Career & Learning': '📚',
  'Relationships':     '💛',
  'Creativity':        '🎨',
  'Mindset & Energy':  '🧘',
}

// Builds the reminder overrides array for a Google Calendar event.
// Google caps at 5 overrides total — slice to stay safe.
export function buildReminders(
  minutesBefore: number[],
  emailEnabled: boolean,
): { useDefault: false; overrides: { method: string; minutes: number }[] } {
  const popups = minutesBefore.slice(0, emailEnabled ? 4 : 5).map((m) => ({
    method: 'popup',
    minutes: m,
  }))
  if (emailEnabled) popups.push({ method: 'email', minutes: 60 })
  return { useDefault: false, overrides: popups }
}

// Builds the event description — identity-first, cue, two-minute version, log link.
export function buildDescription(block: HabitTimeBlock): string {
  const lines: string[] = []
  if (block.identityLabel) {
    const safe = sanitizeUserInput(block.identityLabel, 'identity_label', null, { maxLength: 120, flagPatterns: false })
    lines.push(`You are becoming someone who ${safe.toLowerCase()}.`, '')
  }
  const safeCue = sanitizeUserInput(block.cue, 'cue', null, { maxLength: 300, flagPatterns: false })
  const safeTwoMin = sanitizeUserInput(block.twoMinuteVersion, 'two_minute_version', null, { maxLength: 200, flagPatterns: false })
  lines.push(`Cue: ${safeCue}`, `Start small: ${safeTwoMin}`, '')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  if (appUrl) lines.push(`Log it: ${appUrl}/dashboard`)
  return lines.join('\n')
}

// Builds a wall-clock date string (no 'Z') for tomorrow in the user's timezone.
// Avoids the UTC-shift bug that occurs when setHours() runs on a UTC server.
export function tomorrowDateStr(userTimezone: string): string {
  const todayInTz = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(new Date())
  const [y, mo, da] = todayInTz.split('-').map(Number)
  const tomorrow = new Date(y, mo - 1, da + 1)
  return new Intl.DateTimeFormat('en-CA').format(tomorrow)
}

// Produces a compact text block for the Architect's [CALENDAR CONTEXT].
// Titles are sanitized before injection.
export function formatEventsForContext(events: CalendarEvent[]): string {
  if (events.length === 0) return 'Calendar connected — no events in the next 2 weeks.'

  const lines = events.slice(0, 40).map((e) => {
    const safeTitle = sanitizeUserInput(e.title, 'calendar_event_title', null, {
      maxLength: 120,
      flagPatterns: false,
    })
    if (e.isAllDay) {
      const d = new Date(e.startTime + 'T00:00:00')
      return `- ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: ${safeTitle} (all day)`
    }
    const d = new Date(e.startTime)
    const time = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    return `- ${time}: ${safeTitle}`
  })

  return lines.join('\n')
}
