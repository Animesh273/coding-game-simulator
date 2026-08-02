import { forwardRef, useImperativeHandle, useRef } from 'react'
import { animate } from 'motion/mini'
import { DEFAULTS, EASE, prefersReducedMotion, type AnimatedIconHandle, type AnimatedIconProps } from './types'

/**
 * Animated navigation icons, authored in the ItsHover idiom
 * (https://itshover.com — Apache-2.0): a `forwardRef` component exposing
 * imperative `startAnimation` / `stopAnimation` through the ref.
 *
 * ── Why `motion/mini` rather than `motion/react` ────────────────────────
 * ItsHover's own components use `useAnimate` from `motion/react`. That pulls
 * the full JS animation engine — measured here at ~45 kB gzipped, for five
 * icons. `motion/mini` is the same library's WAAPI-backed engine at a
 * fraction of the size: the browser runs the animation natively and we ship
 * little more than the keyframe plumbing. The component contract is
 * unchanged, so an icon copied straight from ItsHover can be dropped in
 * beside these with only its import line adjusted.
 * ────────────────────────────────────────────────────────────────────────
 *
 * The imperative handle is the point. CSS `:hover` would cover the pointer
 * case, but the nav also fires these when a tab *becomes active* — something
 * the icon cannot observe. Driving it from the parent covers both, so
 * keyboard and programmatic navigation animate identically to a mouse.
 *
 * Each icon moves one part with intent rather than wobbling the whole glyph:
 * the compass needle sweeps, the scroll's lines tick in, the swords clash,
 * the sparkle twinkles, the avatar nods.
 */

type Keyframes = Parameters<typeof animate>[1]
type Options = Parameters<typeof animate>[2]

/**
 * Shared scaffolding: resolves child elements by class within this icon only,
 * and wires the ref contract.
 */
function useIconAnimation(
  ref: React.ForwardedRef<AnimatedIconHandle>,
  run: (play: (sel: string, kf: Keyframes, opts?: Options) => void) => void,
  reset?: (play: (sel: string, kf: Keyframes, opts?: Options) => void) => void,
) {
  const root = useRef<SVGSVGElement>(null)

  const play = (sel: string, kf: Keyframes, opts?: Options) => {
    const el = root.current?.querySelector(sel)
    if (el) animate(el as Element, kf, { ease: EASE, ...opts } as Options)
  }

  useImperativeHandle(ref, () => ({
    startAnimation: () => {
      // Never animate for someone who asked the OS not to.
      if (prefersReducedMotion()) return
      run(play)
    },
    stopAnimation: () => reset?.(play),
  }))

  return root
}

const svgProps = (size: number, color: string, strokeWidth: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

/* ------------------------------------------------------------- worlds --- */

export const CompassIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth, ...rest }, ref) => {
    const root = useIconAnimation(
      ref,
      (play) => {
        play('.needle', { rotate: ['0deg', '360deg'] }, { duration: 0.7 })
        play('.ring', { scale: [1, 1.12, 1] }, { duration: 0.5 })
      },
      (play) => play('.needle', { rotate: '0deg' }, { duration: 0.2 }),
    )

    return (
      <svg ref={root} {...svgProps(size, color, strokeWidth)} {...rest}>
        <circle className="ring spin-origin" cx="12" cy="12" r="9" />
        <polygon className="needle spin-origin" points="15.5 8.5 10.5 10.5 8.5 15.5 13.5 13.5" />
      </svg>
    )
  },
)
CompassIcon.displayName = 'CompassIcon'

/* ------------------------------------------------------------- quests --- */

