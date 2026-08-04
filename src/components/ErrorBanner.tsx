type Props = {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div className="banner banner--error" role="alert">
      <p className="banner__text">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary btn--block" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}
