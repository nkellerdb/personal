import type { Mode } from '../types'

interface Point {
  x: number
  y: number
  mode: Mode
}

const W = 340
const H = 180
const PAD = { l: 38, r: 12, t: 12, b: 24 }

/** Minimal dependency-free SVG line chart. */
export function LineChart({ points, unit }: { points: Point[]; unit: string }) {
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  let [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const padY = Math.max(5, (y1 - y0) * 0.15)
  y0 = Math.max(0, Math.floor((y0 - padY) / 5) * 5)
  y1 = Math.ceil((y1 + padY) / 5) * 5
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const sx = (x: number) => (x1 === x0 ? (PAD.l + W - PAD.r) / 2 : PAD.l + ((x - x0) / (x1 - x0)) * (W - PAD.l - PAD.r))
  const sy = (y: number) => H - PAD.b - ((y - y0) / (y1 - y0 || 1)) * (H - PAD.t - PAD.b)
  const ticks = [0, 0.5, 1].map((t) => Math.round(y0 + t * (y1 - y0)))
  const fmt = (x: number) => new Date(x).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const last = points[points.length - 1]

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Progress chart, latest ${last.y} ${unit}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} />
          <text className="axis" x={PAD.l - 6} y={sy(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      <text className="axis" x={PAD.l} y={H - 6}>
        {fmt(x0)}
      </text>
      {x1 !== x0 && (
        <text className="axis" x={W - PAD.r} y={H - 6} textAnchor="end">
          {fmt(x1)}
        </text>
      )}
      <polyline className="line" points={points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} />
      {points.map((p, i) => (
        <circle key={i} className={`pt pt-${p.mode}`} cx={sx(p.x)} cy={sy(p.y)} r={4}>
          <title>
            {fmt(p.x)}: {p.y} {unit}
          </title>
        </circle>
      ))}
      <text className="axis axis-strong" x={sx(last.x)} y={sy(last.y) - 9} textAnchor={points.length > 1 ? 'end' : 'middle'}>
        {last.y} {unit}
      </text>
    </svg>
  )
}
