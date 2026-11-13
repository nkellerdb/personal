import { fmtClock, useNow, useRestTimer } from '../timer'

export function RestTimerBar() {
  const { endsAt, total, label, add, stop } = useRestTimer()
  const now = useNow(endsAt != null)
  if (endsAt == null) return null
  const left = (endsAt - now) / 1000
  const over = left <= 0
  const pct = Math.min(100, Math.max(0, (1 - left / total) * 100))

  return (
    <div className={`rest${over ? ' rest-over' : ''}`} role="timer" aria-live="polite">
      <div className="rest-fill" style={{ width: `${pct}%` }} />
      <div className="rest-body">
        <div>
          <div className="rest-label">{over ? 'Go! ' : 'Rest · next: '}{label}</div>
          <div className="rest-clock">{over ? `+${fmtClock(-left)}` : fmtClock(left)}</div>
        </div>
        <div className="rest-actions">
          {!over && (
            <button className="btn btn-small" onClick={() => add(15)}>
              +15s
            </button>
          )}
          <button className="btn btn-small" onClick={stop}>
            {over ? 'Done' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  )
}
