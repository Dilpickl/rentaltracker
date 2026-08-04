import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { supabase } from '../lib/supabase'
import type { TenantWithPayments } from '../lib/useTenantsData'

type Props = {
  tenants: TenantWithPayments[]
  onChanged: () => Promise<void>
}

export function TenantFormScreen({ tenants, onChanged }: Props) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const existing = tenants.find((t) => t.id === id)

  const [name, setName] = useState('')
  const [unitAddress, setUnitAddress] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [dueDay, setDueDay] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setUnitAddress(existing.unit_address)
      setMonthlyRent(String(existing.monthly_rent))
      setDueDay(String(existing.due_day))
    }
  }, [existing])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const rent = Number(monthlyRent)
    const day = Number(dueDay)

    if (!name.trim() || !unitAddress.trim()) {
      setError('Please fill in name and unit/address.')
      return
    }
    if (!Number.isFinite(rent) || rent <= 0) {
      setError('Enter a valid monthly rent amount.')
      return
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setError('Due day must be a number from 1 to 31.')
      return
    }

    setSaving(true)

    const payload = {
      name: name.trim(),
      unit_address: unitAddress.trim(),
      monthly_rent: rent,
      due_day: day,
    }

    if (isEdit && id) {
      const { error: updateError } = await supabase.from('tenants').update(payload).eq('id', id)
      setSaving(false)
      if (updateError) {
        setError(updateError.message)
        return
      }
      await onChanged()
      navigate(`/tenants/${id}`)
      return
    }

    const { data, error: insertError } = await supabase
      .from('tenants')
      .insert(payload)
      .select('id')
      .single()

    setSaving(false)
    if (insertError) {
      setError(insertError.message)
      return
    }

    await onChanged()
    navigate(`/tenants/${data.id}`)
  }

  const backTo = isEdit && id ? `/tenants/${id}` : '/'

  return (
    <Screen title={isEdit ? 'Edit tenant' : 'Add tenant'} backTo={backTo}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Name</span>
          <input
            className="field__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            autoComplete="name"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Unit / Address</span>
          <input
            className="field__input"
            value={unitAddress}
            onChange={(e) => setUnitAddress(e.target.value)}
            placeholder="Apt 2B · 123 Oak St"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Monthly rent amount</span>
          <div className="field__money">
            <span aria-hidden="true">$</span>
            <input
              className="field__input"
              type="number"
              inputMode="decimal"
              min="1"
              step="0.01"
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(e.target.value)}
              placeholder="1200"
              required
            />
          </div>
        </label>

        <label className="field">
          <span className="field__label">Due day of month</span>
          <input
            className="field__input"
            type="number"
            inputMode="numeric"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
            required
          />
          <span className="field__hint">Example: 1 = due on the 1st</span>
        </label>

        {error && <div className="banner banner--error">{error}</div>}

        <button type="submit" className="btn btn--primary btn--block btn--xl" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
    </Screen>
  )
}
