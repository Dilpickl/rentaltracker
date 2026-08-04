import { useCallback, useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './supabase'
import type { Payment, Tenant } from '../types'

export type TenantWithPayments = Tenant & { payments: Payment[] }

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
  if (lower.includes('archived')) {
    return "Couldn't load data. Run the latest schema SQL in Supabase (adds the archived column), then retry."
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

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('*')
        .order('name', { ascending: true })

      if (tenantsError) {
        setState({ tenants: [], loading: false, error: friendlyError(tenantsError.message) })
        return
      }

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('paid_on', { ascending: false })

      if (paymentsError) {
        setState({ tenants: [], loading: false, error: friendlyError(paymentsError.message) })
        return
      }

      const byTenant = new Map<string, Payment[]>()
      for (const p of (payments ?? []) as Payment[]) {
        const list = byTenant.get(p.tenant_id) ?? []
        list.push({ ...p, amount: Number(p.amount) })
        byTenant.set(p.tenant_id, list)
      }

      const merged: TenantWithPayments[] = ((tenants ?? []) as Tenant[]).map((t) => ({
        ...t,
        monthly_rent: Number(t.monthly_rent),
        archived: Boolean(t.archived),
        payments: byTenant.get(t.id) ?? [],
      }))

      setState({ tenants: merged, loading: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setState({ tenants: [], loading: false, error: friendlyError(message) })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { ...state, refresh }
}
