import { useState } from 'react'
import { dayById, formatDate, hitTopOfRange, isLiftDay, lastLog, nextDayId, nextLiftDate, program, topSet } from '../logic'
import type { Session } from '../types'

interface Props {
  sessions: Session[]
  onStart: (dayId: string) => void
  onLogCardio: () => void
}

export function TodayView({ sessions, onStart, onLogCardio }: Props) {
  const today = new Date()
  const nextId = nextDayId(sessions)
  const [selected, setSelected] = useState(nextId)
  const day = dayById(selected) ?? dayById(nextId)!
  const liftToday = isLiftDay(today)
  const startOfDay = new Date(today).setHours(0, 0, 0, 0)
  const doneToday = sessions.filter((s) => s.finishedAt && s.startedAt >= startOfDay)
  const liftDoneToday = doneToday.some((s) => s.dayId !== 'cardio')
  const showLift = liftToday && !liftDoneToday
  const lastOf = (id: string) => sessions.find((s) => s.finishedAt && s.dayId === id)
  const nextDate = nextLiftDate(showLift ? today : new Date(Date.now() + 864e5))

  return (
    <div className="page">
      <div className="eyebrow">{formatDate(today.getTime(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>

      {!showLift && (
        <>
          <section className="hero hero-cardio">
            <div className="hero-day" aria-hidden>
              {doneToday.length ? '✓' : '🚲'}
            </div>
            <div>
              <h1>{doneToday.length ? 'Done for today' : program.cardio.title}</h1>
              <p className="muted">{doneToday.length ? 'Nice work. Recover well.' : program.cardio.description}</p>
            </div>
          </section>
          {!doneToday.length && (
            <button className="btn btn-primary btn-big" onClick={onLogCardio}>
              Log walk / bike
            </button>
          )}
        </>
      )}

      <section className="days-picker" aria-label="Program days">
        <h2 className="section-title">Lift days</h2>
        <div className="day-tabs" role="tablist">
          {program.days.map((d) => {
            const last = lastOf(d.id)
            return (
              <button
                key={d.id}
                role="tab"
                aria-selected={d.id === day.id}
                className="day-tab"
                onClick={() => setSelected(d.id)}
              >
                {d.id === nextId && <span className="day-next">Next</span>}
                <span className="day-letter">{d.id}</span>
                <span className="day-focus">{d.focus}</span>
                <span className="day-last">{last ? formatDate(last.startedAt, { month: 'short', day: 'numeric' }) : '—'}</span>
              </button>
            )
          })}
        </div>
      </section>

      <Preview dayId={day.id} sessions={sessions} />

      <button
        className={`btn btn-big ${showLift && day.id === nextId ? 'btn-primary' : ''}`}
        onClick={() => onStart(day.id)}
      >
        Start {day.name}
      </button>
      <p className="muted small center">
        {day.id === nextId
          ? showLift
            ? `${day.name} is next in your rotation.`
            : `${day.name} is next · ${formatDate(nextDate.getTime())}`
          : `Your rotation has ${dayById(nextId)!.name} next.`}
      </p>
    </div>
  )
}

function Preview({ dayId, sessions }: { dayId: string; sessions: Session[] }) {
  const day = dayById(dayId)!
  let ss = 0
  return (
    <ol className="preview" aria-label={`${day.name} exercises`}>
      {day.blocks.map((b, i) => {
        if (b.type === 'superset') ss++
        return (
          <li key={i} className={`preview-${b.type}`}>
            <span className="preview-tag">{b.type === 'main' ? 'Main' : `SS${ss}`}</span>
            <span className="preview-list">
              {b.exercises.map((e) => {
                const last = lastLog(sessions, e.id, 'gym')
                const top = last && topSet(last.sets)
                return (
                  <span key={e.id} className="preview-ex">
                    <span>
                      {e.name} <span className="muted">{e.sets}×{e.repRange[0]}–{e.repRange[1]}</span>
                    </span>
                    {top && (
                      <span className="preview-last">
                        {top.weight}×{top.reps}
                        {hitTopOfRange(last.sets, e) && <span className="go-up"> ⬆</span>}
                      </span>
                    )}
                  </span>
                )
              })}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
