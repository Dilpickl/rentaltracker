import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

type Props = {
  title: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
  children: ReactNode
}

export function Screen({ title, backTo, backLabel = 'Back', action, children }: Props) {
  return (
    <div className="screen">
      <header className="screen__header">
        <div className="screen__header-row">
          {backTo ? (
            <Link to={backTo} className="back-link">
              ← {backLabel}
            </Link>
          ) : (
            <p className="brand">Rent Tracker</p>
          )}
          {action}
        </div>
        <h1 className="screen__title">{title}</h1>
      </header>
      <main className="screen__body">{children}</main>
    </div>
  )
}