export const ScrollIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth, ...rest }, ref) => {
    // strokeDashoffset rather than motion's pathLength: it is a real CSS
    // property, so the browser's own animation engine can drive it.
    const draw = { strokeDashoffset: [12, 0] as [number, number], opacity: [0.3, 1] as [number, number] }
    const root = useIconAnimation(ref, (play) => {
      play('.line-1', draw, { duration: 0.3 })
      play('.line-2', draw, { duration: 0.3, delay: 0.09 })
      play('.line-3', draw, { duration: 0.3, delay: 0.18 })
    })

    return (
      <svg ref={root} {...svgProps(size, color, strokeWidth)} {...rest}>
        <path d="M5 3h11a2 2 0 0 1 2 2v14a2 2 0 0 0 2 2H7a2 2 0 0 1-2-2Z" />
        <path className="line-1" d="M8.5 8h6" strokeDasharray="12" />
        <path className="line-2" d="M8.5 12h6" strokeDasharray="12" />
        <path className="line-3" d="M8.5 16h3.5" strokeDasharray="12" />
      </svg>
    )
  },
)
ScrollIcon.displayName = 'ScrollIcon'

/* -------------------------------------------------------------- arena --- */

export const SwordsIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth, ...rest }, ref) => {
    const root = useIconAnimation(
      ref,
      (play) => {
        play('.blade-a', { rotate: ['0deg', '-20deg', '0deg'] }, { duration: 0.5 })
        play('.blade-b', { rotate: ['0deg', '20deg', '0deg'] }, { duration: 0.5 })
      },
      (play) => {
        play('.blade-a', { rotate: '0deg' }, { duration: 0.2 })
        play('.blade-b', { rotate: '0deg' }, { duration: 0.2 })
      },
    )

    return (
      <svg ref={root} {...svgProps(size, color, strokeWidth)} {...rest}>
        <g className="blade-a spin-origin">
          <path d="M14.5 17.5 4 6V3h3l11.5 10.5" />
          <path d="m13 19 6-6" />
        </g>
        <g className="blade-b spin-origin">
          <path d="M16 3h3v3l-9.5 9.5" />
          <path d="m5 19 6-6" />
        </g>
      </svg>
    )
  },
)
SwordsIcon.displayName = 'SwordsIcon'

/* ------------------------------------------------------------- mentor --- */

export const SparkleIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth, ...rest }, ref) => {
    const root = useIconAnimation(
      ref,
      (play) => {
        play('.big', { scale: [1, 1.2, 1], rotate: ['0deg', '14deg', '0deg'] }, { duration: 0.6 })
        play('.small', { scale: [0.6, 1.2, 0.9], opacity: [0.4, 1, 0.75] }, { duration: 0.6, delay: 0.1 })
      },
      (play) => {
        play('.big', { scale: 1, rotate: '0deg' }, { duration: 0.2 })
        play('.small', { scale: 1, opacity: 1 }, { duration: 0.2 })
      },
    )

    return (
      <svg ref={root} {...svgProps(size, color, strokeWidth)} {...rest}>
        <path className="big spin-origin" d="M11 3 12.9 8.6 18.5 10.5 12.9 12.4 11 18 9.1 12.4 3.5 10.5 9.1 8.6Z" />
        <path className="small spin-origin" d="M17.5 15 18.4 17.1 20.5 18 18.4 18.9 17.5 21 16.6 18.9 14.5 18 16.6 17.1Z" />
      </svg>
    )
  },
)
SparkleIcon.displayName = 'SparkleIcon'

/* ------------------------------------------------------------ profile --- */

export const AvatarIcon = forwardRef<AnimatedIconHandle, AnimatedIconProps>(
  ({ size = DEFAULTS.size, color = DEFAULTS.color, strokeWidth = DEFAULTS.strokeWidth, ...rest }, ref) => {
    const root = useIconAnimation(
      ref,
      (play) => {
        play('.head', { translate: ['0px 0px', '0px -2px', '0px 0px'] }, { duration: 0.45 })
        play('.body', { strokeDashoffset: [24, 0] }, { duration: 0.5 })
      },
      (play) => play('.head', { translate: '0px 0px' }, { duration: 0.2 }),
    )

    return (
      <svg ref={root} {...svgProps(size, color, strokeWidth)} {...rest}>
        <circle className="head" cx="12" cy="8" r="4" />
        <path className="body" d="M4.5 20.5a7.5 7.5 0 0 1 15 0" strokeDasharray="24" />
      </svg>
    )
  },
)
AvatarIcon.displayName = 'AvatarIcon'
