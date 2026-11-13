import { useMemo, useState } from 'react'
import { allExercises, dayById, e1rm, formatDate, hitTopOfRange, topSet } from '../logic'
import type { Session } from '../types'
import { LineChart } from './LineChart'

interface Props {
  sessions: Session[]
  unit: string
  onDelete: (id: string) => void
}

export function HistoryView({ sessions, unit, onDelete }: Props) {
  const exercises = allExercises()
  const [exId, setExId] = useState(exercises[0]?.id)
  const [metric, setMetric] = useState<'top' | 'e1rm'>('top')
  const ex = exercises.find((e) => e.id === exId)!

  const finished = useMemo(() => sessions.filter((s) => s.finishedAt), [sessions])
  const rows = useMemo(
    () =>
      finished
        .filter((s) => s.sets[exId]?.some((x) => x.done))
        .map((s) => ({ s, sets: s.sets[exId].filter((x) => x.done), top: topSet(s.sets[exId]) }))
        .reverse(),
    [finished, exId],
  )
  const points = rows
    .filter((r) => r.top?.weight != null)
    .map((r) => ({
      x: r.s.startedAt,
      y: metric === 'top' ? r.top!.weight! : e1rm(r.top!.weight!, r.top!.reps ?? 1),
      mode: r.s.mode,
    }))

  return (
    <div className="page">
      <h1>History</h1>

      <div className="chips" role="tablist" aria-label="Lift">
        {exercises.map((e) => (
          <button key={e.id} role="tab" aria-selected={e.id === exId} className="chip" onClick={() => setExId(e.id)}>
            {e.name}
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>{ex.name}</h2>
          <div className="seg seg-small" role="radiogroup" aria-label="Metric">
            <button role="radio" aria-checked={metric === 'top'} onClick={() => setMetric('top')}>
              Top set
            </button>
            <button role="radio" aria-checked={metric === 'e1rm'} onClick={() => setMetric('e1rm')}>
              Est. 1RM
            </button>
          </div>
        </div>
        {points.length ? (
          <LineChart points={points} unit={unit} />
        ) : (
          <p className="muted empty">Log a session with {ex.name} to see progress here.</p>
        )}
        <p className="legend muted small">
          <span className="legend-dot gym" /> Gym <span className="legend-dot home" /> Home
        </p>
      </section>

      {rows.length > 0 && (
        <ul className="log">
          {[...rows].reverse().map(({ s, sets }) => (
            <li key={s.id}>
              <span className="log-date">{formatDate(s.startedAt)}</span>
              <span className={`badge badge-${s.mode}`}>{s.mode}</span>
              <span className="log-sets">
                {sets.map((x, i) => (
                  <span key={i}>
                    {x.weight ?? '–'}×{x.reps ?? '–'}
                  </span>
                ))}
              </span>
              {hitTopOfRange(s.sets[exId], ex) && <span className="go-up small">⬆</span>}
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title">Sessions</h2>
      {finished.length === 0 && <p className="muted">No sessions yet.</p>}
      <ul className="sessions">
        {finished.map((s) => (
          <li key={s.id}>
            <div>
              <b>{s.dayId === 'cardio' ? 'Walk / bike' : dayById(s.dayId)?.name ?? s.dayId}</b>
              <span className="muted small">
                {' '}
                · {formatDate(s.startedAt)}
                {s.dayId !== 'cardio' && ` · ${s.mode}`}
                {s.finishedAt && s.dayId !== 'cardio' && ` · ${Math.round((s.finishedAt - s.startedAt) / 60000)} min`}
              </span>
            </div>
            <button className="link danger small" onClick={() => confirm('Delete this session?') && onDelete(s.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
