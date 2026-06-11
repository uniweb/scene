import { useRef, useState, useEffect, useMemo } from 'react'
import {
  VC_KEYFRAMES,
  DEFAULT_MOBILE_BREAKPOINT,
  flattenLayers,
  isLayerHidden,
  commonStyle,
  shapeStyle,
  subjectStyle,
  sprayStyle,
  accentContainerStyle,
  svgStyle,
  textStyle,
  separatorStyle,
  buildSvgHtml
} from './layers.js'

const SELECTION_OUTLINE = '2px dashed #818cf8'

/**
 * Renders a Scene. Presentational by default — pass a composition
 * (either the full `.scene.json` envelope or a bare composition object)
 * and it draws the layered, blend-mode-composited scene with zero host setup.
 *
 * To drive an editor, pass the optional editing hooks: `onLayerPointerDown`
 * turns layers into pointer targets, `selectedId` draws a selection outline,
 * and `draggedId` + `tempPos` apply a live drag position. When `onLayerPointerDown`
 * is omitted the renderer is fully inert (`pointer-events: none`).
 *
 * Responsive visibility is container-queried via `ResizeObserver`. For SSR /
 * pre-rendering, pass `initialWidth` (the known container width) so the first
 * paint matches the post-hydration layout and avoids a desktop→mobile flash.
 *
 * `sanitizeSvg(html) => html` runs author-supplied SVG markup through the
 * host's sanitizer before injection (default: identity). `injectKeyframes`
 * (default `true`) can be set false when the host ships `VC_KEYFRAMES` in its
 * own bundled CSS. Default colors/fonts read `--vc-*` custom properties (see
 * README) so a wrapper can theme an otherwise-unstyled composition.
 */
