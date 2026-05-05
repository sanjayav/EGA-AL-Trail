'use client'

import { motion, useScroll, useSpring } from 'motion/react'

/** Top-of-page progress strip · driven by useScroll, smoothed via useSpring. §10.5.1 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })

  return (
    <motion.div
      className="fixed left-0 right-0 top-0 z-50 h-[2px] origin-left bg-[var(--color-gold)]"
      style={{ scaleX }}
      aria-hidden
    />
  )
}
