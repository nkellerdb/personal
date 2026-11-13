import { useState } from 'react'
import { formatDate, hitTopOfRange } from '../logic'
import type { Exercise, Mode, Session, SetLog } from '../types'
import { DemoMedia } from './DemoMedia'

export interface CardInfo {
  ex: Exercise
  blockIndex: number
  type: 'main' | 'superset'
  /** "Main lift" or e.g. "1A". */
  tag: string
  partner?: { ex: Exercise; tag: string; index: number }
}

interface Props {
  info: CardInfo
  mode: Mode
  unit: string
  sets: SetLog[]
  last?: { session: Session; sets: SetLog[] }
  onSet: (i: number, patch: Partial<SetLog>) => void
  onAddSet: () => void
  onGoPartner: () => void
}

const parseNum = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v))

export function ExerciseCard({ info, mode, unit, sets, last, onSet, onAddSet, onGoPartner }: Props) {
  const { ex, type, tag, partner } = info
  const [showDemo, setShowDemo] = useState(false)
  const version = mode === 'gym' ? ex.gym : ex.home
  const [lo, hi] = ex.repRange
  const lastHitTop = last && hitTopOfRange(last.sets, ex)
  const nowHitTop = hitTopOfRange(sets, ex)

  return (
    <article className={`card card-${type}`} aria-label={ex.name}>
      <header className="card-head">
        <div className="card-tags">
          {type === 'main' ? (
            <span className="tag tag-main">Main lift</span>
          ) : (
            <span className="tag tag-ss">
              Superset {tag} <span aria-hidden>⛓</span> {partner?.tag}
            </span>
          )}
          <span className="tag tag-plain">
            {ex.sets} × {lo}–{hi}
          </span>
        </div>
        <h2>{ex.name}</h2>
        <p className="version">
          <span className="version-mode">{mode === 'gym' ? 'Gym' : 'Home'}</span> {version}
        </p>
      </header>

      {last ? (
        <div className="last">
          <span className="last-label">Last · {formatDate(last.session.startedAt)}</span>
          <span className="last-sets">
            {last.sets.map((s, i) => (
              <span key={i}>
                {s.weight ?? '–'}×{s.reps ?? '–'}
              </span>
            ))}
          </span>
          {lastHitTop && <span className="go-up">⬆ Go up next time</span>}
        </div>
      ) : (
        <div className="last last-empty">No previous session yet</div>
      )}

      <div className="sets" role="table" aria-label="Sets">
        <div className="set-row set-head" role="row">
          <span>Set</span>
          <span>{unit}</span>
          <span>Reps</span>
          <span aria-hidden />
        </div>
        {sets.map((s, i) => (
          <div className={`set-row${s.done ? ' done' : ''}`} role="row" key={i}>
            <span className="set-num">{i + 1}</span>
            <input
              inputMode="decimal"
              aria-label={`Set ${i + 1} weight`}
              placeholder={last?.sets[i]?.weight?.toString() ?? '0'}
              value={s.weight ?? ''}
              onChange={(e) => onSet(i, { weight: parseNum(e.target.value) })}
            />
            <input
              inputMode="numeric"
              aria-label={`Set ${i + 1} reps`}
              placeholder={`${lo}–${hi}`}
              value={s.reps ?? ''}
              onChange={(e) => onSet(i, { reps: parseNum(e.target.value) })}
            />
            <button
              className="check"
              aria-label={s.done ? `Undo set ${i + 1}` : `Complete set ${i + 1}`}
              aria-pressed={s.done}
              onClick={() =>
                // Ticking an untouched row fills in last time's numbers (or the bottom of the range).
                onSet(
                  i,
                  s.done
                    ? { done: false }
                    : {
                        done: true,
                        reps: s.reps ?? last?.sets[i]?.reps ?? lo,
                        weight: s.weight ?? last?.sets[i]?.weight ?? null,
                      },
                )
              }
            >
              ✓
            </button>
          </div>
        ))}
        <button className="link add-set" onClick={onAddSet}>
          + Add set
        </button>
      </div>

      {nowHitTop && <div className="banner-up">All sets at {hi}+ reps — go up next time 💪</div>}

      {partner && (
        <button className="partner" onClick={onGoPartner}>
          <span>
            Superset with <b>{partner.tag}</b> {partner.ex.name}
          </span>
          <span aria-hidden>→</span>
        </button>
      )}

      <section className="form">
        <ul className="cues">
          {ex.cues.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <button className="link" onClick={() => setShowDemo((v) => !v)} aria-expanded={showDemo}>
          {showDemo ? 'Hide demo' : 'Show demo'}
        </button>
        {showDemo && <DemoMedia ex={ex} label={version} />}
      </section>
    </article>
  )
}
