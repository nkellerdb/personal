import { dayById, formatDate, isLiftDay, nextDayId, nextLiftDate, program } from '../logic'
import type { Session } from '../types'

interface Props {
  sessions: Session[]
  onStart: (dayId: string) => void
  onLogCardio: () => void
}

export function TodayView({ sessions, onStart, onLogCardio }: Props) {
  const today = new Date()
  const nextId = nextDayId(sessions)
  const next = dayById(nextId)!
  const liftToday = isLiftDay(today)
  const startOfDay = new Date(today).setHours(0, 0, 0, 0)
  const doneToday = sessions.filter((s) => s.finishedAt && s.startedAt >= startOfDay)
  const lastLift = sessions.find((s) => s.finishedAt && s.dayId !== 'cardio')
  const liftDoneToday = doneToday.some((s) => s.dayId !== 'cardio')
  const showLift = liftToday && !liftDoneToday

  return (
    <div className="page">
      <div className="eyebrow">{formatDate(today.getTime(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>

      {showLift ? (
        <section className="hero">
          <div className="hero-day">{next.id}</div>
          <div>
            <h1>{next.name}</h1>
            <p className="muted">{next.focus} focus · main lift + 2 supersets</p>
          </div>
        </section>
      ) : (
        <section className="hero hero-cardio">
          <div className="hero-day" aria-hidden>
            {doneToday.length ? '✓' : '🚲'}
          </div>
          <div>
            <h1>{doneToday.length ? 'Done for today' : program.cardio.title}</h1>
            <p className="muted">{doneToday.length ? 'Nice work. Recover well.' : program.cardio.description}</p>
          </div>
        </section>
      )}

      {showLift ? (
        <button className="btn btn-primary btn-big" onClick={() => onStart(nextId)}>
          Start {next.name}
        </button>
      ) : (
        <>
          {!doneToday.length && (
            <button className="btn btn-primary btn-big" onClick={onLogCardio}>
              Log walk / bike
            </button>
          )}
          <p className="muted center">
            Up next: <b>{next.name}</b> · {formatDate(nextLiftDate(new Date(Date.now() + 864e5)).getTime())}
          </p>
        </>
      )}
      <Preview dayId={nextId} />

      <details className="other-day">
        <summary>Train a different day</summary>
        <div className="row">
          {program.days.map((d) => (
            <button key={d.id} className="btn btn-ghost" onClick={() => onStart(d.id)}>
              {d.name}
            </button>
          ))}
        </div>
      </details>

      {lastLift && (
        <p className="muted small center">
          Last lift: {dayById(lastLift.dayId)?.name} · {formatDate(lastLift.startedAt)}
        </p>
      )}
    </div>
  )
}

function Preview({ dayId }: { dayId: string }) {
  const day = dayById(dayId)!
  let ss = 0
  return (
    <ol className="preview">
      {day.blocks.map((b, i) => {
        if (b.type === 'superset') ss++
        return (
          <li key={i} className={`preview-${b.type}`}>
            <span className="preview-tag">{b.type === 'main' ? 'Main' : `SS${ss}`}</span>
            <span>
              {b.exercises.map((e) => (
                <span key={e.id} className="preview-ex">
                  {e.name} <span className="muted">{e.sets}×{e.repRange[0]}–{e.repRange[1]}</span>
                </span>
              ))}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
