import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LoadingBlock } from '../components/LoadingBlock'
import { Screen } from '../components/Screen'
import { formatMoney, todayISODate } from '../lib/dates'
import { getTenantStatus, paymentLabel } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { TenantWithPayments } from '../lib/useTenantsData'

type Props = {
  tenants: TenantWithPayments[]
  loading: boolean
  onChanged: () => Promise<void>
}

export function RecordPaymentScreen({ tenants, loading, onChanged }: Props) {
  const { id, paymentId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isEdit = Boolean(paymentId)

  const preselectedId = id ?? searchParams.get('tenant') ?? ''
  const [tenantId, setTenantId] = useState(preselectedId)
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayISODate())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [amountTouched, setAmountTouched] = useState(false)
  const [hydratedEdit, setHydratedEdit] = useState(false)

  const activeTenants = tenants.filter((t) => !t.archived)
  const tenant = tenants.find((t) => t.id === tenantId)
  const existingPayment = tenant?.payments.find((p) => p.id === paymentId)

  const status = tenant
    ? getTenantStatus(tenant, tenant.payments, new Date(), {
        excludePaymentId: paymentId,
      })
    : null

  useEffect(() => {
    if (preselectedId) setTenantId(preselectedId)
  }, [preselectedId])

  useEffect(() => {
    if (!isEdit || !existingPayment || hydratedEdit) return
    setAmount(String(existingPayment.amount))
    setPaidOn(existingPayment.paid_on)
    setAmountTouched(true)
    setHydratedEdit(true)
  }, [existingPayment, hydratedEdit, isEdit])

  useEffect(() => {
    if (isEdit || !tenant || amountTouched) return
    const remaining = getTenantStatus(tenant, tenant.payments).remaining
    const defaultAmount = remaining > 0 ? remaining : tenant.monthly_rent
    setAmount(String(defaultAmount))
  }, [tenant, amountTouched, isEdit])

  const amountNum = Number(amount)
  const preview = useMemo(() => {
    if (!tenant || !Number.isFinite(amountNum) || amountNum <= 0) return null
    const label = paymentLabel(amountNum, tenant.monthly_rent)
    const remainingAfter = Math.max(
      0,
      Math.round(((status?.remaining ?? tenant.monthly_rent) - amountNum) * 100) / 100,
    )
    return { label, remainingAfter }
  }, [amountNum, status?.remaining, tenant])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!tenantId) {
      setError('Please select a tenant.')
      return
    }
    if (!tenant) {
      setError('Tenant not found.')
      return
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid payment amount.')
      return
    }
    if (!paidOn) {
      setError('Pick a payment date.')
      return
    }

    const statusLabel = paymentLabel(amountNum, tenant.monthly_rent)
    setSaving(true)

    if (isEdit && paymentId) {
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          amount: amountNum,
          paid_on: paidOn,
          status: statusLabel,
        })
        .eq('id', paymentId)

      setSaving(false)
      if (updateError) {
        setError(updateError.message)
        return
      }
    } else {
      const { error: insertError } = await supabase.from('payments').insert({
        tenant_id: tenantId,
        amount: amountNum,
        paid_on: paidOn,
        status: statusLabel,
      })

      setSaving(false)
      if (insertError) {
        setError(insertError.message)
        return
      }
    }

    await onChanged()
    navigate(`/tenants/${tenantId}`)
  }

  const backTo = id ? `/tenants/${id}` : '/'
  const needsTenantPicker = !id && !isEdit

  if (loading && tenants.length === 0) {
    return (
      <Screen title={isEdit ? 'Edit payment' : 'Record payment'} backTo={backTo}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (isEdit && !loading && !existingPayment) {
    return (
      <Screen title="Edit payment" backTo={backTo}>
        <p className="muted">That payment was removed or does not exist.</p>
        <Link to={backTo} className="btn btn--primary btn--block">
          Back
        </Link>
      </Screen>
    )
  }

  const selectable = activeTenants.length > 0 ? activeTenants : tenants

  return (
    <Screen title={isEdit ? 'Edit payment' : 'Record payment'} backTo={backTo}>
      {selectable.length === 0 ? (
        <div className="empty-state">
          <p>Add a tenant before recording a payment.</p>
          <Link to="/tenants/new" className="btn btn--primary btn--block">
            Add Tenant
          </Link>
        </div>
      ) : (
        <form className="form" onSubmit={(e) => void handleSubmit(e)}>
          {needsTenantPicker ? (
            <label className="field">
              <span className="field__label">Tenant</span>
              <select
                className="field__input"
                value={tenantId}
                onChange={(e) => {
                  setTenantId(e.target.value)
                  setAmountTouched(false)
                }}
                required
              >
                <option value="">Select tenant…</option>
                {selectable.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.unit_address}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            tenant && (
              <div className="pay-tenant">
                <p className="pay-tenant__name">{tenant.name}</p>
                <p className="pay-tenant__meta">
                  {tenant.unit_address} · Rent {formatMoney(tenant.monthly_rent)}
                </p>
                {status && status.remaining > 0 && (
                  <p className="pay-tenant__remaining">
                    Remaining this period: {formatMoney(status.remaining)}
                  </p>
                )}
              </div>
            )
          )}

          <label className="field">
            <span className="field__label">Amount</span>
            <div className="field__money">
              <span aria-hidden="true">$</span>
              <input
                className="field__input"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmountTouched(true)
                  setAmount(e.target.value)
                }}
                required
              />
            </div>
          </label>

          <label className="field">
            <span className="field__label">Date</span>
            <input
              className="field__input"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              required
            />
          </label>

          {preview && (
            <div
              className={`banner ${
                preview.remainingAfter > 0 ? 'banner--warn' : 'banner--ok'
              }`}
            >
              {preview.remainingAfter > 0 ? (
                <>
                  Saved as <strong>Partial</strong>. Still owed after this:{' '}
                  <strong>{formatMoney(preview.remainingAfter)}</strong>
                </>
              ) : preview.label === 'Partial' ? (
                <>
                  This finishes what's owed this period (saved as{' '}
                  <strong>Partial</strong> because it's under the full rent).
                </>
              ) : (
                <>
                  This covers the full rent and will be saved as <strong>Paid</strong>.
                </>
              )}
            </div>
          )}

          {error && <div className="banner banner--error">{error}</div>}

          <button type="submit" className="btn btn--primary btn--block btn--xl" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save payment'}
          </button>
        </form>
      )}
    </Screen>
  )
}
