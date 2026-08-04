import type { TenantStatusKind } from '../types'

const LABELS: Record<TenantStatusKind, string> = {
  paid: 'Paid',
  due_soon: 'Due soon',
  overdue: 'Overdue',
  upcoming: 'Upcoming',
}

type Props = {
  kind: TenantStatusKind
  label?: string
}

export function StatusBadge({ kind, label }: Props) {
  return (
    <span className={`status-badge status-badge--${kind}`} aria-label={label ?? LABELS[kind]}>
      <span className="status-badge__dot" aria-hidden="true" />
      {label ?? LABELS[kind]}
    </span>
  )
}
