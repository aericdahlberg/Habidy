import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Returns today's date as YYYY-MM-DD in the device's local timezone.
// Never use toISOString().split('T')[0] for log dates — that's UTC and breaks
// for users west of UTC after their local midnight.
export function localDateStr(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}
