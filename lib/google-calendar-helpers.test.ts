import { describe, it, expect } from 'vitest'
import { buildReminders, buildDescription, tomorrowDateStr } from '@/lib/google-calendar-helpers'
import type { HabitTimeBlock } from '@/lib/google-calendar-helpers'

const BASE_BLOCK: HabitTimeBlock = {
  habitName: 'Morning Read',
  cue: 'After I make coffee, I will read',
  twoMinuteVersion: 'Read one paragraph',
  suggestedTime: 'morning',
  userTimezone: 'America/New_York',
}

describe('buildReminders', () => {
  it('produces popup overrides from minutes array', () => {
    const result = buildReminders([15, 5], false)
    expect(result.useDefault).toBe(false)
    expect(result.overrides).toEqual([
      { method: 'popup', minutes: 15 },
      { method: 'popup', minutes: 5 },
    ])
  })

  it('adds email override when emailEnabled is true', () => {
    const result = buildReminders([15, 5], true)
    expect(result.overrides).toHaveLength(3)
    expect(result.overrides.at(-1)).toEqual({ method: 'email', minutes: 60 })
  })

  it('caps total overrides at 5 (Google Calendar limit)', () => {
    const result = buildReminders([60, 45, 30, 15, 5], false)
    expect(result.overrides).toHaveLength(5)
  })

  it('caps at 4 popups when email is enabled to stay within 5 total', () => {
    const result = buildReminders([60, 45, 30, 15, 5], true)
    expect(result.overrides).toHaveLength(5)
    expect(result.overrides.filter((o) => o.method === 'popup')).toHaveLength(4)
    expect(result.overrides.filter((o) => o.method === 'email')).toHaveLength(1)
  })

  it('returns empty overrides array for empty minutes input', () => {
    const result = buildReminders([], false)
    expect(result.overrides).toHaveLength(0)
    expect(result.useDefault).toBe(false)
  })
})

describe('buildDescription', () => {
  it('includes cue and two-minute version', () => {
    const desc = buildDescription(BASE_BLOCK)
    expect(desc).toContain(BASE_BLOCK.cue)
    expect(desc).toContain(BASE_BLOCK.twoMinuteVersion)
  })

  it('includes identity reinforcement line when identityLabel is set', () => {
    const desc = buildDescription({ ...BASE_BLOCK, identityLabel: 'I AM A DAILY READER' })
    expect(desc).toContain('You are becoming someone who')
    expect(desc).toContain('i am a daily reader')
  })

  it('omits identity line when identityLabel is absent', () => {
    const desc = buildDescription(BASE_BLOCK)
    expect(desc).not.toContain('You are becoming someone who')
  })

  it('strips control characters from cue', () => {
    const desc = buildDescription({ ...BASE_BLOCK, cue: 'After coffee\x00\x1Fread' })
    expect(desc).not.toContain('\x00')
    expect(desc).not.toContain('\x1F')
  })
})

describe('tomorrowDateStr', () => {
  it('returns a YYYY-MM-DD string', () => {
    const result = tomorrowDateStr('America/New_York')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns a date one day after today in the given timezone', () => {
    const tz = 'America/New_York'
    const todayInTz = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
    const tomorrow = tomorrowDateStr(tz)
    const todayMs = new Date(todayInTz).getTime()
    const tomorrowMs = new Date(tomorrow).getTime()
    expect(tomorrowMs - todayMs).toBe(24 * 60 * 60 * 1000)
  })
})
