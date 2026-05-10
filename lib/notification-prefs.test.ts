import { describe, it, expect } from 'vitest'
import { parseNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from '@/lib/notification-prefs'

describe('parseNotificationPrefs', () => {
  it('returns defaults for null input', () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS)
  })

  it('returns defaults for undefined input', () => {
    expect(parseNotificationPrefs(undefined)).toEqual(DEFAULT_NOTIFICATION_PREFS)
  })

  it('returns defaults for non-object input', () => {
    expect(parseNotificationPrefs('bad')).toEqual(DEFAULT_NOTIFICATION_PREFS)
    expect(parseNotificationPrefs(42)).toEqual(DEFAULT_NOTIFICATION_PREFS)
  })

  it('returns defaults for empty object', () => {
    expect(parseNotificationPrefs({})).toEqual(DEFAULT_NOTIFICATION_PREFS)
  })

  it('parses a fully valid prefs object', () => {
    const input = { email_reminder_enabled: true, auto_dismiss_when_logged: false, default_minutes_before: [30, 5] }
    expect(parseNotificationPrefs(input)).toEqual(input)
  })

  it('falls back field-by-field for partial objects', () => {
    const result = parseNotificationPrefs({ email_reminder_enabled: true })
    expect(result.email_reminder_enabled).toBe(true)
    expect(result.auto_dismiss_when_logged).toBe(DEFAULT_NOTIFICATION_PREFS.auto_dismiss_when_logged)
    expect(result.default_minutes_before).toEqual(DEFAULT_NOTIFICATION_PREFS.default_minutes_before)
  })

  it('ignores non-boolean values for boolean fields', () => {
    const result = parseNotificationPrefs({ email_reminder_enabled: 'yes', auto_dismiss_when_logged: 1 })
    expect(result.email_reminder_enabled).toBe(DEFAULT_NOTIFICATION_PREFS.email_reminder_enabled)
    expect(result.auto_dismiss_when_logged).toBe(DEFAULT_NOTIFICATION_PREFS.auto_dismiss_when_logged)
  })

  it('ignores non-number-array values for default_minutes_before', () => {
    const result = parseNotificationPrefs({ default_minutes_before: ['30', '5'] })
    expect(result.default_minutes_before).toEqual(DEFAULT_NOTIFICATION_PREFS.default_minutes_before)
  })

  it('accepts an empty array for default_minutes_before', () => {
    const result = parseNotificationPrefs({ default_minutes_before: [] })
    expect(result.default_minutes_before).toEqual([])
  })
})
