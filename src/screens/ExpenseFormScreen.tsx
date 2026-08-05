import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LoadingBlock } from '../components/LoadingBlock'
import { Screen } from '../components/Screen'
import { formatMoney, todayISODate } from '../lib/dates'
import { supabase } from '../lib/supabase'
import type { TenantWithPayments } from '../lib/useTenantsData'

type Props = {
  tenants: TenantWithPayments[]
  loading: boolean
  onChanged: () => Promise<void>
}

function friendlySaveError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('expenses') || lower.includes('schema cache')) {
    return "Couldn't save. Run the latest schema SQL in Supabase (adds the expenses table), then retry."
  }
  return message
}

export function ExpenseFormScreen({ tenants, loading, onChanged }: Props) {
  const { id, expenseId } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(expenseId)

  const [tenantId, setTenantId] = useState(id ?? '')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [incurredOn, setIncurredOn] = useState(todayISODate())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hydratedEdit, setHydratedEdit] = useState(false)

  const tenant = tenants.find((t) => t.id === tenantId)
  const existingExpense = tenant?.expenses.find((e) => e.id === expenseId)

  useEffect(() => {
    if (id) setTenantId(id)
  }, [id])

  useEffect(() => {
    if (!isEdit || !existingExpense || hydratedEdit) return
    setAmount(String(existingExpense.amount))
    setDescription(existingExpense.description)
    setIncurredOn(existingExpense.incurred_on)
    setHydratedEdit(true)
  }, [existingExpense, hydratedEdit, isEdit])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = Number(amount)

    if (!tenantId) {
      setError('Please select a tenant.')
      return
    }
    if (!tenant) {
      setError('Tenant not found.')
      return
    }
    if (!description.trim()) {
      setError('Describe what this expense was for.')
      return
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid expense amount.')
      return
    }
    if (!incurredOn) {
      setError('Pick a date for this expense.')
      return
    }

    const payload = {
      tenant_id: tenantId,
      amount: amountNum,
      description: description.trim(),
      incurred_on: incurredOn,
    }

    setSaving(true)

    if (isEdit && expenseId) {
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          amount: payload.amount,
          description: payload.description,
          incurred_on: payload.incurred_on,
        })
        .eq('id', expenseId)

      setSaving(false)
      if (updateError) {
        setError(friendlySaveError(updateError.message))
        return
      }
    } else {
      const { error: insertError } = await supabase.from('expenses').insert(payload)

      setSaving(false)
      if (insertError) {
        setError(friendlySaveError(insertError.message))
        return
      }
    }

    await onChanged()
    navigate(`/tenants/${tenantId}`)
  }

  const backTo = id ? `/tenants/${id}` : '/'

  if (loading && tenants.length === 0) {
    return (
      <Screen title={isEdit ? 'Edit expense' : 'Add expense'} backTo={backTo}>
        <LoadingBlock />
      </Screen>
    )
  }

  if (isEdit && !loading && !existingExpense) {
    return (
      <Screen title="Edit expense" backTo={backTo}>
        <p className="muted">That expense was removed or does not exist.</p>
        <Link to={backTo} className="btn btn--primary btn--block">
          Back
        </Link>
      </Screen>
    )
  }

  if (!tenant && id) {
    return (
      <Screen title="Add expense" backTo="/">
        <p className="muted">That tenant was removed or does not exist.</p>
        <Link to="/" className="btn btn--primary btn--block">
          Back home
        </Link>
      </Screen>
    )
  }

  return (
    <Screen title={isEdit ? 'Edit expense' : 'Add expense'} backTo={backTo}>
      <form className="form" onSubmit={(e) => void handleSubmit(e)}>
        {tenant && (
          <div className="pay-tenant">
            <p className="pay-tenant__name">{tenant.name}</p>
            <p className="pay-tenant__meta">{tenant.unit_address}</p>
          </div>
        )}

        <label className="field">
          <span className="field__label">What for?</span>
          <input
            className="field__input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Plumbing repair, lock change…"
            required
          />
        </label>

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
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        </label>

        <label className="field">
          <span className="field__label">Date</span>
          <input
            className="field__input"
            type="date"
            value={incurredOn}
            onChange={(e) => setIncurredOn(e.target.value)}
            required
          />
        </label>

        {Number.isFinite(Number(amount)) && Number(amount) > 0 && (
          <div className="banner banner--ok">
            Recording <strong>{formatMoney(Number(amount))}</strong>
            {description.trim() ? (
              <>
                {' '}
                for <strong>{description.trim()}</strong>
              </>
            ) : null}
            .
          </div>
        )}

        {error && <div className="banner banner--error">{error}</div>}

        <button type="submit" className="btn btn--primary btn--block btn--xl" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save expense'}
        </button>
      </form>
    </Screen>
  )
}
