/** Format a number as USD currency. */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** YYYY-MM-DD for today in local time. */
export function todayISODate(): string {
  return toISODate(new Date())
}

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC shift). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function endOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayAfter(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
}

/** Due date for a given year/month, clamped to valid days (e.g. 31 → 28/29 in Feb). */
export function dueDateInMonth(dueDay: number, year: number, monthIndex: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const day = Math.min(Math.max(1, dueDay), lastDay)
  return new Date(year, monthIndex, day)
}

/** Due date for the calendar month of `ref`. */
export function dueDateThisMonth(dueDay: number, ref = new Date()): Date {
  return dueDateInMonth(dueDay, ref.getFullYear(), ref.getMonth())
}

export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDay(b).getTime() - startOfDay(a).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}
