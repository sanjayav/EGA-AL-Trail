/**
 * Server-rendered SVG line chart with Y-axis grid + tooltips on hover.
 *
 * Each series is drawn as a polyline; one shared X axis. Designed for the
 * executive overview where we want production-quality output without a
 * client charting library.
 */

interface Series {
  label: string
  values: (number | null)[]
  color: string
  unit?: string
  formatter?: (v: number) => string
}

interface Props {
  labels: string[]
  series: Series[]
  height?: number
  ariaLabel?: string
}

export function LineChart({ labels, series, height = 220, ariaLabel }: Props) {
  const padding = { top: 16, right: 12, bottom: 28, left: 44 }
  const chartHeight = height - padding.top - padding.bottom
  const innerWidth = 800 // viewBox width · scales via responsive container
  const chartWidth = innerWidth - padding.left - padding.right

  const allValues = series.flatMap((s) => s.values.filter((v): v is number => v != null))
  const min = allValues.length ? Math.min(...allValues) : 0
  const max = allValues.length ? Math.max(...allValues) : 1
  const range = max - min || 1
  const yMin = min - range * 0.05
  const yMax = max + range * 0.05
  const yRange = yMax - yMin

  const n = labels.length
  const stepX = n > 1 ? chartWidth / (n - 1) : 0
  const xAt = (i: number) => padding.left + i * stepX
  const yAt = (v: number) => padding.top + chartHeight - ((v - yMin) / yRange) * chartHeight

  const yTicks = 4
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => yMin + (yRange * i) / yTicks)
  const xLabelEvery = Math.max(1, Math.ceil(n / 8))

  return (
    <svg
      viewBox={`0 0 ${innerWidth} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label={ariaLabel}
      className="font-mono"
    >
      {/* Y grid */}
      {tickValues.map((tv, i) => {
        const y = yAt(tv)
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={innerWidth - padding.right}
              y1={y}
              y2={y}
              stroke="var(--surface-border)"
              strokeDasharray={i === 0 ? '0' : '2 4'}
              strokeWidth="0.6"
            />
            <text
              x={padding.left - 6}
              y={y}
              dy="3"
              fontSize="9"
              textAnchor="end"
              fill="var(--fg-subtle)"
            >
              {Math.round(tv).toLocaleString()}
            </text>
          </g>
        )
      })}

      {/* X labels */}
      {labels.map((label, i) => {
        if (i % xLabelEvery !== 0 && i !== n - 1) return null
        return (
          <text
            key={i}
            x={xAt(i)}
            y={height - 8}
            fontSize="9"
            textAnchor="middle"
            fill="var(--fg-subtle)"
          >
            {label}
          </text>
        )
      })}

      {/* Series */}
      {series.map((s, si) => {
        const points = s.values
          .map((v, i) => (v == null ? null : `${xAt(i)},${yAt(v)}`))
          .filter((p): p is string => p != null)
          .join(' ')
        return (
          <g key={si}>
            <polyline
              points={points}
              stroke={s.color}
              strokeWidth="1.6"
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) =>
              v == null ? null : <circle key={i} cx={xAt(i)} cy={yAt(v)} r="2" fill={s.color} />,
            )}
          </g>
        )
      })}
    </svg>
  )
}
