import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { dayById, emptySets, lastLog, program } from '../logic'
import { useRestTimer } from '../timer'
import type { Mode, Session, SetLog } from '../types'
import { ExerciseCard, type CardInfo } from './ExerciseCard'

interface Props {
  session: Session
  history: Session[]
  unit: string
  onChange: (s: Session) => void
  onFinish: () => void
  onDiscard: () => void
}

export function WorkoutView({ session, history, unit, onChange, onFinish, onDiscard }: Props) {
  const day = dayById(session.dayId)!
  const timer = useRestTimer()
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const cards = useMemo<CardInfo[]>(() => {
    const out: CardInfo[] = []
    let ss = 0
    day.blocks.forEach((b, bi) => {
      if (b.type === 'superset') ss++
      const start = out.length
      b.exercises.forEach((ex, ei) => {
        const tag = b.type === 'main' ? 'Main' : `${ss}${String.fromCharCode(65 + ei)}`
        out.push({ ex, blockIndex: bi, type: b.type, tag })
      })
      if (b.type === 'superset' && b.exercises.length === 2) {
        out[start].partner = { ex: out[start + 1].ex, tag: out[start + 1].tag, index: start + 1 }
        out[start + 1].partner = { ex: out[start].ex, tag: out[start].tag, index: start }
      }
    })
    return out
  }, [day])

  const lastFor = useCallback(
    (id: string) => lastLog(history, id, session.mode, session.id),
    [history, session.mode, session.id],
  )

  const setsFor = (i: number): SetLog[] => {
    const ex = cards[i].ex
    return session.sets[ex.id] ?? emptySets(ex, lastFor(ex.id)?.sets)
  }

  const goTo = (i: number) => {
    const el = track.current
    if (!el) return
    el.scrollTo({ left: Math.max(0, Math.min(cards.length - 1, i)) * el.clientWidth, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setActive(Math.round(el.scrollLeft / el.clientWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const updateSet = (ci: number, si: number, patch: Partial<SetLog>) => {
    const card = cards[ci]
    const sets = setsFor(ci).map((s, i) => (i === si ? { ...s, ...patch } : s))
    const next = { ...session, sets: { ...session.sets, [card.ex.id]: sets } }
    onChange(next)

    if (!patch.done) return
    // Just completed a set: decide whether to rest or move to the superset partner.
    const block = day.blocks[card.blockIndex]
    const firstOfBlock = cards.findIndex((c) => c.blockIndex === card.blockIndex)
    const afterBlock = firstOfBlock + block.exercises.length
    const blockDone = block.exercises.every((e) => {
      const s = e.id === card.ex.id ? sets : (next.sets[e.id] ?? [])
      return s.length > 0 && s.every((x) => x.done)
    })

    if (card.type === 'main') {
      if (blockDone) {
        timer.start(program.rest.main, cards[afterBlock]?.ex.name ?? 'Finish')
        goTo(afterBlock)
      } else timer.start(program.rest.main, `${card.ex.name} set ${si + 2}`)
      return
    }
    const partner = card.partner
    const partnerSetDone = partner ? (next.sets[partner.ex.id] ?? [])[si]?.done : true
    if (!partnerSetDone && partner) {
      goTo(partner.index) // go straight to the paired exercise, no rest
    } else if (blockDone) {
      timer.start(program.rest.superset, cards[afterBlock]?.ex.name ?? 'Finish')
      goTo(afterBlock)
    } else {
      timer.start(program.rest.superset, `${cards[firstOfBlock].ex.name} set ${si + 2}`)
      goTo(firstOfBlock)
    }
  }

  const addSet = (ci: number) => {
    const ex = cards[ci].ex
    const sets = setsFor(ci)
    const prev = sets[sets.length - 1]
    onChange({ ...session, sets: { ...session.sets, [ex.id]: [...sets, { weight: prev?.weight ?? null, reps: null, done: false }] } })
  }

  const setMode = (mode: Mode) => onChange({ ...session, mode })
  const doneCount = cards.filter((_, i) => setsFor(i).every((s) => s.done)).length
  const onSummary = active >= cards.length

  return (
    <div className="workout">
      <div className="workout-bar">
        <div>
          <div className="eyebrow">{program.name}</div>
          <h1>
            {day.name} <span className="muted">· {day.focus}</span>
          </h1>
        </div>
        <div className="seg" role="radiogroup" aria-label="Equipment">
          {(['gym', 'home'] as const).map((m) => (
            <button key={m} role="radio" aria-checked={session.mode === m} onClick={() => setMode(m)}>
              {m === 'gym' ? 'Gym' : 'Home'}
            </button>
          ))}
        </div>
      </div>

      <nav className="dots" aria-label="Exercises">
        {day.blocks.map((b, bi) => (
          <span key={bi} className={`dot-group dot-${b.type}`}>
            {cards.map((c, ci) =>
              c.blockIndex === bi ? (
                <button
                  key={ci}
                  className={`dot${ci === active ? ' active' : ''}${setsFor(ci).every((s) => s.done) ? ' complete' : ''}`}
                  onClick={() => goTo(ci)}
                  aria-label={`${c.tag} ${c.ex.name}`}
                  aria-current={ci === active}
                >
                  {c.type === 'main' ? 'M' : c.tag}
                </button>
              ) : null,
            )}
          </span>
        ))}
        <button
          className={`dot dot-finish${onSummary ? ' active' : ''}`}
          onClick={() => goTo(cards.length)}
          aria-label="Finish"
        >
          ✓
        </button>
      </nav>

      <div className="track" ref={track}>
        {cards.map((c, ci) => (
          <div className="slide" key={c.ex.id}>
            <ExerciseCard
              info={c}
              mode={session.mode}
              unit={unit}
              sets={setsFor(ci)}
              last={lastFor(c.ex.id)}
              onSet={(si, patch) => updateSet(ci, si, patch)}
              onAddSet={() => addSet(ci)}
              onGoPartner={() => c.partner && goTo(c.partner.index)}
            />
          </div>
        ))}
        <div className="slide">
          <article className="card card-finish">
            <h2>Finish {day.name}</h2>
            <p className="muted">
              {doneCount} of {cards.length} exercises complete.
            </p>
            <button className="btn btn-primary" onClick={onFinish}>
              Save workout
            </button>
            <button className="btn btn-ghost danger" onClick={() => confirm('Discard this workout?') && onDiscard()}>
              Discard
            </button>
          </article>
        </div>
      </div>

      <div className="pager">
        <button className="btn btn-ghost" onClick={() => goTo(active - 1)} disabled={active === 0}>
          ← Prev
        </button>
        <span className="muted">
          {Math.min(active + 1, cards.length + 1)} / {cards.length + 1}
        </span>
        <button className="btn btn-ghost" onClick={() => goTo(active + 1)} disabled={onSummary}>
          Next →
        </button>
      </div>
    </div>
  )
}
