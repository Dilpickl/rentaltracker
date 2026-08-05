export type Tenant = {
  id: string
  name: string
  unit_address: string
  monthly_rent: number
  due_day: number
  archived: boolean
  created_at: string
}

export type Payment = {
  id: string
  tenant_id: string
  amount: number
  paid_on: string
  status: 'Paid' | 'Partial'
  created_at: string
}

export type Expense = {
  id: string
  tenant_id: string
  amount: number
  description: string
  incurred_on: string
  created_at: string
}

export type PaymentStatus = 'Paid' | 'Partial'

/** Adjust how many days before the due date counts as "Due soon". */
export const DUE_SOON_DAYS = 5

export type TenantStatusKind = 'paid' | 'due_soon' | 'overdue' | 'upcoming'

export type BillingPeriod = {
  /** Inclusive start (day after previous due date). */
  start: Date
  /** Due date for this period. */
  due: Date
  /** Exclusive end (day after due date) — payments on/after this belong to the next period. */
  endExclusive: Date
}

export type TenantStatus = {
  kind: TenantStatusKind
  label: string
  paidThisPeriod: number
  remaining: number
  dueDate: Date
  period: BillingPeriod
}
