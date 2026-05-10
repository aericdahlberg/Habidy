import { sanitizeUserInput } from '@/lib/sanitize'
import {
  VALID_TIMES, TIME_HOUR, CATEGORY_EMOJI,
  buildReminders, buildDescription, tomorrowDateStr,
  type CalendarEvent,
} from '@/lib/google-calendar-helpers'
import type { HabitTimeBlock } from '@/lib/google-calendar-helpers'

export type { CalendarEvent } from '@/lib/google-calendar-helpers'
export type { HabitTimeBlock }  // re-exports the locally-imported type, satisfying TS6133
export { formatEventsForContext } from '@/lib/google-calendar-helpers'

export async function getCalendarEvents(
  accessToken: string,
  startDate: Date,
  endDate: Date,
): Promise<CalendarEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', startDate.toISOString())
  url.searchParams.set('timeMax', endDate.toISOString())
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '100')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status}`)

  const data = await res.json() as { items?: Record<string, unknown>[] }
  return (data.items ?? [])
    .filter((item) => item.status !== 'cancelled')
    .map((item) => {
      const start = item.start as { dateTime?: string; date?: string } | undefined
      const end = item.end as { dateTime?: string; date?: string } | undefined
      return {
        id: item.id as string,
        title: (item.summary as string | undefined) ?? '(No title)',
        startTime: start?.dateTime ?? start?.date ?? '',
        endTime: end?.dateTime ?? end?.date ?? '',
        isAllDay: !start?.dateTime,
      }
    })
}

export async function createRecurringHabitEvent(
  accessToken: string,
  block: import('@/lib/google-calendar-helpers').HabitTimeBlock,
): Promise<string> {
  const time = VALID_TIMES.has(block.suggestedTime) ? block.suggestedTime : 'morning'
  const hour = TIME_HOUR[time]
  const dateStr = tomorrowDateStr(block.userTimezone)
  const startStr = `${dateStr}T${String(hour).padStart(2, '0')}:00:00`
  const endStr   = `${dateStr}T${String(hour).padStart(2, '0')}:15:00`

  const emoji = block.category ? (CATEGORY_EMOJI[block.category] ?? '✨') : '✨'
  const safeName = sanitizeUserInput(block.habitName, 'habit_name', null, { maxLength: 120, flagPatterns: false })

  const event = {
    summary: `${emoji} ${safeName}`,
    description: buildDescription(block),
    start: { dateTime: startStr, timeZone: block.userTimezone },
    end:   { dateTime: endStr,   timeZone: block.userTimezone },
    recurrence: ['RRULE:FREQ=DAILY'],
    reminders: buildReminders(
      block.reminderMinutesBefore ?? [15, 0],
      block.emailReminderEnabled ?? false,
    ),
  }

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    },
  )
  if (!res.ok) throw new Error(`Calendar write error: ${res.status}`)
  const data = await res.json() as { id: string }
  return data.id
}

export async function updateRecurringHabitEvent(
  accessToken: string,
  eventId: string,
  block: import('@/lib/google-calendar-helpers').HabitTimeBlock,
): Promise<void> {
  const emoji = block.category ? (CATEGORY_EMOJI[block.category] ?? '✨') : '✨'
  const safeName = sanitizeUserInput(block.habitName, 'habit_name', null, { maxLength: 120, flagPatterns: false })
  const patch = {
    summary: `${emoji} ${safeName}`,
    description: buildDescription(block),
    reminders: buildReminders(
      block.reminderMinutesBefore ?? [15, 0],
      block.emailReminderEnabled ?? false,
    ),
  }
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    },
  )
  if (!res.ok) throw new Error(`Calendar PATCH error: ${res.status}`)
}

export async function suppressEventInstance(
  accessToken: string,
  eventId: string,
  logDate: string,
  userTimezone: string,
): Promise<void> {
  const dayStart = new Date(`${logDate}T00:00:00`)
  const dayEnd   = new Date(`${logDate}T23:59:59`)

  const tzOffset = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    timeZoneName: 'longOffset',
  }).formatToParts(dayStart).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0'

  const offsetMatch = tzOffset.match(/GMT([+-])(\d{2}):(\d{2})/)
  const offsetMinutes = offsetMatch
    ? (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3])) * (offsetMatch[1] === '+' ? -1 : 1)
    : 0

  const timeMinDate = new Date(dayStart.getTime() + offsetMinutes * 60000)
  const timeMaxDate = new Date(dayEnd.getTime()   + offsetMinutes * 60000)

  const listUrl = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}/instances`,
  )
  listUrl.searchParams.set('timeMin', timeMinDate.toISOString())
  listUrl.searchParams.set('timeMax', timeMaxDate.toISOString())
  listUrl.searchParams.set('maxResults', '1')

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!listRes.ok) {
    if (listRes.status === 404 || listRes.status === 410) throw new Error('EVENT_DELETED')
    throw new Error(`instances fetch error: ${listRes.status}`)
  }

  const listData = await listRes.json() as { items?: Array<{ id: string }> }
  const instance = listData.items?.[0]
  if (!instance) return

  const patchRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${instance.id}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminders: { useDefault: false, overrides: [] } }),
    },
  )
  if (!patchRes.ok) throw new Error(`instance PATCH error: ${patchRes.status}`)
}
