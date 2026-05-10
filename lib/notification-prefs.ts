export type NotificationPrefs = {
  email_reminder_enabled: boolean
  auto_dismiss_when_logged: boolean
  default_minutes_before: number[]  // e.g. [15, 0] = 15 min before + at start time
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email_reminder_enabled: false,
  auto_dismiss_when_logged: true,
  default_minutes_before: [15, 0],
}

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const defaults = DEFAULT_NOTIFICATION_PREFS
  if (!raw || typeof raw !== 'object') return defaults
  const r = raw as Record<string, unknown>
  return {
    email_reminder_enabled:
      typeof r.email_reminder_enabled === 'boolean'
        ? r.email_reminder_enabled
        : defaults.email_reminder_enabled,
    auto_dismiss_when_logged:
      typeof r.auto_dismiss_when_logged === 'boolean'
        ? r.auto_dismiss_when_logged
        : defaults.auto_dismiss_when_logged,
    default_minutes_before:
      Array.isArray(r.default_minutes_before) &&
      r.default_minutes_before.every((n) => typeof n === 'number')
        ? (r.default_minutes_before as number[])
        : defaults.default_minutes_before,
  }
}
