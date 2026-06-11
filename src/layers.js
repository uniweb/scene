/**
 * Plain-JS core for the scene renderer.
 *
 * Pure data + style computation — no React, no DOM access. Every function
 * takes plain objects and returns plain objects, so this layer can be reused
 * for server-side rendering, static export, or non-React hosts. The JSX
 * components in ./Scene.jsx are a thin view on top of these helpers.
 */

// Injected once by <Scene> so animations work with zero host setup.
export const VC_KEYFRAMES = `
  @media (prefers-reduced-motion: no-preference) {
    @keyframes vc-float {
      0%, 100% { translate: 0 0; }
      50% { translate: 0 -6px; }
    }
    @keyframes vc-drift {
      0%, 100% { translate: 0 0; }
      50% { translate: 3px -3px; }
    }
    @keyframes vc-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    @keyframes vc-rotate-slow {
      to { rotate: 360deg; }
    }
  }
`

// Width (px) below which a container is treated as "mobile". Container-queried
// via ResizeObserver, not viewport-queried — so a scene behaves the same
// whether it fills the screen or sits in a small card.
export const DEFAULT_MOBILE_BREAKPOINT = 768

// [compositionArrayKey, layer._kind] — render/flatten order within a z tie.
const GROUPS = [
  ['subjects', 'subject'],
  ['shapes', 'shape'],
  ['sprays', 'spray'],
  ['accents', 'accent'],
  ['svgs', 'svg'],
  ['texts', 'text'],
  ['separators', 'separator']
]

/**
 * Merge every layer array of a composition into one list sorted by zIndex
 * (ascending = back-to-front paint order). Each layer is tagged with `_kind`
 * (singular type) and `_group` (its source array name).
 */
export function flattenLayers(comp) {
  let all = []
  for (const [group, kind] of GROUPS) {
    if (Array.isArray(comp?.[group])) {
      all = all.concat(
        comp[group].map((l) => ({ ...l, _kind: kind, _group: group }))
      )
    }
  }
  return all.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
}

// Parse a `hideBelow` length ("640px", "40rem") to raw pixels for comparison.
export function getHideBelowPx(val) {
  if (!val) return 0
  const match = String(val).match(/([\d.]+)(px|rem|em)?/)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = match[2] || 'px'
  if (unit === 'rem' || unit === 'em') return num * 16
  return num
}

/**
 * Container-width-queried visibility. Replaces the editor's Tailwind
 * `max-md:hidden` / `md:hidden` classes so the renderer needs no CSS framework
 * and follows the spec's container-query intent.
 *   - `hidden`     → never rendered
 *   - `hideBelow`  → hidden when the container is narrower than the threshold
 *   - `decorative` → desktop-only (hidden below the mobile breakpoint)
 *   - separators   → mobile-only (hidden at/above the mobile breakpoint)
 */
export function isLayerHidden(
  layer,
  containerWidth,
  breakpoint = DEFAULT_MOBILE_BREAKPOINT
) {
  if (layer.hidden) return true
  if (layer.hideBelow && containerWidth < getHideBelowPx(layer.hideBelow))
    return true
  if (layer.decorative && containerWidth < breakpoint) return true
  if (layer._kind === 'separator' && containerWidth >= breakpoint) return true
  return false
}

// Common, non-interactive props shared by every non-accent layer.
export function commonStyle(layer) {
  return {
    animation: layer.animation || 'none',
    backdropFilter: layer.backdropFilter || 'none',
    WebkitBackdropFilter: layer.backdropFilter || 'none'
  }
}

export function shapeStyle(shape) {
  const style = {
    position: 'absolute',
    top: shape.top || '50%',
    bottom: shape.bottom,
    left: shape.left || '50%',
    right: shape.right,
    width: shape.width || '80px',
    height: shape.height || '80px',
    background: shape.background || 'var(--vc-shape, #ffffff)',
    mixBlendMode: shape.mixBlendMode || 'normal',
    filter: shape.filter || 'none',
    transform: shape.transform || 'translate(-50%, -50%)',
    opacity: shape.opacity ?? 1,
    zIndex: shape.zIndex || 0
  }
  if (shape.type === 'circle' || shape.type === 'blob')
    style.borderRadius = '50%'
  else if (shape.type === 'pill') style.borderRadius = '9999px'
  else if (shape.type === 'rect')
    style.borderRadius = shape.borderRadius || '0px'
  else if (shape.type === 'ring') {
    style.borderRadius = '50%'
    style.border = `${shape.strokeWidth || '3px'} solid ${shape.color || 'var(--vc-shape, #fff)'}`
    style.background = 'transparent'
  } else if (shape.type === 'diamond') {
    style.transform = `${style.transform !== 'none' ? style.transform : ''} rotate(45deg)`
  }
  return style
}

