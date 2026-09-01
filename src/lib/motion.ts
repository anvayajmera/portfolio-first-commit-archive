/* Shared motion helpers. Easing names match the CSS custom properties so the
   HTML layer and the 3D layer move with the same curves. */

import { useEffect, useState } from 'react'

export const EASE = {
  outExpo: 'expo.out',
  outQuart: 'quart.out',
  inOut: 'power2.inOut',
  drop: 'power3.out',
} as const

/** Frame-rate-independent damping: `lambda` is e-foldings per second. */
export function damp(current: number, target: number, lambda: number, delta: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * delta))
}

export const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

const QUERY = '(prefers-reduced-motion: reduce)'

/** Read synchronously on first render, so a flythrough never plays for one
    frame before the preference is honoured. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches
}
