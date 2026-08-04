import { daysBetween, dueDateThisMonth, parseLocalDate, startOfMonth, endOfMonth, toISODate } from './dates'
import { DUE_SOON_DAYS, type Payment, type Tenant, type TenantStatus } from '../types'

export function isPaymentInCurrentMonth(paidOn: string, ref = new Date()): boolean {
  const date = parseLocalDate(paidOn)
  return date >= startOfMonth(ref) && date <= endOfMonth(ref)
}

export function paidAmountThisMonth(payments: Payment[], ref = new Date()): number {
  return payments
    .filter((p) => isPaymentInCurrentMonth(p.paid_on, ref))
    .reduce((sum, p) => sum + Number(p.amount), 0)
}

export function getTenantStatus(
  tenant: Tenant,
  payments: Payment[],
  ref = new Date(),
): TenantStatus {
  const rent = Number(tenant.monthly_rent)
  const paidThisMonth = paidAmountThisMonth(payments, ref)
  const remaining = Math.max(0, Math.round((rent - paidThisMonth) * 100) / 100)
  const dueDate = dueDateThisMonth(tenant.due_day, ref)

  if (remaining <= 0) {
    return {
      kind: 'paid',
      label: 'Paid',
      paidThisMonth,
      remaining: 0,
      dueDate,
    }
  }

  const daysUntilDue = daysBetween(ref, dueDate)

  if (daysUntilDue < 0) {
    return {
      kind: 'overdue',
      label: 'Overdue',
      paidThisMonth,
      remaining,
      dueDate,
    }
  }

  if (daysUntilDue <= DUE_SOON_DAYS) {
    return {
      kind: 'due_soon',
      label: 'Due soon',
      paidThisMonth,
      remaining,
      dueDate,
    }
  }

  return {
    kind: 'upcoming',
    label: 'Upcoming',
    paidThisMonth,
    remaining,
    dueDate,
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

export function currentMonthRangeISO(ref = new Date()): { from: string; to: string } {
  return {
    from: toISODate(startOfMonth(ref)),
    to: toISODate(endOfMonth(ref)),
  }
}
