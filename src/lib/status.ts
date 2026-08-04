import {
  dayAfter,
  daysBetween,
  dueDateInMonth,
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

/** Period tied to a specific due date: (prevDue, due] as [dayAfter(prevDue), dayAfter(due)). */
export function getPeriodForDueDate(dueDay: number, due: Date): BillingPeriod {
  const prev = new Date(due.getFullYear(), due.getMonth() - 1, 1)
  const prevDue = dueDateInMonth(dueDay, prev.getFullYear(), prev.getMonth())
  return {
    start: dayAfter(prevDue),
    due: startOfDay(due),
    endExclusive: dayAfter(due),
  }
}

/**
 * Active billing period for status / "collected this month".
 *
 * Periods tile by due day: after the due date, a new period starts the next day.
 * If this month's period is unpaid, we keep showing it as overdue until the next
 * due date arrives — then we roll forward automatically (previous payments no
 * longer count toward the new period).
 */
export function getActiveBillingPeriod(
  dueDay: number,
  monthlyRent: number,
  payments: Payment[],
  ref = new Date(),
): BillingPeriod {
  const today = startOfDay(ref)
  const dueThis = dueDateThisMonth(dueDay, ref)
  const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
  const dueNext = dueDateInMonth(dueDay, nextMonth.getFullYear(), nextMonth.getMonth())

  const thisPeriod = getPeriodForDueDate(dueDay, dueThis)
  const nextPeriod = getPeriodForDueDate(dueDay, dueNext)

  // Still inside this month's period window (through the due date).
  if (today < thisPeriod.endExclusive) {
    return thisPeriod
  }

  // Past due: stay on this period while unpaid, until the next due date.
  const paid = paidAmountInPeriod(payments, thisPeriod)
  if (paid < monthlyRent && today < startOfDay(dueNext)) {
    return thisPeriod
  }

  return nextPeriod
}

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
