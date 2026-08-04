export type Tenant = {
  id: string
  name: string
  unit_address: string
  monthly_rent: number
  due_day: number
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

export type PaymentStatus = 'Paid' | 'Partial'

/** Adjust how many days before the due date counts as "Due soon". */
export const DUE_SOON_DAYS = 5

export type TenantStatusKind = 'paid' | 'due_soon' | 'overdue' | 'upcoming'

export type TenantStatus = {
  kind: TenantStatusKind
  label: string
  paidThisMonth: number
  remaining: number
  dueDate: Date
}