export function Scene({
  composition,
  mobileBreakpoint = DEFAULT_MOBILE_BREAKPOINT,
  initialWidth = 1000,
  className,
  style,
  sanitizeSvg = null,
  injectKeyframes = true,
  selectedId = null,
  onLayerPointerDown = null,
  draggedId = null,
  tempPos = null
}) {
  const comp = composition?.composition || composition || {}
  const interactive = typeof onLayerPointerDown === 'function'

  const containerRef = useRef(null)
  // `initialWidth` seeds the first render (server + client hydration) before the
  // ResizeObserver measures the real width. Server HTML and the client's first
  // render use the same value, so hydration matches; the real width is applied
  // afterwards. Pass the known width when pre-rendering to avoid a layout flash.
  const [containerWidth, setContainerWidth] = useState(initialWidth)

  // Container-query the width so responsive behavior tracks the element, not
  // the viewport.
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  const layers = useMemo(() => flattenLayers(comp), [comp])

  // Interaction-only style overlay (selection outline, grab cursor, live drag
  // position). Empty in presentational mode.
  const editStyle = (layer) => {
    if (!interactive) return { pointerEvents: 'none' }
    const s = { pointerEvents: 'auto' }
    if (selectedId === layer.id) {
      s.outline = SELECTION_OUTLINE
      s.outlineOffset = '2px'
      s.cursor = draggedId === layer.id ? 'grabbing' : 'grab'
    }
    if (draggedId === layer.id && tempPos) {
      s.left = tempPos.left
      s.top = tempPos.top
    }
    return s
  }

  const handlers = (layer) =>
    interactive ? { onMouseDown: (e) => onLayerPointerDown(e, layer) } : {}

  const renderAccent = (accent) => {
    const filterId = `vc-accent-${accent.id}`
    const intensity = accent.intensity || 0.015
    const numOctaves = accent.numOctaves || 2
    const spread = accent.spread || 40
    const blobs = accent.blobs || []
    const blurStd =
      accent.variant === 'mist' ? 5 : accent.variant === 'cloud' ? 8 : 1

    const containerStyle = accentContainerStyle(accent)
    if (interactive && selectedId === accent.id) {
      containerStyle.outline = SELECTION_OUTLINE
      containerStyle.outlineOffset = '-2px'
    }

    return (
      <div key={accent.id} style={containerStyle}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 160 90"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <filter id={filterId} colorInterpolationFilters="sRGB">
              <feTurbulence
                type="fractalNoise"
                baseFrequency={intensity}
                numOctaves={numOctaves}
                seed={accent.seed || 1}
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={spread}
                xChannelSelector="R"
                yChannelSelector="G"
              />
              <feGaussianBlur stdDeviation={blurStd} />
            </filter>
          </defs>
          <g filter={`url(#${filterId})`}>
            {blobs.map((blob, i) => {
              const b = Array.isArray(blob)
                ? {
                    cx: blob[0],
                    cy: blob[1],
                    rx: blob[2],
                    ry: blob[3],
                    color: blob[4],
                    opacity: blob[5]
                  }
                : blob
              return (
                <ellipse
                  key={i}
                  cx={b.cx}
                  cy={b.cy}
                  rx={b.rx}
                  ry={b.ry}
                  fill={b.color || accent.color || 'var(--vc-accent, #ff3300)'}
                  opacity={b.opacity ?? 1}
                />
              )
            })}
          </g>
        </svg>
      </div>
    )
  }

  // Presentational: a themed horizontal rule with an optional centered label
  // (spec §10). Interactive/editor mode keeps a labeled, selectable box so
  // authors can see and grab an otherwise-invisible separator.
  const renderSeparator = (sep) => {
    const base = {
      ...separatorStyle(sep),
      ...commonStyle(sep),
      ...editStyle(sep)
    }
    if (interactive) {
      return (
        <div
          key={sep.id}
          style={{
            ...base,
            border: '1px dashed rgba(99, 102, 241, 0.4)',
            background: 'rgba(99, 102, 241, 0.1)'
          }}
          {...handlers(sep)}
        >
          <span
            style={{
              fontSize: '10px',
              color: '#818cf8',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: 0.7
            }}
          >
            Separator ({sep.gap || 'normal'})
          </span>
        </div>
      )
    }
    const rule = {
      flex: 1,
      borderTop: '1px solid var(--vc-separator, currentColor)',
      opacity: 0.4
    }
    return (
      <div key={sep.id} style={base}>
        <div style={rule} />
        {sep.label && (
          <>
            <span
              style={{
                padding: '0 0.75rem',
                fontSize: '0.75rem',
                color: 'var(--vc-separator, currentColor)',
                opacity: 0.7,
                whiteSpace: 'nowrap'
              }}
            >
              {sep.label}
            </span>
            <div style={rule} />
          </>
        )}
      </div>
    )
  }

  const renderLayer = (layer) => {
    if (isLayerHidden(layer, containerWidth, mobileBreakpoint)) return null
    const common = commonStyle(layer)

    switch (layer._kind) {
      case 'shape':
        return (
          <div
            key={layer.id}
            style={{ ...shapeStyle(layer), ...common, ...editStyle(layer) }}
            {...handlers(layer)}
          />
        )
      case 'subject':
        return (
          <img
            key={layer.id}
            src={layer.src}
            alt={layer.alt || ''}
            style={{ ...subjectStyle(layer), ...common, ...editStyle(layer) }}
            {...handlers(layer)}
          />
        )
      case 'spray':
        return (
          <div
            key={layer.id}
            style={{ ...sprayStyle(layer), ...common, ...editStyle(layer) }}
            {...handlers(layer)}
          />
        )
      case 'accent':
        return renderAccent(layer)
      case 'svg':
        return (
          <div
            key={layer.id}
            style={{ ...svgStyle(layer), ...common, ...editStyle(layer) }}
            {...handlers(layer)}
            dangerouslySetInnerHTML={{
              __html: buildSvgHtml(layer, sanitizeSvg)
            }}
          />
        )
      case 'text':
        return (
          <div
            key={layer.id}
            style={{ ...textStyle(layer), ...common, ...editStyle(layer) }}
            {...handlers(layer)}
          >
            {layer.content || layer.title || 'Text Layer'}
          </div>
        )
      case 'separator':
        return renderSeparator(layer)
      default:
        return null
    }
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        background: comp.background || 'transparent',
        aspectRatio: comp.aspectRatio || 'auto',
        borderRadius: comp.borderRadius || '0',
        ...style
      }}
    >
      {injectKeyframes && <style>{VC_KEYFRAMES}</style>}
      {layers.map(renderLayer)}
    </div>
  )
}

export default Scene
