export function Loading({ label = 'Loading…' }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function CardSkeletons({ count = 6 }) {
  return (
    <div className="grid" role="status" aria-label="Loading properties">
      {Array.from({ length: count }, (_, i) => (
        <div className="card skeleton-card" key={i} aria-hidden="true">
          <div className="skeleton skeleton-art" />
          <div className="card-body">
            <div className="skeleton skeleton-line" style={{ width: '40%' }} />
            <div className="skeleton skeleton-line" style={{ width: '85%', height: 20 }} />
            <div className="skeleton skeleton-line" style={{ width: '55%' }} />
            <div className="skeleton skeleton-line" style={{ width: '70%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorBox({ error, onRetry, title = 'We could not load this' }) {
  return (
    <div className="state state-error" role="alert">
      <h2 className="state-title">{title}</h2>
      <p>{error?.message || 'Something went wrong. Please try again.'}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children }) {
  return (
    <div className="state">
      <h2 className="state-title">{title}</h2>
      {children}
    </div>
  )
}
