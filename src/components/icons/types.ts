import type { SVGAttributes } from 'react'

/**
 * Animated icon contract, following the ItsHover pattern
 * (https://itshover.com — Apache-2.0).
 *
 * Their shadcn CLI installer assumes a Tailwind + components.json project,
 * which this one deliberately is not — it uses handcrafted CSS. So the icons
 * here are hand-authored against ItsHover's documented *interface* rather than
 * pulled through the CLI: a forwardRef component exposing imperative
 * `startAnimation` / `stopAnimation`, so a parent can drive the motion on
 * events the icon itself cannot see — such as its tab becoming active.
 */

/**
 * Motion redefines these handlers with its own signatures (an animation
 * *definition* rather than a DOM event), so React's versions must be dropped
 * or the props are not assignable to `motion.svg`.
 */
type MotionConflicts =
  | 'width'
  | 'height'
  // SVG's `values`/`transition` attributes collide with motion's MotionValue
  // map and transition config of the same names.
  | 'values'
  | 'transition'
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd'
  | 'onDragEnter'
  | 'onDragExit'
  | 'onDragLeave'
  | 'onDragOver'

export interface AnimatedIconProps extends Omit<SVGAttributes<SVGSVGElement>, MotionConflicts> {
  size?: number
  /** Any CSS colour. Defaults to `currentColor` so it inherits from the parent. */
  color?: string
  strokeWidth?: number
  className?: string
}

export interface AnimatedIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

/** Shared easing — matches ItsHover's default cubic-bezier. */
export const EASE = [0.4, 0, 0.2, 1] as const

export const DEFAULTS = {
  size: 22,
  color: 'currentColor',
  strokeWidth: 2,
} as const

/**
 * Icons must not animate for users who have asked the OS to reduce motion.
 * Checked at call time rather than cached, so it follows a mid-session change.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