export function subjectStyle(subject) {
  return {
    position: 'absolute',
    top: subject.top || '50%',
    left: subject.left || '50%',
    transform: `translate(-50%, -50%) ${subject.transform || ''}`,
    width: subject.maxWidth || '70%',
    height: subject.maxHeight || '80%',
    objectFit: subject.objectFit || 'contain',
    objectPosition: subject.objectPosition || 'center',
    mixBlendMode: subject.mixBlendMode || 'normal',
    filter: subject.filter || 'none',
    opacity: subject.opacity ?? 1,
    zIndex: subject.zIndex || 2
  }
}

export function sprayStyle(spray) {
  const style = {
    position: 'absolute',
    top: spray.top || '50%',
    bottom: spray.bottom,
    left: spray.left || '50%',
    right: spray.right,
    width: spray.width || '300px',
    height: spray.height || '300px',
    background: spray.fill || 'var(--vc-accent, #ff3300)',
    mixBlendMode: spray.mixBlendMode || 'normal',
    zIndex: spray.zIndex || 0,
    opacity: spray.opacity ?? 1,
    transform: spray.transform || 'translate(-50%, -50%)',
    filter: spray.filter || 'none'
  }
  const spread = spray.spread !== undefined ? spray.spread : 60
  const radius = spray.radius !== undefined ? spray.radius : 50
  if (spray.mode === 'airbrush' || !spray.mode) {
    style.maskImage = `radial-gradient(circle, black, transparent ${spread}%)`
    style.WebkitMaskImage = style.maskImage
    style.opacity = style.opacity * (radius / 100)
  } else if (spray.mode === 'splatter') {
    style.background = 'transparent'
    style.border = `${spread / 5}px dotted ${spray.fill || 'var(--vc-accent, #ff3300)'}`
    style.borderRadius = '50%'
    style.filter = `blur(${radius / 20}px) ${style.filter}`
  }
  return style
}

// Accents are always full-bleed and never pointer-interactive.
export function accentContainerStyle(accent) {
  return {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    mixBlendMode: accent.mixBlendMode || 'normal',
    opacity: accent.opacity ?? 1,
    zIndex: accent.zIndex || 0,
    pointerEvents: 'none',
    animation: accent.animation || 'none',
    backdropFilter: accent.backdropFilter || 'none',
    WebkitBackdropFilter: accent.backdropFilter || 'none'
  }
}

export function svgStyle(svg) {
  return {
    position: 'absolute',
    top: svg.top || '50%',
    bottom: svg.bottom,
    left: svg.left || '50%',
    right: svg.right,
    width: svg.width || '120px',
    height: svg.height || '120px',
    mixBlendMode: svg.mixBlendMode || 'normal',
    opacity: svg.opacity ?? 1,
    zIndex: svg.zIndex || 0,
    transform: svg.transform || 'translate(-50%, -50%)',
    filter: svg.filter || 'none',
    color: svg.color || 'inherit' // drives currentColor in the inline markup
  }
}

export function textStyle(text) {
  return {
    position: 'absolute',
    top: text.top || '50%',
    left: text.left || '50%',
    transform: text.transform || 'translate(-50%, -50%)',
    // Default color/font route through --vc-* so a host can theme unstyled text
    // from its surface tokens; an explicit value in the JSON still wins.
    // `currentColor` lets text inherit the surrounding surface color by default.
    color: text.color || 'var(--vc-text, currentColor)',
    fontFamily: text.fontFamily || 'var(--vc-font, inherit)',
    fontSize: text.fontSize || '4rem',
    fontWeight: text.fontWeight || 800,
    letterSpacing: text.letterSpacing || 'normal',
    lineHeight: text.lineHeight ?? 1.1,
    textShadow: text.textShadow || 'none',
    maxWidth: text.maxWidth || 'none',
    textAlign: text.align || 'center',
    mixBlendMode: text.mixBlendMode || 'normal',
    filter: text.filter || 'none',
    opacity: text.opacity ?? 1,
    zIndex: text.zIndex || 10,
    // pre-wrap (not pre-line) preserves runs of whitespace, not just newlines.
    whiteSpace: 'pre-wrap'
  }
}

// Positioning + centering only. The decoration differs by mode and is applied
// by the component: a clean rule (presentational) or a labeled debug box
// (interactive/editor) — see Scene.jsx.
export function separatorStyle(separator) {
  return {
    position: 'absolute',
    top: separator.top || '50%',
    left: separator.left || '0',
    width: separator.width || '100%',
    height: separator.gap === 'large' ? '40px' : '20px',
    zIndex: separator.zIndex || 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

// Spec 1.3: an svg layer's `content` may be a bare fragment (a <path>, a <g>,
// …). Wrap it in a default <svg> using the layer's viewBox; a complete <svg>
// passes through untouched.
//
// `content` reaches `dangerouslySetInnerHTML`, so when it can be author-supplied
// or imported, pass a `sanitize` function — the host owns the sanitizer; we only
// provide the injection point. Defaults to identity (unchanged behavior).
export function buildSvgHtml(svg, sanitize) {
  const isFragment = !/^\s*<svg/i.test(svg.content || '')
  const html = isFragment
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${svg.viewBox || '0 0 100 100'}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">${svg.content}</svg>`
    : svg.content
  return typeof sanitize === 'function' ? sanitize(html) : html
}
