import { useEffect, useState } from 'react'
import type { Exercise } from '../types'

type Resolved = { kind: 'video' | 'image'; src: string } | { kind: 'none' }
const cache = new Map<string, Promise<Resolved>>()

/**
 * Looks for a local demo in public/demos: the file named in program.json, or
 * <exercise-id>.mp4 / .webm / .gif by convention. Content-type is checked because
 * dev servers answer missing files with index.html.
 */
function resolve(ex: Exercise): Promise<Resolved> {
  if (!cache.has(ex.id)) {
    const names = ex.demo?.file ? [ex.demo.file] : ['mp4', 'webm', 'gif'].map((x) => `${ex.id}.${x}`)
    cache.set(
      ex.id,
      (async () => {
        for (const name of names) {
          const src = `${import.meta.env.BASE_URL}demos/${name}`
          try {
            const r = await fetch(src, { method: 'HEAD' })
            const type = r.headers.get('content-type') ?? ''
            if (r.ok && type.startsWith('video/')) return { kind: 'video', src } as const
            if (r.ok && type.startsWith('image/')) return { kind: 'image', src } as const
          } catch {
            /* offline and not cached */
          }
        }
        return { kind: 'none' } as const
      })(),
    )
  }
  return cache.get(ex.id)!
}

export function DemoMedia({ ex, label }: { ex: Exercise; label: string }) {
  const [res, setRes] = useState<Resolved | null>(null)
  useEffect(() => {
    let live = true
    void resolve(ex).then((r) => live && setRes(r))
    return () => {
      live = false
    }
  }, [ex])

  if (!res) return <div className="demo demo-loading">Loading demo…</div>
  if (res.kind === 'video')
    return <video className="demo" src={res.src} autoPlay loop muted playsInline aria-label={`${label} demo`} />
  if (res.kind === 'image') return <img className="demo" src={res.src} alt={`${label} demo`} />
  const yt = ex.demo?.youtube ?? `https://www.youtube.com/results?search_query=${encodeURIComponent(label + ' form')}`
  return (
    <a className="demo demo-link" href={yt} target="_blank" rel="noreferrer">
      <span aria-hidden>▶</span> Watch on YouTube
    </a>
  )
}
