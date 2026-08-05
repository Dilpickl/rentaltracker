import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import type { Expense, Payment, Tenant } from '../types'

export type TenantWithPayments = Tenant & {
  payments: Payment[]
  expenses: Expense[]
}

type LoadState = {
  tenants: TenantWithPayments[]
  loading: boolean
  error: string | null
}

function friendlyError(message: string): string {
  const lower = message.toLowerCase()
  if (
    lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed') ||
    lower.includes('typeerror')
  ) {
    return "Couldn't load data. Check your connection and try again."
  }
  if (lower.includes('archived') || lower.includes('expenses')) {
    return "Couldn't load data. Run the latest schema SQL in Supabase (adds archived + expenses), then retry."
  }
  return message || "Couldn't load data. Check your connection and try again."
}

export function useTenantsData() {
  const [state, setState] = useState<LoadState>({
    tenants: [],
    loading: true,
    error: null,
  })

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setState({
        tenants: [],
        loading: false,
        error:
          'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
      })
      return
    }

    // Only block the UI on the first load — keep showing current data while refreshing
    // so remaining balances don't disappear after recording a payment.
    setState((s) => ({
      ...s,
      loading: s.tenants.length === 0,
      error: null,
    }))

    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('name', { ascending: true })

      if (tenantsError) {
        setState((s) => ({
          ...s,
          loading: false,
          error: friendlyError(tenantsError.message),
        }))
        return
      }

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('paid_on', { ascending: false })

      if (paymentsError) {
        setState((s) => ({
          ...s,
          loading: false,
          error: friendlyError(paymentsError.message),
        }))
        return
      }

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('incurred_on', { ascending: false })

      // Expenses are additive — if the table hasn't been migrated yet, keep
      // tenants/payments working and treat expenses as empty.
      const expensesMissing =
        !!expensesError &&
        (expensesError.message.toLowerCase().includes('expenses') ||
          expensesError.message.toLowerCase().includes('schema cache') ||
          expensesError.code === '42P01' ||
          expensesError.code === 'PGRST205')

      if (expensesError && !expensesMissing) {
        setState((s) => ({
          ...s,
          loading: false,
          error: friendlyError(expensesError.message),
        }))
        return
      }

      const paymentsByTenant = new Map<string, Payment[]>()
      for (const p of (payments ?? []) as Payment[]) {
        const list = paymentsByTenant.get(p.tenant_id) ?? []
        list.push({ ...p, amount: Number(p.amount) })
        paymentsByTenant.set(p.tenant_id, list)
      }

      const expensesByTenant = new Map<string, Expense[]>()
      for (const e of (expensesMissing ? [] : ((expenses ?? []) as Expense[]))) {
        const list = expensesByTenant.get(e.tenant_id) ?? []
        list.push({ ...e, amount: Number(e.amount) })
        expensesByTenant.set(e.tenant_id, list)
      }

      const merged: TenantWithPayments[] = ((tenants ?? []) as Tenant[]).map((t) => ({
        ...t,
        monthly_rent: Number(t.monthly_rent),
        archived: Boolean(t.archived),
        payments: paymentsByTenant.get(t.id) ?? [],
        expenses: expensesByTenant.get(t.id) ?? [],
      }))

      setState({ tenants: merged, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState((s) => ({
        ...s,
        loading: false,
        error: friendlyError(message),
      }))
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}
