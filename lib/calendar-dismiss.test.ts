import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- Module mocks (must be hoisted before imports) ---

vi.mock('@/lib/supabase', () => ({
  adminClient: vi.fn(),
}))

vi.mock('@/lib/google-auth', () => ({
  getValidAccessToken: vi.fn(),
}))

vi.mock('@/lib/google-calendar', () => ({
  suppressEventInstance: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  writeLog: vi.fn(),
}))

import { dismissTodayReminder } from '@/lib/calendar-dismiss'
import { adminClient } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google-auth'
import { suppressEventInstance } from '@/lib/google-calendar'

// Builds a chainable Supabase mock that handles any number of .eq() calls
// before the terminal .maybeSingle() / .update().eq().then() calls.
function makeChain(resolvedData: unknown) {
  const terminal = { maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData }) }
  // Any .eq() call returns an object that itself is chainable (has .eq and .maybeSingle)
  const chainable: Record<string, unknown> = {}
  chainable.eq = vi.fn().mockReturnValue(chainable)
  chainable.maybeSingle = terminal.maybeSingle
  // .update().eq().then() path used by the EVENT_DELETED cleanup
  const thenFn = vi.fn().mockResolvedValue({})
  const updateEq = { eq: vi.fn().mockReturnValue({ then: thenFn }) }
  chainable.update = vi.fn().mockReturnValue(updateEq)
  return { select: vi.fn().mockReturnValue(chainable), ...chainable }
}

function makeDb(habitRow: unknown, userRow: unknown) {
  const habitChain = makeChain(habitRow)
  const userChain  = makeChain(userRow)
  const from = vi.fn().mockImplementation((table: string) =>
    table === 'habits' ? habitChain : userChain
  )
  return { from }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dismissTodayReminder bail conditions', () => {
  it('bails if habit has no google_calendar_event_id', async () => {
    const db = makeDb({ google_calendar_event_id: null, reminder_enabled: true }, null)
    vi.mocked(adminClient).mockReturnValue(db as never)

    await dismissTodayReminder({ userId: 'u1', habitId: 'h1', logDate: '2026-05-08' })

    expect(getValidAccessToken).not.toHaveBeenCalled()
    expect(suppressEventInstance).not.toHaveBeenCalled()
  })

  it('bails if reminder_enabled is false', async () => {
    const db = makeDb({ google_calendar_event_id: 'evt_1', reminder_enabled: false }, null)
    vi.mocked(adminClient).mockReturnValue(db as never)

    await dismissTodayReminder({ userId: 'u1', habitId: 'h1', logDate: '2026-05-08' })

    expect(suppressEventInstance).not.toHaveBeenCalled()
  })

  it('bails if user has calendar not connected', async () => {
    const db = makeDb(
      { google_calendar_event_id: 'evt_1', reminder_enabled: true },
      { google_calendar_connected: false, notification_prefs: {}, timezone: 'UTC' },
    )
    vi.mocked(adminClient).mockReturnValue(db as never)

    await dismissTodayReminder({ userId: 'u1', habitId: 'h1', logDate: '2026-05-08' })

    expect(suppressEventInstance).not.toHaveBeenCalled()
  })

  it('bails if auto_dismiss_when_logged is false in prefs', async () => {
    const db = makeDb(
      { google_calendar_event_id: 'evt_1', reminder_enabled: true },
      {
        google_calendar_connected: true,
        notification_prefs: { auto_dismiss_when_logged: false },
        timezone: 'UTC',
      },
    )
    vi.mocked(adminClient).mockReturnValue(db as never)

    await dismissTodayReminder({ userId: 'u1', habitId: 'h1', logDate: '2026-05-08' })

    expect(suppressEventInstance).not.toHaveBeenCalled()
  })

  it('bails if getValidAccessToken returns null', async () => {
    const db = makeDb(
      { google_calendar_event_id: 'evt_1', reminder_enabled: true },
      {
        google_calendar_connected: true,
        notification_prefs: { auto_dismiss_when_logged: true },
        timezone: 'UTC',
      },
    )
    vi.mocked(adminClient).mockReturnValue(db as never)
    vi.mocked(getValidAccessToken).mockResolvedValue(null)

    await dismissTodayReminder({ userId: 'u1', habitId: 'h1', logDate: '2026-05-08' })

    expect(suppressEventInstance).not.toHaveBeenCalled()
  })

  it('calls suppressEventInstance when all conditions pass', async () => {
    const db = makeDb(
      { google_calendar_event_id: 'evt_123', reminder_enabled: true },
      {
        google_calendar_connected: true,
        notification_prefs: { auto_dismiss_when_logged: true },
        timezone: 'America/New_York',
      },
    )
    vi.mocked(adminClient).mockReturnValue(db as never)
    vi.mocked(getValidAccessToken).mockResolvedValue('token_abc')
    vi.mocked(suppressEventInstance).mockResolvedValue(undefined)

    await dismissTodayReminder({ userId: 'u1', habitId: 'h1', logDate: '2026-05-08' })

    expect(suppressEventInstance).toHaveBeenCalledWith(
      'token_abc',
      'evt_123',
      '2026-05-08',
      'America/New_York',
    )
  })
})
