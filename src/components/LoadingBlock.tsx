type Props = {
  message?: string
}

export function LoadingBlock({ message = 'Loading…' }: Props) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <div className="loading-block__spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
