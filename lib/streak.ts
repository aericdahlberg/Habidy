export type HabitLog = {
  date: string       // ISO date string 'YYYY-MM-DD'
  completed: boolean
}

export type DayStatus = {
  date: string
  completed: boolean | null   // null = no log for that day
}

export function calculateStreak(logs: HabitLog[]): number {
  if (!logs.length) return 0

  // Sort descending by date
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  const today = toDateStr(new Date())
  const yesterday = toDateStr(addDays(new Date(), -1))

  // Streak must start from today or yesterday (if not yet logged today)
  const firstDate = sorted[0].date
  if (firstDate !== today && firstDate !== yesterday) return 0

  let streak = 0
  let cursor = firstDate === today ? new Date() : addDays(new Date(), -1)

  const logMap = new Map(sorted.map((l) => [l.date, l.completed]))

  while (true) {
    const dateStr = toDateStr(cursor)
    const completed = logMap.get(dateStr)
    if (completed === true) {
      streak++
      cursor = addDays(cursor, -1)
    } else {
      break
    }
  }

  return streak
}

export function getLast7Days(logs: HabitLog[]): DayStatus[] {
  const logMap = new Map(logs.map((l) => [l.date, l.completed]))
  const result: DayStatus[] = []

  for (let i = 6; i >= 0; i--) {
    const date = toDateStr(addDays(new Date(), -i))
    const completed = logMap.has(date) ? logMap.get(date)! : null
    result.push({ date, completed })
  }

  return result
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}
