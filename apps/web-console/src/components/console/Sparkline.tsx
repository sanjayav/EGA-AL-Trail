/**
 * Inline SVG sparkline. Takes a sequence of numbers; renders them as a tiny
 * area chart. Server-component-safe (no client JS).
 */

interface Props {
  values: number[]
  width?: number
  height?: number
  stroke?: string
  fill?: string
  className?: string
  showAxis?: boolean
  ariaLabel?: string
}

export function Sparkline({
  values,
  width = 120,
  height = 32,
  stroke = 'var(--color-accent)',
  fill = 'var(--color-accent-soft, rgba(15, 76, 129, 0.15))',
  className,
  showAxis = false,
  ariaLabel,
}: Props) {
  const n = values.length
  if (n === 0) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        aria-hidden={!ariaLabel}
        aria-label={ariaLabel}
      />
    )
  }
  const max = Math.max(1, ...values)
  const stepX = n > 1 ? width / (n - 1) : 0
  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - (v / max) * height
    return [x, y] as const
  })
  const linePath = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ')
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <path d={areaPath} fill={fill} stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" />
      {showAxis && (
        <line x1={0} y1={height - 0.5} x2={width} y2={height - 0.5} stroke="var(--surface-border)" strokeWidth="0.5" />
      )}
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="2"
          fill={stroke}
        />
      )}
    </svg>
  )
}
