# @uniweb/scene

A React renderer for the **Scene Composition Format** — declarative, layered
visual scenes composited with CSS blend modes.

> **Status:** initial setup. The renderer implementation is being brought in from
> its reference implementation; the API below is the shape it lands with.

## What is a scene?

A *scene* is a portable JSON description of a layered visual. Each layer is one of
a handful of kinds — **text**, **subject** (image), **shape**, **spray**,
**accent**, **svg**, **separator** — positioned in a shared z-index space and
composited through CSS `mix-blend-mode`. There's no canvas-2D or WebGL: every
layer is a positioned DOM element, so scenes are light, themeable, and
server-renderable.

```json
{
  "name": "Hero",
  "composition": {
    "aspectRatio": "16 / 9",
    "background": "#0b0b12",
    "texts":  [{ "id": "title", "content": "Into the\nUnknown", "vAlign": "center" }],
    "shapes": [{ "type": "circle", "background": "radial-gradient(circle, #ff0066, transparent)",
                 "width": "240px", "height": "240px", "top": "20%", "left": "60%",
                 "mixBlendMode": "screen", "filter": "blur(10px)" }]
  }
}
```

## Install

```bash
npm install @uniweb/scene react
```

`react` (>= 18) is a peer dependency. The package has no other runtime
dependencies.

## Usage

```jsx
import { Scene } from '@uniweb/scene'
import doc from './hero.scene.json'

// Contained — fills its parent.
<div style={{ width: 800 }}>
  <Scene composition={doc} />
</div>
```

`composition` accepts either the full envelope (`{ name, composition }`) or a bare
composition object.

### Templating

`composeScene` is a pure, SSR-safe helper that applies named-slot **overrides**
and an ordered **content** stream to a template scene, then hands the result to
`<Scene>`:

```jsx
import { Scene, composeScene } from '@uniweb/scene'

const final = composeScene(template, {
  overrides: { title: { content: 'Article Title' } },
  content:   [{ kind: 'text', content: 'By Jane Doe' }]
})

<Scene composition={final} />
```

### Theming with CSS variables

Every default colour and font reads a `--vc-*` custom property, with a sensible
literal as the fallback. An explicit value in the scene JSON always wins — only
the *default* is themeable. Set the variables once on a wrapper and an otherwise
unstyled scene adopts your tokens:

| Variable | Themes the default… | Fallback |
| --- | --- | --- |
| `--vc-text` | text colour | `currentColor` |
| `--vc-font` | text `font-family` | `inherit` |
| `--vc-shape` | shape background + ring stroke | `#ffffff` |
| `--vc-accent` | spray fill + accent fill | `#ff3300` |
| `--vc-separator` | separator rule/label colour | `currentColor` |

Because text colour falls back to `currentColor` and font to `inherit`, an
unstyled scene simply adopts the surrounding element's colour and font.

### Server-side rendering

`<Scene>` renders to static HTML and hydrates cleanly — no `useLayoutEffect`, no
DOM access at module scope. Responsive behaviour is **container-queried** via
`ResizeObserver` at runtime. For pre-rendering at a known width, pass
`initialWidth` (a number of CSS pixels) so the first paint matches the
post-hydration layout:

```jsx
<Scene composition={doc} initialWidth={360} />
```

### Untrusted SVG

`svg` layers render inline markup. If a scene can come from an untrusted source,
pass a sanitizer — the host owns the policy:

```jsx
<Scene composition={doc} sanitizeSvg={(html) => mySanitizer(html)} />
```

## Exports

| Export | Description |
| --- | --- |
| `Scene` | The renderer component (also the default export). |
| `composeScene` | Pure templating helper (overrides + content binding). |
| scene/layer helpers | Pure scene-normalisation and per-layer style utilities. |

`<Scene>` also accepts optional pointer hooks (`onLayerPointerDown`,
`selectedId`, `draggedId`, `tempPos`) for building an interactive editor on top
of the renderer; without them it is fully inert (`pointer-events: none`).

## License

Apache-2.0. Derived from a reference renderer for the Scene Composition Format.
