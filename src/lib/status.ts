import {
  daysBetween,
  dueDateThisMonth,
  parseLocalDate,
  startOfDay,
  toISODate,
} from './dates'
import {
  DUE_SOON_DAYS,
  type BillingPeriod,
  type Payment,
  type Tenant,
  type TenantStatus,
} from '../types'

/**
 * Active period is always the current calendar month's due date.
 * Payments count if dated in that same calendar month — including partials
 * paid after the due day — so remaining balance updates correctly.
 * When the calendar month rolls, previous-month payments no longer count.
 */
export function getActiveBillingPeriod(
  dueDay: number,
  _monthlyRent: number,
  _payments: Payment[],
  ref = new Date(),
): BillingPeriod {
  const due = dueDateThisMonth(dueDay, ref)
  const monthStart = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const nextMonthStart = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
  return {
    start: monthStart,
    due: startOfDay(due),
    endExclusive: nextMonthStart,
  }
}

/** Payment counts toward a period when it falls in that period's calendar month. */
export function isPaymentInPeriod(paidOn: string, period: BillingPeriod): boolean {
  const date = startOfDay(parseLocalDate(paidOn))
  return date >= period.start && date < period.endExclusive
}

export function paidAmountInPeriod(payments: Payment[], period: BillingPeriod): number {
  return payments
    .filter((p) => isPaymentInPeriod(p.paid_on, period))
    .reduce((sum, p) => sum + Number(p.amount), 0)
}

export function getTenantStatus(
  tenant: Tenant,
  payments: Payment[],
  ref = new Date(),
  options?: { excludePaymentId?: string },
): TenantStatus {
  const rent = Number(tenant.monthly_rent)
  const relevant = options?.excludePaymentId
    ? payments.filter((p) => p.id !== options.excludePaymentId)
    : payments

  const period = getActiveBillingPeriod(tenant.due_day, rent, relevant, ref)
  const paidThisPeriod = paidAmountInPeriod(relevant, period)
  const remaining = Math.max(0, Math.round((rent - paidThisPeriod) * 100) / 100)
  const dueDate = period.due

  if (remaining <= 0) {
    return {
      kind: 'paid',
      label: 'Paid',
      paidThisPeriod,
      remaining: 0,
      dueDate,
      period,
    }
  }

  const daysUntilDue = daysBetween(ref, dueDate)

  if (daysUntilDue < 0) {
    return {
      kind: 'overdue',
      label: 'Overdue',
      paidThisPeriod,
      remaining,
      dueDate,
      period,
    }
  }

  if (daysUntilDue <= DUE_SOON_DAYS) {
    return {
      kind: 'due_soon',
      label: 'Due soon',
      paidThisPeriod,
      remaining,
      dueDate,
      period,
    }
  }

  return {
    kind: 'upcoming',
    label: 'Upcoming',
    paidThisPeriod,
    remaining,
    dueDate,
    period,
  }
}

export function paymentLabel(amount: number, monthlyRent: number): 'Paid' | 'Partial' {
  return amount >= Number(monthlyRent) ? 'Paid' : 'Partial'
}

/** Sort: overdue first, then due soon, then upcoming, then paid. */
const STATUS_ORDER: Record<TenantStatus['kind'], number> = {
  overdue: 0,
  due_soon: 1,
  upcoming: 2,
  paid: 3,
}

export function compareTenantStatus(a: TenantStatus, b: TenantStatus): number {
  return STATUS_ORDER[a.kind] - STATUS_ORDER[b.kind]
}

export function periodRangeLabel(period: BillingPeriod): string {
  return `${toISODate(period.start)} → ${toISODate(period.due)}`
}
