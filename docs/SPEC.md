# Scene Composition Format Specification

**Version:** 1.3  
**Status:** Draft  
**Date:** 2026-04-09

---

## 1. Overview

The Scene Composition Format (`.scene.json`) is a portable, declarative specification for layered visual compositions. It describes how spray-paint accents, CSS spray effects, geometric shapes, subject images, inline SVGs, and text blocks combine into a single rendered visual.

A composition file is a self-contained recipe. A visual editor can generate it, a CMS can store it, and any compatible renderer can consume it — regardless of framework. The reference renderer is the `Scene` React component (the `@uniweb/scene` package). This document specifies the full Scene Composition Format; the reference renderer implements a *growing subset* of the format's renderer-level behaviors (e.g. `role`, `intro`, and hero flow mode) — see the package README for current support.

### Design Principles

- **Standard CSS properties** for all visual attributes (filter, transform, mixBlendMode, opacity). No framework-specific utilities.
- **Portable** — JSON transport, no runtime dependencies in the data.
- **Layered** — every visual element participates in a shared z-index space and interacts through CSS blend modes. Text is just another layer kind.
- **Authorable** — compact notation for common patterns (blob arrays), sensible defaults for all properties.
- **Scalable** — compositions adapt to any container size via percentage-based positioning and an optional `scale` factor.

### Changes from 1.2

- **Text is now a first-class layer kind.** The singleton `text` field has been removed; text blocks live in a `texts` array, share the same z-index space as all other layers, and support the full common-layer toolkit (`filter`, `transform`, `mixBlendMode`, `opacity`, `animation`). Each text block holds a single string of `content` (multi-line via `\n`); title + subtitle pairings are now expressed as two separate layers.
- **SVG layers auto-wrap fragment content.** An svg layer's `content` can now be a bare fragment — a `<path>`, a `<g>`, any SVG element — and the renderer wraps it in a default `<svg>` using the layer's new `viewBox` field (default `"0 0 100 100"`). Passing a complete `<svg>` still works unchanged. New `color` field drives `currentColor` so fills can be themed from the composition.
- **`backdropFilter` is a common layer property.** Any layer can now frost what sits behind it (`"blur(12px) saturate(1.4)"`). Unlocks glassmorphism panels, frosted text cards over photos, and blurred scrims. Works on every layer kind, not just shapes.
- **Animations.** The renderer now ships a small set of built-in `@keyframes` — `vc-float`, `vc-drift`, `vc-pulse`, `vc-rotate-slow` — that any layer's `animation` field can reference out of the box (no external stylesheet required). Keyframes are wrapped in `@media (prefers-reduced-motion: no-preference)` so reduced-motion users see nothing animate. New `intro` renderer prop (`"none" | "fade" | "stagger" | "rise"`) animates layers into their final state on mount.
- **Templating.** Compositions are now first-class templates. Two complementary mechanisms: `overrides` (§11.3) for named-slot templating where the caller swaps specific fields on specific layer ids, and **content binding** (§12) — a new `content` anchor on the composition plus a `content` prop on the renderer — for ordered variable-length content streams where the template enforces brand styling via per-kind defaults.
- **Responsive behavior** (§3.4). Role-driven automatic mobile adaptation via the new `role` prop (`"inset"` \| `"background"` \| `"hero"`) and `mobileBreakpoint`. Hero compositions automatically reflow content into a vertical flex column below the breakpoint with decoration hidden; background compositions compress to a banner aspect ratio; insets scale naturally. Container-queried via `ResizeObserver`, not viewport-queried. New `hideBelow` and `decorative` common layer properties give authors fine-grained control.
- **Separator layer kind** (§10). A seventh layer kind — `separators` — for flow-mode-only section breaks. Renders nothing in desktop mode; becomes a horizontal rule with an optional label in hero flow mode. Participates in the z-index stack so templates can interleave separators between content-bound items to enforce visual rhythm across all content payloads.

### Changes from 1.1

- New `sprays` array — CSS-only spray-paint layers with four modes (`airbrush`, `splatter`, `gritty`, `halftone`). Distinct from accents (which use SVG turbulence/displacement); the two coexist as separate layer kinds.

### Changes from 1.0

- `subjects` (plural array) replaces `subject` (singular object). Multiple subject images at different z-levels.
- New `svgs` array for inline SVG layers with embedded markup.
- Gradient backgrounds documented explicitly for shapes and canvas.

---

## 2. File Structure

```json
{
  "$schema": "scene-composition/1.3",

  "name": "Crimson Revolt",
  "description": "Bold red spray accents over a desaturated landscape",
  "author": "Design Studio",
  "created": "2026-04-09T12:00:00Z",
  "modified": "2026-04-09T14:30:00Z",
  "tags": ["hero", "dark", "warm"],

  "composition": {
    "background": "#080808",
    "aspectRatio": "16 / 9",
    "scale": 1,
    "borderRadius": "0",

    "subjects":   [ ... ],
    "texts":      [ ... ],
    "accents":    [ ... ],
    "shapes":     [ ... ],
    "sprays":     [ ... ],
    "svgs":       [ ... ],
    "separators": [ ... ]
  }
}
```

### 2.1 Envelope (Metadata)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `$schema` | string | **Yes** | Format identifier. Must be `"scene-composition/1.3"`. |
| `name` | string | Yes | Human-readable name for the composition. |
| `description` | string | No | Brief description of the visual intent. |
| `author` | string | No | Creator name or organization. |
| `created` | string (ISO 8601) | No | Creation timestamp. |
| `modified` | string (ISO 8601) | No | Last modification timestamp. |
| `tags` | string[] | No | Freeform tags for categorization. |
| `composition` | object | **Yes** | The rendering payload (see §2.2). |

### 2.2 Composition Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `background` | string | `"transparent"` | CSS background value — solid color, gradient, or image (see §2.3). |
| `height` | string | `"100%"` | CSS height. Use `"100vh"` for full-bleed heroes. |
| `width` | string | `"100%"` | CSS width. |
| `aspectRatio` | string | *none* | CSS aspect-ratio (e.g., `"16 / 9"`, `"4 / 3"`, `"1 / 1"`). |
| `scale` | number | `1` | Scale factor applied to pixel-based shape dimensions during normalization. Does not affect percentage or viewport units. |
| `borderRadius` | string | *none* | CSS border-radius for the composition container (e.g., `"12px"`, `"50%"`). |
| `subjects` | array | `[]` | Subject image layers (see §4). |
| `subject` | object | *none* | **Deprecated.** Single subject for backward compatibility with 1.0. If both `subjects` and `subject` are present, `subjects` takes precedence. |
| `texts` | array | `[]` | Text layers (see §5). |
| `accents` | array | `[]` | Spray accent layers (see §6). |
| `shapes` | array | `[]` | Geometric shape layers (see §7). |
| `sprays` | array | `[]` | CSS spray-paint layers (see §8). |
| `svgs` | array | `[]` | Inline SVG layers (see §9). |
| `separators` | array | `[]` | Flow-mode section separator layers (see §10). |

### 2.3 Gradient Backgrounds

The `background` field on both the composition object and individual shapes accepts any valid CSS background value. This includes gradients:

```json
"background": "linear-gradient(135deg, #ff0066, #6600ff)"
"background": "radial-gradient(circle, #00ccff80, #0044aa20, transparent)"
"background": "linear-gradient(160deg, #0c1220 0%, #1a1030 100%)"
```

Gradient backgrounds on shapes are particularly effective for creating soft light sources, neon bars, and atmospheric orbs when combined with `mixBlendMode: "screen"` and `filter: "blur()"`.

---

## 3. Layer Model

All visual elements — subjects, texts, accents, shapes, sprays, and SVGs — share a single z-index space. During rendering, all layer arrays are merged into a unified stack sorted by `zIndex`. There is no special-cased text overlay; text blocks interleave with every other layer kind.

```
z:0   ──── Any layer type
z:1   ──── Any layer type
z:2   ──── Subject image (default zIndex for subjects)
z:3-9 ──── Any layer type
z:10  ──── Text (default zIndex for text layers)
z:11+ ──── Any layer type
```

Layers interact through CSS `mix-blend-mode`. A spray accent at z:4 with `mixBlendMode: "hard-light"` will composite over a subject image at z:2. A text layer at z:11 with `mixBlendMode: "difference"` will auto-contrast against whatever it sits over.

### 3.1 Common Layer Properties

These properties are available on all layer types (accents, shapes, subjects, sprays, SVGs, texts).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto-generated | Unique identifier. Required for override targeting. |
| `zIndex` | integer | `0` | Position in the layer stack. |
| `opacity` | number (0–1) | Varies by kind | Layer opacity. |
| `mixBlendMode` | string | `"normal"` | CSS mix-blend-mode value. |
| `filter` | string | `"none"` | CSS `filter` string (e.g., `"blur(4px)"`, `"invert(1) hue-rotate(180deg)"`, `"drop-shadow(0 6px 16px rgba(0,0,0,0.5))"`). Supported functions: `grayscale()`, `sepia()`, `hue-rotate()`, `brightness()`, `contrast()`, `saturate()`, `blur()`, `invert()`, `drop-shadow()`. |
| `backdropFilter` | string | `"none"` | CSS `backdrop-filter` applied to the layer — frosts the content *behind* the layer rather than the layer itself (e.g., `"blur(12px) saturate(1.4)"`). The renderer emits both unprefixed and `-webkit-` prefixed variants for Safari compatibility. See §7.5 for the glassmorphism recipe. |
| `transform` | string | `"none"` | CSS transform string (e.g., `"rotate(45deg)"`, `"scale(0.6) translate(25%, 5%)"`). |
| `animation` | string | `"none"` | CSS animation shorthand (e.g., `"vc-float 8s ease-in-out infinite"`). Built-in keyframes are documented in §3.3; user-defined keyframes from an external stylesheet can be referenced by name. |
| `hideBelow` | string | *none* | CSS length (e.g., `"640px"`, `"40rem"`). When set, the layer is hidden whenever the composition container's width is below the threshold. Container-width-queried, not viewport-queried. See §3.4. |
| `decorative` | boolean | *none (heuristic)* | Overrides the per-kind decorative classification used by `role="hero"` flow mode. `true` = always treat as decoration (hidden in flow mode); `false` = always treat as content (kept in flow mode). When unset, the per-kind heuristic applies (see §3.4). |

### 3.2 Seven Layer Kinds

| Kind | Array key | Purpose |
|------|-----------|---------|
| **Subject** | `subjects` | Raster/vector images rendered as centered `<img>` elements. |
| **Text** | `texts` | Text blocks with full typography control. |
| **Accent** | `accents` | Procedural noise-based spray-paint layers (full-bleed SVG turbulence). |
| **Shape** | `shapes` | CSS-positioned geometric primitives. |
| **Spray** | `sprays` | CSS-only spray-paint effects (airbrush, splatter, gritty, halftone). |
| **SVG** | `svgs` | Inline SVG markup rendered as positioned DOM elements. |
| **Separator** | `separators` | Flow-mode-only section dividers that render nothing in desktop mode (see §10). |

### 3.3 Animation

The format supports two orthogonal kinds of animation:

1. **Per-layer loop animations** — declared on an individual layer via the `animation` field (see §3.1). These run continuously and are part of the composition's identity (a "floating cloud" accent floats regardless of where the composition is rendered).
2. **Intro animations** — a render-time flag that animates layers into their final state on mount. Not in the composition data; set by the consuming app via a renderer prop. This way the same composition can be a dramatic full-bleed hero reveal or a static card thumbnail depending on context.

#### 3.3.1 Built-in Keyframes

The reference renderer ships a small set of `@keyframes` pre-injected into the document so compositions can reference them without any stylesheet setup:

| Name | Effect | Typical use |
|------|--------|-------------|
| `vc-float` | Gentle vertical drift, ±6px | Accents, decorative shapes |
| `vc-drift` | Slow diagonal drift, ±3px | Clouds, mist, atmospheric layers |
| `vc-pulse` | Opacity pulses between 1 and 0.4 | Neon highlights, glowing rings |
| `vc-rotate-slow` | Full 360° rotation | Badges, rings, emblems |

All use the standalone `translate` / `rotate` CSS properties rather than `transform`, so a layer's own `transform` is never clobbered during the animation.

Usage:

```json
{
  "kind": "shape",
  "type": "circle",
  "animation": "vc-float 8s ease-in-out infinite"
}
```

Custom keyframes defined in the consuming app's own stylesheet can still be referenced by name in the same way. The built-in set is purely additive — it does not restrict what you can animate.

#### 3.3.2 Reduced Motion

All built-in keyframes are wrapped in `@media (prefers-reduced-motion: no-preference)`. When the user has asked for reduced motion, the keyframe definitions effectively don't exist, and any `animation` field referencing them becomes a no-op — layers render in their natural static state with no special handling required by composition authors.

Custom keyframes defined outside the renderer are *not* automatically wrapped. Authors who ship custom keyframes alongside a composition should apply the same media query themselves.

#### 3.3.3 Intro Animations

A renderer accepts an `intro` prop:

| Value | Behavior |
|-------|----------|
| `"none"` (default) | No intro animation. |
| `"fade"` | The whole composition container fades in at once (~0.65s). |
| `"stagger"` | Each layer fades in sequentially in stack order, ~0.08s apart. |
| `"rise"` | Each layer rises (+16px) and fades in sequentially. |

```jsx
<Scene composition={hero} role="hero" intro="stagger" />
<Scene composition={card} />                  {/* static */}
```

Intro animations are implemented with `animation-fill-mode: backwards`, so each layer is in its "from" state during its staggered delay and then animates into its declared final state — there is no "to" duplication in the data. Reduced-motion users see no intro regardless of the prop value.

Per-layer loop animations (`animation` field) and the intro prop are independent: a composition can both fade in on mount *and* have a layer that floats continuously. The intro wrapper is a separate `<div>` around each layer, so the layer's own animation is untouched.

### 3.4 Responsive Behavior

Compositions adapt to small screens via a **role-driven automatic responsive model**. The consuming app tells the renderer how the composition is being used (`role` prop); the renderer applies role-specific behavior below a configurable mobile breakpoint. Everything is keyed to the **composition container's own width** via `ResizeObserver`, not the viewport — so a 400px inset on a 1440px desktop behaves the same as a 400px phone composition.

Authors don't duplicate compositions; the renderer handles mobile automatically. Fine-grained refinement uses two common layer properties: `hideBelow` and `decorative` (see §3.1).

#### 3.4.1 The `role` Prop

A renderer accepts a `role` prop:

| Value | Intended use | Automatic behavior below `mobileBreakpoint` |
|---|---|---|
| `"inset"` (default) | Self-contained illustration bounded by its container (card, sidebar graphic, decorative panel). | None — the composition scales with its container via percentage positioning and `clamp()` font sizes. `hideBelow` per layer still applies. |
| `"background"` | Decorative backdrop behind DOM content. | Container aspect ratio is compressed to a banner shape (default `5 / 1`) so the composition becomes a short strip rather than consuming half the phone screen. Configurable via `backgroundBannerAspect` prop. |
| `"hero"` | Full-bleed hero where the composition carries the content (headline, image, caption). | **Flow mode** activates: decorative layers are hidden, content layers reflow into a vertical flex column, absolute positioning is dropped, and the container's aspect ratio is removed so the flow grows to fit content. |

`<Scene>` defaults `role` to `"inset"`; pass `role="hero"` for a full-bleed hero.

#### 3.4.2 The `mobileBreakpoint` Prop

`<Scene>` accepts a `mobileBreakpoint` prop as a CSS length (default `"640px"`). Below this container width, role-based responsive behavior activates. The breakpoint is interpreted against the composition container, not the viewport.

#### 3.4.3 Hero Flow Mode

When `role="hero"` and the container width is below `mobileBreakpoint`, the renderer switches to **flow mode**:

1. **Decorative layers are hidden entirely.** Classification comes from the per-kind heuristic unless overridden by `decorative`.
2. **Content layers are rendered in a vertical flex column**, not absolutely positioned. Each layer is re-rendered in block mode (text as a full-width block, subject as a full-width responsive image with a max-height cap, svg centered at natural size, shape centered at declared size).
3. **Flow order is determined by spatial position** in the desktop layout (resolved `top` from explicit values or the `vAlign` sugar), so layers that were visually higher up come first in the mobile flow.
4. **Content-binding order wins when applicable.** Content layers come in through the `content` prop (§12) with auto-assigned `zIndex` values — the array order naturally maps to ascending z, which happens to match spatial order for most templates.
5. **The outer container's aspect ratio is unset.** The flex column grows to fit its content; the composition is as tall as it needs to be.
6. **Default spacing between consecutive layers is tight** (~0.75rem), so a headline followed by a subtitle reads as a paired unit. For explicit section breaks, use **separator layers** (§10) — they render only in flow mode and contribute a larger gap plus an optional horizontal rule and label.

Authors whose layer positioning implies a particular reading order usually get the right flow for free. Authors who need a different order can override per-layer `top` to force spatial sort.

#### 3.4.4 Content vs. Decoration Classification

Flow mode needs to know which layers are "content" (the thing the user is reading) versus "decoration" (the atmosphere around it). Two levels:

**Heuristic (no author effort):**

| Kind | Default classification |
|---|---|
| `text` | **Content** |
| `subject` | **Content** |
| `accent` | **Decoration** |
| `spray` | **Decoration** |
| `svg` | **Decoration** (most svgs are decorative flourishes in this format) |
| `shape` | **Decoration** (rings, lines, orbs, gradient bars — usually atmosphere) |

**Explicit override via `decorative` common layer property:**

```json
{ "kind": "svg",  "decorative": false }   // "this is my logo — keep it in the flow"
{ "kind": "text", "decorative": true }    // "this is a ghost backdrop — hide on mobile"
```

Authors only mark layers where the heuristic is wrong, which should be a small minority.

#### 3.4.5 The `hideBelow` Escape Hatch

Any layer, regardless of role, can declare a container-width threshold below which it is hidden:

```json
{ "kind": "accent", "hideBelow": "480px" }
```

This works in every mode (inset, background, hero) and stacks with the role-based behavior. Common uses:
- Hiding atmospheric layers on tight phone screens while keeping the base composition.
- Hiding a complex decorative layer that doesn't read well below a threshold.
- Refining role-based defaults — e.g., in `background` mode, the banner aspect compresses the composition; adding `hideBelow: "640px"` on stubborn decoration cleans up the result further.

#### 3.4.6 Reduced Motion

The transition between desktop and mobile modes (and between absolute and flow) is not animated — it's a hard switch at the breakpoint. This is intentional: animating a layout mode change would be jarring during a resize, and most users only cross the breakpoint once per session.

Per-layer animations and the `intro` prop still respect `prefers-reduced-motion` independently (see §3.3.2).

#### 3.4.7 Backward Compatibility

The `role` prop defaults to `"inset"` which applies no automatic behavior, so existing compositions render exactly as before. `hideBelow` and `decorative` default to unset / heuristic, so existing compositions are unaffected. A renderer that ignores `role` / `mobileBreakpoint` / `hideBelow` / `decorative` renders the composition in its desktop form at all sizes — the composition still works, it just doesn't adapt.

See `docs/guides/responsive.md` for worked examples of each role.

---

## 4. Subjects

Subjects are image layers rendered as centered `<img>` elements. A composition may have zero, one, or many subjects at different z-levels.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto: `"subject-{index}"` | Unique identifier. |
| `src` | string | **Required** | Image URL or path. |
| `alt` | string | `"Subject"` | Accessibility text. |
| `filter` | string | `"none"` | CSS filter string (see §4.1). |
| `transform` | string | `"none"` | CSS transform string. |
| `opacity` | number (0–1) | `1` | Image opacity. |
| `mixBlendMode` | string | `"normal"` | Blend mode against layers below. |
| `zIndex` | integer | `2` | Position in the layer stack. |
| `objectFit` | string | `"contain"` | CSS object-fit value. |
| `objectPosition` | string | `"center center"` | CSS object-position — shifts the focal point inside the crop. Useful with `objectFit: "cover"` for full-bleed images where the subject isn't centered (e.g., `"center 30%"` pulls the subject down). |
| `maxWidth` | string | `"70%"` | Maximum width relative to container. |
| `maxHeight` | string | `"80%"` | Maximum height relative to container. |

### 4.1 Filter String Format

Standard CSS filter functions, space-separated:

```
"grayscale(0.9) contrast(1.3) brightness(1.1) hue-rotate(180deg)"
```

Supported functions: `grayscale()`, `sepia()`, `hue-rotate()`, `brightness()`, `contrast()`, `saturate()`, `blur()`, `invert()`, `drop-shadow()`.

### 4.2 Multi-Subject Composition

Multiple subjects enable layered image compositions. Common patterns:

- **Background wash + focal image:** A full-bleed subject at z:1 with `objectFit: "cover"`, low opacity, and `luminosity` blend, plus a second subject at z:5 with normal blend as the focal point.
- **Overlapping images:** Two subjects at adjacent z-levels with different transforms and blend modes, with spray accents interleaved between them.

### 4.3 Subject Image Portability

The `src` field contains a URL or path. When distributing compositions, renderers should support overriding `src` at render time via the overrides mechanism. SVG files may be referenced by URL as subjects (rendered as `<img src="file.svg">`), but for full inline SVG rendering with blend mode participation of internal elements, use the `svgs` array instead (see §9).

### 4.4 Backward Compatibility

Renderers accepting `scene-composition/1.3` **must** also accept the deprecated `subject` (singular object) field from 1.0 files. If present, it should be treated as a single-element `subjects` array. If both `subject` and `subjects` are present, `subjects` takes precedence.

---

## 5. Texts

Text layers are positioned text blocks. Each layer holds a single string of plain text (multi-line via `\n`). For a heading + subhead, use two text layers — there is no implicit pairing.

Text layers participate in the shared z-index space and accept all common layer properties, so blend modes (e.g. `difference` for auto-contrasting headlines), filters (`blur`, `drop-shadow`), and transforms (`rotate`, `skew`) all work the same way they do on other layer kinds.

### 5.1 Text Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto: `"text-{index}"` | Unique identifier. |
| `content` | string | `""` | Plain text content. `\n` produces a line break. |
| `fontFamily` | string | `"var(--vc-font, Georgia, serif)"` | CSS `font-family` value. |
| `fontSize` | string | `"clamp(1.6rem, 4.5vw, 4rem)"` | CSS `font-size`. |
| `fontWeight` | number \| string | `400` | CSS `font-weight`. |
| `lineHeight` | number \| string | `1.05` | CSS `line-height`. |
| `letterSpacing` | string | `"-0.02em"` | CSS `letter-spacing`. |
| `textAlign` | `"left"` \| `"center"` \| `"right"` \| `"justify"` | inherits from `align` | CSS `text-align` for the rendered text. |
| `color` | string | `"#ffffff"` | CSS `color`. |
| `maxWidth` | string | `"560px"` | Maximum width of the text block. |
| `textShadow` | string | `"none"` | CSS `text-shadow` (e.g., `"0 2px 8px rgba(0,0,0,0.6)"`). See §5.5.1 — this is the preferred way to shadow text because, unlike `filter: drop-shadow()`, it does not create a new stacking context and composes correctly with `mixBlendMode`. |
| `align` | `"left"` \| `"center"` \| `"right"` | `"left"` | Horizontal positioning sugar (see §5.2). |
| `vAlign` | `"top"` \| `"center"` \| `"bottom"` | `"center"` | Vertical positioning sugar (see §5.2). |
| `top` | string | *none* | CSS `top`. Overrides `vAlign`. |
| `bottom` | string | *none* | CSS `bottom`. Overrides `vAlign`. |
| `left` | string | *none* | CSS `left`. Overrides `align`. |
| `right` | string | *none* | CSS `right`. Overrides `align`. |
| `zIndex` | integer | `10` | Position in the layer stack. |
| + Common layer properties (§3.1) ||||

### 5.2 Positioning

A text layer can be positioned in two ways, freely mixed:

**Sugar (`align` / `vAlign`)** — convenient for the common cases. The renderer translates these into absolute positioning:

| Value | Effect |
|-------|--------|
| `align: "left"` | `left: 6%` |
| `align: "center"` | `left: 50%` + `translateX(-50%)` (prepended to user `transform`) |
| `align: "right"` | `right: 6%` |
| `vAlign: "top"` | `top: 12%` |
| `vAlign: "center"` | `top: 50%` + `translateY(-50%)` (prepended to user `transform`) |
| `vAlign: "bottom"` | `bottom: 12%` |

**Absolute (`top` / `left` / `right` / `bottom`)** — exactly the same model as shapes, sprays, and svgs. When any of these is set, it overrides the corresponding `align` / `vAlign` axis.

`textAlign` (the alignment of glyphs *within* the text block) defaults to whatever `align` is set to, but can be set independently — e.g. you can pin a text block to the right edge with `align: "right"` and still have left-aligned text inside it via `textAlign: "left"`.

### 5.3 Multi-Line Content

Use `\n` in `content` to break lines. The renderer applies `white-space: pre-wrap` so line breaks and runs of whitespace are preserved verbatim.

### 5.4 Title + Subtitle Pattern

There is no built-in title/subtitle pairing. Use two text layers:

```json
"texts": [
  {
    "id": "headline",
    "content": "Break Every\nBoundary",
    "fontFamily": "var(--vc-font, Georgia, serif)",
    "fontSize": "clamp(1.6rem, 4.5vw, 4rem)",
    "color": "#f0e8e0",
    "align": "left",
    "vAlign": "center",
    "zIndex": 10
  },
  {
    "id": "subhead",
    "content": "Where raw energy meets precise craft.",
    "fontFamily": "var(--vc-font, system-ui, sans-serif)",
    "fontSize": "clamp(0.8rem, 1.3vw, 1.05rem)",
    "fontWeight": 300,
    "lineHeight": 1.55,
    "letterSpacing": "0",
    "color": "#f0e8e0",
    "opacity": 0.7,
    "maxWidth": "420px",
    "align": "left",
    "vAlign": "center",
    "top": "60%",
    "zIndex": 10
  }
]
```

### 5.5 Text and Blend Modes

Because text is a normal layer, you can use `mixBlendMode: "difference"` for auto-contrasting headlines over photographic backgrounds, `mixBlendMode: "screen"` for additive glow against dark scenes, or `filter: "blur(3px)"` for ghosted backdrop text.

#### 5.5.1 Shadowing Text: `textShadow` vs. `filter: drop-shadow()`

CSS has two ways to cast a shadow behind text. They are not equivalent, and the choice matters when a text layer also uses `mixBlendMode`:

| | `textShadow` | `filter: "drop-shadow(...)"` |
|---|---|---|
| Applies to | Glyphs only | The whole element (text + any background/border) |
| Creates a new stacking context | **No** | **Yes** |
| Composes with `mixBlendMode` on the same layer | **Yes** — shadow and blend both work | **No** — the filter isolates the layer, breaking the blend |
| Multiple shadows | Yes, comma-separated | Yes, multiple `drop-shadow()` calls |

For text, **prefer `textShadow`**. Example — a headline that auto-contrasts via `mixBlendMode: "difference"` and also has a soft shadow for legibility over highlights:

```json
{
  "kind": "text",
  "content": "Into the\nUnknown",
  "color": "#ffffff",
  "mixBlendMode": "difference",
  "textShadow": "0 2px 12px rgba(0, 0, 0, 0.65)",
  "align": "left",
  "vAlign": "center"
}
```

If you apply `filter: "drop-shadow(...)"` to the same layer, the `difference` blend stops working because the filter isolates the text into its own stacking context. `textShadow` doesn't have that problem.

For non-text layers (images, shapes, svgs) where there is no text-specific alternative, `filter: "drop-shadow(...)"` is still the right tool — see §7.5.

### 5.6 Rich Text

Text content is plain text only — no HTML, no markdown. This keeps compositions portable and safe to render. For rich text or CTA buttons, render that content alongside or on top of the `Scene` component rather than encoding it in the composition file.

---

## 6. Accents (Spray Layers)

Accents are procedural noise-based layers rendered as full-bleed SVGs. Each accent produces organic, spray-paint-like visuals through an SVG filter pipeline.

### 6.1 Accent Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto: `"accent-{index}"` | Unique identifier. |
| `variant` | string | `"splatter"` | Visual preset (see §6.3). |
| `color` | string | `"#ff3300"` | Primary fill color for blobs (solid colors only — SVG fill does not accept CSS gradients). |
| `seed` | integer | `1` | Turbulence noise seed. Different seeds produce different organic patterns. Deterministic: same seed always produces the same result. |
| `blobs` | array | `[[80, 45, 30, 20]]` | Source ellipses fed into the noise filter (see §6.2). |
| `intensity` | number | `0.015` | Base frequency of the turbulence noise. Range: `0.002`–`0.06`. |
| `spread` | number | `40` | Displacement magnitude. Range: `2`–`80`. |
| `numOctaves` | integer | `2` | Turbulence octaves. Range: `1`–`5`. |
| + Common layer properties (§3.1) ||||

**Note on gradients:** Accent `color` must be a solid color since it fills SVG ellipses. To achieve gradient-like color variation in spray effects, use per-blob color overrides or layer multiple accents with different solid colors and blend modes.

### 6.2 Blob Notation

Blobs define the source ellipses that the noise filter distorts. Two forms are accepted:

**Compact (array):**
```json
[cx, cy, rx, ry]
[cx, cy, rx, ry, color]
[cx, cy, rx, ry, color, opacity]
```

**Expanded (object):**
```json
{ "cx": 80, "cy": 45, "rx": 30, "ry": 20, "color": "#ff0088", "opacity": 0.6 }
```

Renderers **must** accept both forms.

**Coordinate space:** Blobs use a `160 × 90` viewBox (approximately 16:9) with `preserveAspectRatio="xMidYMid slice"`.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `cx` | number | Yes | — | Horizontal center (0–160). |
| `cy` | number | Yes | — | Vertical center (0–90). |
| `rx` | number | Yes | — | Horizontal radius. |
| `ry` | number | Yes | — | Vertical radius. |
| `color` | string | No | Parent `color` | Per-blob color override. |
| `opacity` | number | No | `1` | Per-blob opacity. |

### 6.3 Variants

| Variant | Character | Use Case |
|---------|-----------|----------|
| `splatter` | Hard edges, high contrast. | Primary accents, bold marks. |
| `mist` | Soft, diffuse, wide blur halo. | Background atmosphere, glow. |
| `drip` | Amplified vertical displacement. | Dripping paint, streaks. |
| `cloud` | Maximum softness, atmospheric. | Deep backgrounds, fog. |

### 6.4 Filter Pipeline

For implementors. Each accent renders through this unified SVG filter chain:

1. **Turbulence** — `feTurbulence` (fractalNoise) from `intensity`, `numOctaves`, `seed`.
2. **Displacement** — `feDisplacementMap` distorts source ellipses, scaled by `spread × variant.dispScale`.
3. **Pre-blur** — `feGaussianBlur` softens edges (`variant.blurPre`).
4. **Alpha crush** — `feComponentTransfer` gamma steepens alpha (`variant.alphaExp`).
5. **Post-blur** — Optional halo blur (`variant.blurPost`).
6. **Grain overlay** — High-frequency turbulence composited for stipple texture.

---

## 7. Shapes (Geometric Layers)

Shapes are CSS-positioned elements that add geometric structure. They use absolute positioning relative to the composition container.

### 7.1 Shape Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto: `"shape-{index}"` | Unique identifier. |
| `type` | string | `"circle"` | Geometric type (see §7.2). |
| `background` | string | `"#ffffff"` | CSS background — solid color, gradient, or any valid CSS background value (see §7.3). |
| `color` | string | *none* | CSS color (used by `ring` for stroke, `triangle` for fill). |
| `width` | string | `"80px"` | CSS width. |
| `height` | string | `"80px"` | CSS height. |
| `top` | string | `"50%"` | CSS top position. |
| `bottom` | string | *none* | CSS bottom position. |
| `left` | string | `"50%"` | CSS left position. |
| `right` | string | *none* | CSS right position. |
| `borderRadius` | string | *none* | Override for `rect` type. |
| `strokeWidth` | string | `"3px"` | Border width for `ring` type. |
| + Common layer properties (§3.1) ||||

### 7.2 Shape Types

| Type | Rendering |
|------|-----------|
| `circle` | Full circle (`border-radius: 50%`). |
| `blob` | Alias for `circle`. |
| `diamond` | Square rotated 45°. |
| `pill` | Elongated oval (`border-radius: 9999px`). |
| `rect` | Rectangle with optional `borderRadius`. |
| `half-circle-top` | Semi-circle, flat edge at bottom. |
| `half-circle-bottom` | Semi-circle, flat edge at top. |
| `arch` | Rectangle with fully rounded top edge. |
| `triangle` | CSS border-based triangle pointing upward. |
| `ring` | Circle outline only. Uses `color` for stroke. |
| `line` | Thin rectangle (2px height). |

### 7.3 Gradient Shapes

The `background` property accepts any CSS background value, including gradients. Common patterns for sophisticated compositions:

**Radial gradient orbs** — soft light sources:
```json
{
  "type": "circle",
  "background": "radial-gradient(circle, rgba(255,0,102,0.5), rgba(102,0,255,0.1), transparent)",
  "width": "250px", "height": "250px",
  "filter": "blur(8px)",
  "mixBlendMode": "screen"
}
```

**Linear gradient bars** — neon accents:
```json
{
  "type": "pill",
  "background": "linear-gradient(90deg, #ff0066, #6600ff)",
  "width": "180px", "height": "18px",
  "transform": "rotate(-6deg)",
  "mixBlendMode": "screen"
}
```

### 7.4 Responsive Considerations

- **Use percentage units** (`width: "15%"`) for shapes that should scale with the container.
- **Use pixel units** (`width: "200px"`) for fixed-size shapes.
- **Use the `scale` property** on the composition to uniformly scale pixel-based dimensions.

### 7.5 Recipes

Shapes don't have dedicated "glass" or "shadow" types — these looks are recipes composed from existing common layer properties (see §3.1).

#### Glassmorphism panel

Combine a low-alpha `background`, `backdropFilter` blur, and a drop-shadow for elevation:

```json
{
  "id": "glass-panel",
  "type": "rect",
  "background": "rgba(255, 255, 255, 0.08)",
  "backdropFilter": "blur(14px) saturate(1.5)",
  "borderRadius": "16px",
  "width": "340px",
  "height": "200px",
  "top": "30%",
  "left": "10%",
  "filter": "drop-shadow(0 16px 48px rgba(0, 0, 0, 0.35))",
  "zIndex": 8
}
```

Works on any layer kind — a text block with the same treatment becomes a frosted caption card over a photo.

#### Drop-shadow elevation

Drop-shadows are authored via the `filter` property's `drop-shadow()` function. Unlike `box-shadow`, it follows the alpha channel of the element — so shadows on circles, pills, triangles, SVG icons, and images with transparency all cast a correctly-shaped shadow:

```json
{
  "type": "circle",
  "background": "#ff3300",
  "width": "80px",
  "height": "80px",
  "filter": "drop-shadow(0 6px 24px rgba(255, 51, 0, 0.55))"
}
```

Multiple filter functions can be combined — e.g. `"grayscale(0.5) drop-shadow(0 4px 12px rgba(0,0,0,0.4))"` on a subject image applies both effects.

#### Frosted scrim

A full-bleed rect with no background and a strong backdrop blur acts as a depth scrim — it blurs everything underneath it while leaving layers above it sharp:

```json
{
  "type": "rect",
  "background": "transparent",
  "backdropFilter": "blur(20px) brightness(0.9)",
  "width": "100%",
  "height": "100%",
  "top": "0",
  "left": "0",
  "zIndex": 5
}
```

#### Full-width media card (image + gradient scrim + text)

The canonical "content card" pattern: a full-bleed photo with a dark gradient fading up from the bottom so a headline overlaid on it has guaranteed contrast. Composed from three layers — a subject in cover mode, a rect shape with a vertical linear-gradient, and a text layer pinned to the bottom of the frame.

```json
{
  "subjects": [
    {
      "id": "card-photo",
      "src": "https://example.com/landscape.jpg",
      "maxWidth": "100%",
      "maxHeight": "100%",
      "objectFit": "cover",
      "zIndex": 2
    }
  ],
  "shapes": [
    {
      "id": "card-scrim",
      "type": "rect",
      "background": "linear-gradient(180deg, transparent 0%, transparent 45%, rgba(0,0,0,0.85) 100%)",
      "width": "100%",
      "height": "100%",
      "top": "0",
      "left": "0",
      "zIndex": 3
    }
  ],
  "texts": [
    {
      "id": "card-title",
      "content": "Coastal\nEscape",
      "color": "#ffffff",
      "textShadow": "0 2px 12px rgba(0,0,0,0.6)",
      "align": "left",
      "vAlign": "bottom",
      "maxWidth": "80%",
      "zIndex": 10
    },
    {
      "id": "card-caption",
      "content": "A three-day drive along the Atlantic shore.",
      "fontFamily": "var(--vc-font, system-ui, sans-serif)",
      "fontSize": "clamp(0.75rem, 1.1vw, 0.95rem)",
      "fontWeight": 300,
      "lineHeight": 1.55,
      "letterSpacing": "0",
      "color": "#ffffff",
      "opacity": 0.8,
      "align": "left",
      "bottom": "6%",
      "maxWidth": "80%",
      "zIndex": 10
    }
  ]
}
```

**Key things to notice:**

- **Subject defaults to "focal image" mode** (`maxWidth: "70%"`, `objectFit: "contain"`, centered with padding). For full-bleed, you must override `maxWidth`, `maxHeight`, and `objectFit`. This is intentional — subjects are designed for focal compositions by default, and full-bleed is an explicit opt-in.
- **The scrim is just a rect shape** with a CSS linear-gradient background. No special layer kind.
- **`textShadow` on the title** adds a subtle drop-shadow for legibility across variations in the underlying photo. See §5.5.1 for why `textShadow` is preferred over `filter: drop-shadow()` for text.
- **The title uses `vAlign: "bottom"`** sugar; the caption uses explicit `bottom: "6%"` to sit above the title. You can mix the two positioning modes freely.

**Variations:**

- **Top scrim** — flip the gradient direction: `"linear-gradient(0deg, transparent 0%, transparent 45%, rgba(0,0,0,0.85) 100%)"`, pair with `vAlign: "top"` text.
- **Full vignette** — radial gradient: `"radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)"` — darkens the edges for a classic photo vignette.
- **Brighten instead of darken** — for dark text over a busy photo: `"linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.85) 100%)"`.
- **Focal-point control** — add `objectPosition: "center 30%"` to the subject (any valid CSS `object-position` value) to pull the subject up or shift it sideways inside the crop.

---

## 8. Sprays (CSS Spray-Paint Layers)

Spray layers are CSS-only spray-paint effects applied to a positioned `<div>`. They are distinct from **Accents** (§6): accents use a full-bleed SVG turbulence/displacement filter pipeline, while sprays use pure CSS techniques (`mask-image`, `box-shadow`, scoped `feTurbulence`). Both kinds can coexist freely in the same composition.

A spray layer has a `mode` field selecting one of four visual styles. All four modes share three primary knobs — `fill`, `spread`, and `radius` — plus standard layer position and appearance properties.

### 8.1 Common Spray Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto: `"spray-{index}"` | Unique identifier. |
| `mode` | string | `"airbrush"` | One of `airbrush`, `splatter`, `gritty`, `halftone`. |
| `fill` | string | `"#ff3300"` | CSS color or gradient (see per-mode notes). |
| `spread` | number (0–100) | `60` | Fade radius / scatter distance. Meaning varies by mode. |
| `radius` | number (0–100) | `50` | Density / intensity. Meaning varies by mode. |
| `seed` | integer | `1` | (splatter only) PRNG seed for stable dot patterns. |
| `width` | string | `"300px"` | CSS width. |
| `height` | string | `"300px"` | CSS height. |
| `top` / `bottom` / `left` / `right` | string | — | CSS position. |
| + Common layer properties (§3.1) ||||

### 8.2 Mode: `airbrush`

Solid or gradient fill masked by a radial gradient — soft, diffuse halo.

| Knob | Range | Meaning |
|------|-------|---------|
| `fill` | color or gradient | Background paint. |
| `spread` | 0–100 | Fade radius (% of element). |
| `radius` | 0–100 | Core opacity (`radius / 100`). |

### 8.3 Mode: `splatter`

A 1×1 source element with hundreds of `box-shadow` dots scattered around it. Distribution is biased toward the center via `pow(rand, 1.8)`. Uses a seeded `mulberry32` PRNG so reloads do not reshuffle the pattern.

| Knob | Range | Meaning |
|------|-------|---------|
| `fill` | **single color only** | `box-shadow` cannot use gradients. If a gradient string is supplied, the renderer extracts the first hex/rgba match. |
| `spread` | 0–100 | Scatter radius. Pixels = `spread × 3`. |
| `radius` | 0–100 | Dot count. Count = `radius × 15`. |
| `seed` | integer | PRNG seed — controls the exact dot pattern. |

### 8.4 Mode: `gritty`

Airbrush mask combined with a per-instance `feTurbulence` filter that eats away at the fill into a stippled spray-can texture.

| Knob | Range | Meaning |
|------|-------|---------|
| `fill` | color or gradient | Background paint. |
| `spread` | 0–100 | Fade radius (radial mask). |
| `radius` | 0–100 | Noise frequency (`0.1 → 1.5`). |

The SVG filter `id` **must** be scoped per-instance (e.g. `spray-gritty-${layer.id}`) so multiple gritty layers in one composition do not collide.

### 8.5 Mode: `halftone`

Two stacked CSS masks — a radial fade and a tiny grid of dots — produce a comic-book halftone pattern.

| Knob | Range | Meaning |
|------|-------|---------|
| `fill` | color or gradient | Background paint. |
| `spread` | 0–100 | Fade radius (% of element). |
| `radius` | 0–100 | Inversely sets the dot grid size — higher = finer dots. |

### 8.6 Example

```json
{
  "id": "spray-pink",
  "mode": "airbrush",
  "fill": "linear-gradient(135deg, #ff0066, #ffcc00)",
  "spread": 70,
  "radius": 60,
  "width": "60%",
  "height": "70%",
  "top": "15%",
  "left": "20%",
  "zIndex": 4,
  "mixBlendMode": "screen"
}
```

---

## 9. SVGs (Inline Vector Layers)

SVG layers embed vector markup directly in the composition. The markup renders as an inline DOM element, so internal SVG elements participate in the composition's blend mode stack and can use features like `<linearGradient>`, `<radialGradient>`, and `<filter>` natively.

The `content` field accepts either a **complete `<svg>…</svg>` document** or a **bare fragment** (e.g., a `<path>`, a `<g>`, a `<circle>`). Fragments are auto-wrapped by the renderer — see §9.3.

### 9.1 SVG Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto: `"svg-{index}"` | Unique identifier. |
| `content` | string | **Required** | SVG markup. Either a complete `<svg>…</svg>` element or a bare fragment (see §9.3). |
| `viewBox` | string | `"0 0 100 100"` | Coordinate space for fragment content. Used only when `content` is auto-wrapped; ignored when `content` is a complete `<svg>` with its own `viewBox`. |
| `color` | string | *none* | CSS `color` applied to the wrapper. Inherited by any `fill="currentColor"` or `stroke="currentColor"` inside the markup. Accepts CSS variables (e.g., `"var(--accent)"`). |
| `width` | string | `"120px"` | CSS width of the wrapper. |
| `height` | string | `"120px"` | CSS height of the wrapper. |
| `top` | string | *none* | CSS top position. |
| `bottom` | string | *none* | CSS bottom position. |
| `left` | string | *none* | CSS left position. |
| `right` | string | *none* | CSS right position. |
| + Common layer properties (§3.1) ||||

### 9.2 Usage Notes

- SVG markup is rendered via `innerHTML`. In untrusted environments, sanitize the content to strip `<script>` tags, event handlers, and external references before rendering. Auto-wrapping does not change the threat model — the same sanitizer applies to both fragment and complete-svg inputs.
- For simple vector images that don't need internal blend mode interaction, referencing an SVG URL via a subject layer (`src: "logo.svg"`) is more lightweight.
- SVG gradients (`<linearGradient>`, `<radialGradient>`) are defined natively within the SVG markup — no special DSL support is needed.
- Use `fill="currentColor"` / `stroke="currentColor"` inside the markup and set the layer's `color` prop to reskin a shape without editing the markup itself.

### 9.3 Auto-Wrapping Fragment Content

When `content` does not begin with an `<svg>` element (ignoring leading whitespace, XML prologs, and HTML comments), the renderer wraps it in a default `<svg>` sized to fill the layer:

```html
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="${layer.viewBox}"
     width="100%" height="100%"
     preserveAspectRatio="xMidYMid meet">
  ${layer.content}
</svg>
```

This lets you write the minimum markup your layer actually needs:

```json
{
  "id": "star",
  "content": "<path d='M50 5 L61 35 L95 35 L68 57 L79 91 L50 70 L21 91 L32 57 L5 35 L39 35 Z' fill='currentColor'/>",
  "color": "#ffcc00",
  "width": "60px",
  "height": "60px",
  "zIndex": 7,
  "mixBlendMode": "screen"
}
```

If `content` already begins with `<svg`, it passes through unchanged and the layer's `viewBox` field is ignored (yours wins). This means existing complete-svg content keeps working with no migration.

### 9.4 `viewBox` vs. `width` / `height`

The two serve different purposes and do not fight each other:

| | Job | Unit |
|---|---|---|
| `width` / `height` | Physical size of the wrapper on the composition canvas | CSS (`"150px"`, `"35%"`) |
| `viewBox` | Coordinate space your path/shape data is drawn in | SVG user units |

With the default `preserveAspectRatio="xMidYMid meet"`, the viewBox is scaled uniformly to fit the wrapper and centered. A point at `cx="50" cy="50"` in a `0 0 100 100` viewBox renders dead-center regardless of whether the wrapper is `120px × 120px` or `300px × 300px`. If the wrapper aspect ratio does not match the viewBox (e.g., wrapper `200 × 100`, viewBox `0 0 100 100`), the content is centered horizontally with dead space on the sides.

In short: **set `width`/`height` to decide how much canvas the layer occupies; set `viewBox` to decide what coordinate space your shapes are drawn in.** They scale independently.

### 9.5 Example

Two layers, one fragment + one complete `<svg>`, using the `color` prop to theme a `currentColor` fill:

```json
"svgs": [
  {
    "id": "star-marker",
    "content": "<polygon points='50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35' fill='currentColor'/>",
    "color": "#ffcc00",
    "width": "50px",
    "height": "50px",
    "top": "30%",
    "left": "40%",
    "zIndex": 7,
    "opacity": 0.5,
    "mixBlendMode": "screen"
  },
  {
    "id": "decorative-circles",
    "content": "<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><circle cx='60' cy='80' r='50' fill='#ff0066' opacity='0.7'/><circle cx='120' cy='90' r='45' fill='#6600ff' opacity='0.6'/></svg>",
    "width": "35%",
    "height": "70%",
    "top": "15%",
    "left": "50%",
    "zIndex": 5,
    "opacity": 0.8,
    "mixBlendMode": "screen"
  }
]
```

---

## 10. Separators

Separators are a **flow-mode-only** layer kind that create visual section breaks when a `role="hero"` composition drops into mobile flow mode (§3.4.3). In every other rendering context — desktop mode, `role="inset"`, `role="background"`, or any composition rendered above its `mobileBreakpoint` — a separator layer contributes nothing to the output.

Separators are first-class layers and participate in the z-index stack like any other layer. This is the key to **template-enforced visual rhythm**: a template can declare separators at specific z-indices, and when content flows in via content binding (§12) the separators naturally interleave between content items at predictable positions.

### 10.1 Separator Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | Auto: `"separator-{index}"` | Unique identifier. |
| `gap` | `"normal"` \| `"large"` | `"large"` | Vertical space contributed in flow mode. `"normal"` ≈ 0.5rem extra margin (~2rem total separation including the default gap); `"large"` ≈ 1.5rem extra margin (~4rem total). |
| `label` | string | *none* | Optional centered label rendered between the rule segments. Useful for section headers like `"Related"`, `"Footer"`, `"§ II"`. |
| `color` | string | `"currentColor"` | Rule and label color. Inherits the composition container's `color` by default, so templates can theme it via a CSS variable or a container-level `color` style. |
| `thickness` | string | `"1px"` | CSS length for the horizontal rule. Set to `"0"` for invisible gap only (just contributes vertical space). |
| `zIndex` | integer | `0` | Position in the layer stack. Used for interleaving with content layers. |
| + Common layer properties (§3.1) ||||

### 10.2 Rendering Behavior

**Desktop mode** (any role, or any role above `mobileBreakpoint`): a separator layer renders nothing. It is silently skipped during layer rendering. The layer still exists in the normalized scene and is available for editors, inspectors, and tooling, but it contributes zero pixels to the output.

**Hero flow mode** (`role="hero"` below `mobileBreakpoint`): the separator renders as a block-level element in the vertical flex column at its sort position. The rendering depends on whether a `label` is present:

- **With `label`**: a flex row with two horizontal rule segments separating the centered label text. Label styling is fixed (small, uppercase, letter-spaced, ~70% opacity) to stay consistent with the composition's visual rhythm.
- **Without `label`**: a simple horizontal rule (`border-top: ${thickness} solid ${color}`) at ~30% opacity.

The separator contributes its own vertical margin (determined by `gap`) **in addition to** the flex column's default ~0.75rem gap between consecutive layers.

### 10.3 Template-Enforced Rhythm

Separators pair naturally with content binding (§12). A template can declare separator layers at specific z-indices that match the gaps between the content anchor's `zStart` / `zStep` values:

```json
{
  "$schema": "scene-composition/1.3",
  "name": "Article Template",
  "composition": {
    "aspectRatio": "3 / 4",
    "background": "#0a0014",

    "content": {
      "zStart": 100,
      "zStep": 100,
      "defaults": {
        "text":    { "color": "#ffffff", "textShadow": "0 2px 14px rgba(0,0,0,0.6)" },
        "subject": { "maxWidth": "100%", "maxHeight": "100%", "objectFit": "cover" }
      }
    },

    "separators": [
      { "id": "tpl-section-1", "zIndex": 150, "gap": "large" },
      { "id": "tpl-section-2", "zIndex": 250, "gap": "normal", "label": "Read more" }
    ]
  }
}
```

With content of three items (auto-assigned `zIndex: 100, 200, 300`), the flow-mode stack becomes:

| z | Layer | Rendered block |
|---|---|---|
| 100 | content[0] (headline text) | block text |
| 150 | `tpl-section-1` separator | large horizontal rule |
| 200 | content[1] (hero image) | full-width image |
| 250 | `tpl-section-2` separator | labeled horizontal rule ("Read more") |
| 300 | content[2] (caption text) | block text |

In desktop mode, the same composition renders content layers at their absolute positions and the separators render nothing — they are invisible markup that only activates on mobile. The caller passing content through this template gets the same visual rhythm on phone sizes regardless of the content they supply.

### 10.4 When Not to Use Separators

- **For truly tight-paired layers** (e.g., a small label sitting directly above a headline with no visual break): don't add a separator between them. The default flow gap (~0.75rem) already produces a paired look. If you need an even tighter visual bond, use a single text layer with `\n` in the content instead of two separate layers.
- **For desktop-visible divider lines**: use a `line` or `rect` shape with explicit positioning. Separators are flow-mode-only by design.
- **For spacing that already feels right**: don't add a separator. The default gap between flow-mode siblings is ~0.75rem — enough breathing room for most content transitions without looking crowded.
- **For content that's hidden on mobile entirely**: use `hideBelow` on the layer itself. A separator exists to create a visible break, not to hide neighbors.

### 10.5 Interaction with Other Features

- **Overrides** (§11.3): separator layers can be overridden by id like any other layer. A template declares a separator with `label: "Related"`, the caller overrides it to `label: "Sponsored"` at render time.
- **Content binding** (§12): a caller can also pass separator items in the `content` array if they want per-render-time control over breaks. The template's declared separators and the content-bound separators coexist.
- **Common layer props** (§3.1): separators support `opacity`, `mixBlendMode`, `filter`, `animation`, `hideBelow`, and `decorative`. Setting `decorative: true` on a separator would hide it from the flow mode output, but this is rarely useful — the normal way to disable a separator is to set its `hideBelow` or just remove it from the composition.

---

## 11. Rendering

### 11.1 Container Behavior

The composition renders into a `<div>` with `position: relative` and `overflow: hidden`. All layers are absolutely positioned within it.

**Full-bleed mode:** `height: "100vh"`, `width: "100%"`.  
**Contained mode:** Set `aspectRatio` and let the parent control width.

### 11.2 Normalization

Before rendering, the raw composition data is normalized:

1. **Defaults applied** — all omitted properties receive their default values.
2. **Blob expansion** — compact array blobs are converted to object form.
3. **ID generation** — layers without `id` receive auto-generated identifiers.
4. **Scale application** — pixel-based shape dimensions are multiplied by `scale`.
5. **Backward compatibility** — singular `subject` is converted to a single-element `subjects` array.
6. **Layer merge** — all layer arrays (`subjects`, `texts`, `accents`, `shapes`, `sprays`, `svgs`, `separators`) are merged into a single array sorted by `zIndex`.

### 11.3 Overrides (Named-Slot Templating)

Renderers **should** support an `overrides` mechanism that merges over normalized layers at render time, keyed by layer `id`. The reference renderer applies it via the `composeScene` helper (a flat `{ [id]: partial }` map):

```jsx
import { Scene, composeScene } from '@uniweb/scene'

const scene = composeScene(articleHeroTemplate, {
  overrides: {
    "headline":   { content: "Article Title From CMS" },
    "subtitle":   { content: "Published March 2026" },
    "hero-image": { src: "/articles/march-feature.jpg" }
  }
})

<Scene composition={scene} />
```

This is the **named-slot templating mechanism**: a composition becomes a reusable template when its variable layers carry stable, contract-y ids (`headline`, `hero-image`, etc.) and the consuming app swaps specific fields per render. Everything the template decides — layout, typography, color, blend modes, animations, decorative layers — stays in the composition JSON; only the content changes.

Overrides merge per layer by shallow property spread: the override fields win, unspecified fields are preserved from the template. You can override any layer field including `content`, `src`, `color`, `opacity`, `mixBlendMode`, `transform`, etc. You cannot change a layer's `kind` via overrides.

Named-slot templating is the right tool when the **shape** of the content is fixed (one title, one subtitle, one hero image) and only the values vary across renders. For ordered variable-length content streams where the number and mix of items changes, use **content binding** (§12) instead. Both mechanisms coexist freely on the same composition.

See `docs/guides/templates.md` for complete worked examples.

---

## 12. Content Binding

Content binding is the render-time mechanism for stitching an **ordered variable-length stream** of content layers into a template. Where `overrides` (§11.3) is for known-shape templates with stable layer ids, content binding is for the common CMS pattern where a caller has, say, "a title, a hero image, and a caption" — or "a list of paragraphs interleaved with pull-quotes" — and wants to run them through a branded template without encoding each slot as a named layer.

The template declares a `content` anchor describing where content items slot into the layer stack and what styling they inherit. The caller passes an ordered array of partial layer objects as the content stream (the reference renderer takes it as the `content` argument to `composeScene`). The renderer expands each item into a real layer, merges in the template's per-kind defaults, auto-assigns a `zIndex`, and inserts it into the normal layer stack.

### 12.1 The `content` Anchor

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `zStart` | integer | `100` | `zIndex` of the first content layer. |
| `zStep` | integer | `100` | `zIndex` increment between consecutive content layers. A step of 100 leaves 99 z-levels of breathing room per slot for template-authored layers to interleave. |
| `defaults` | object | `{}` | Per-kind default props applied to content items before the item's own fields. Enforces brand-consistent styling across payloads. Keys: `text`, `subject`, `svg`, `shape`. |

Example:

```json
{
  "composition": {
    "content": {
      "zStart": 100,
      "zStep": 100,
      "defaults": {
        "text": {
          "fontFamily": "var(--vc-font, Georgia, serif)",
          "fontSize": "clamp(1.4rem, 3vw, 2.4rem)",
          "color": "#ffffff",
          "textShadow": "0 2px 12px rgba(0,0,0,0.55)",
          "align": "left",
          "maxWidth": "80%"
        },
        "subject": {
          "maxWidth": "100%",
          "maxHeight": "100%",
          "objectFit": "cover"
        }
      }
    },

    "accents": [
      { "id": "cloud",  "zIndex": 50,  "variant": "cloud",    "...": "..." },
      { "id": "splash", "zIndex": 250, "variant": "splatter", "...": "..." }
    ]
  }
}
```

### 12.2 The `content` Prop

Callers pass an ordered array as the content stream (the reference renderer takes it via `composeScene`):

```jsx
const scene = composeScene(template, { content: [
  { kind: "text",    content: "Breaking News" },
  { kind: "subject", src: "/hero.jpg" },
  { kind: "text",    content: "By Jane Doe\nMarch 2026", fontSize: "1rem", opacity: 0.75, bottom: "8%" }
]})

<Scene composition={scene} />
```

Each content item is a **partial layer object**: it must have a `kind` field and may have any subset of the fields that kind supports. Missing fields are filled in from `content.defaults[kind]`, then from the renderer's global per-kind defaults.

### 12.3 Precedence

An individual field on a content layer is resolved in this order (highest wins):

1. **Explicit field on the content item** — `{ content: "Hello" }`
2. **`composition.content.defaults[kind]`** — template's branded default
3. **Renderer's global per-kind defaults** — `TEXT_DEFAULTS`, `SUBJECT_DEFAULTS`, etc.

This lets callers pass minimal data (`{ kind: "text", content: "Hi" }`) and inherit everything else from the template, while still being able to override any field per-item when they need to.

### 12.4 z-Index Assignment

Each content item is assigned `zIndex = zStart + i * zStep` based on its position in the array, unless the item sets its own `zIndex` explicitly. With the default `zStart: 100`, `zStep: 100`:

- Content item 0 → `zIndex: 100`
- Content item 1 → `zIndex: 200`
- Content item 2 → `zIndex: 300`

Template-authored layers at `zIndex: 50`, `150`, `250`, `350` will interleave between, above, and below the content. Pick your template z-indices to match the interleaving you want.

### 12.5 Resulting Layer Stack

Content layers are merged into the unified layer list alongside template-authored layers and sorted by `zIndex`. There is no separate "content layer" — the output of content binding is indistinguishable from a layer that was authored into the template directly. All common layer properties (`mixBlendMode`, `filter`, `backdropFilter`, `transform`, `animation`, `textShadow`, etc.) work the same way on content layers as on template layers.

### 12.6 When to Use Overrides vs. Content Binding

| Situation | Use |
|---|---|
| Fixed shape, stable ids (one title, one image) | **Overrides** (§11.3) |
| Variable-length ordered stream | **Content binding** (this section) |
| Some slots are fixed, others are a stream | **Both** — they coexist freely on the same composition |

See `docs/guides/templates.md` for side-by-side worked examples.

### 12.7 Backward Compatibility

Templates without a `content` block work unchanged — the renderer simply has no content anchor to expand against, and any `content` prop passed at render time gets expanded using the built-in default `zStart: 100`, `zStep: 100`, and no per-kind defaults (just the global kind defaults). Renderers that ignore the `content` prop work unchanged as well. This makes content binding fully additive to existing compositions.

---

## 13. MIME Type and File Extension

| | Value |
|---|---|
| File extension | `.scene.json` |
| MIME type | `application/json` |
| Schema identifier | `scene-composition/1.3` |



---

## 14. Versioning

The `$schema` field identifies the format version. Breaking changes will increment the major version number.

| Version | Changes |
|---------|---------|
| 1.0 | Initial release. Single `subject`, `accents`, `shapes`. |
| 1.1 | Multi-subject (`subjects` array), inline SVGs (`svgs` array), gradient documentation. |
| 1.2 | CSS spray layers (`sprays` array) with four modes — airbrush, splatter, gritty, halftone. |
| 1.3 | Text promoted to a first-class layer kind (`texts` array). `backdropFilter` as a common layer property. Built-in `@keyframes` + `intro` renderer prop (reduced-motion aware). SVG auto-wrap for fragment content + `viewBox` + `color` theming. Structured drop-shadow and text-shadow authoring in the editor. `objectPosition` on subjects. Content binding: `content` anchor on compositions + `content` prop on the renderer for ordered render-time content streams. Responsive behavior: `role` + `mobileBreakpoint` props driving automatic adaptation for background/inset/hero roles, plus `hideBelow` and `decorative` common layer properties. Separator layer kind (`separators` array) for flow-mode section breaks. |

---

## Appendix A: Complete Example (Multi-Subject with SVG)

```json
{
  "$schema": "scene-composition/1.3",
  "name": "Dual Image with Vectors",
  "description": "Two subject images at different z-levels with spray accents, gradient shapes, inline SVG, and two text layers",
  "created": "2026-04-09T14:00:00Z",

  "composition": {
    "background": "linear-gradient(160deg, #0a0014, #0d0028)",

    "subjects": [
      {
        "id": "bg-wash",
        "src": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=900&q=80",
        "filter": "grayscale(1) contrast(1.2) brightness(0.6)",
        "opacity": 0.4,
        "mixBlendMode": "luminosity",
        "zIndex": 1,
        "maxWidth": "100%",
        "maxHeight": "100%",
        "objectFit": "cover"
      },
      {
        "id": "focal-image",
        "src": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80",
        "filter": "grayscale(0.5) contrast(1.3)",
        "transform": "scale(0.6) translate(25%, 5%)",
        "opacity": 0.85,
        "zIndex": 5
      }
    ],

    "texts": [
      {
        "id": "headline",
        "content": "Two Worlds\nOne Frame",
        "color": "#e8e0d8",
        "align": "left",
        "vAlign": "center",
        "mixBlendMode": "difference",
        "zIndex": 10
      },
      {
        "id": "tagline",
        "content": "Subjects layered with spray accents and inline SVG.",
        "fontFamily": "var(--vc-font, system-ui, sans-serif)",
        "fontSize": "clamp(0.8rem, 1.3vw, 1.05rem)",
        "fontWeight": 300,
        "lineHeight": 1.55,
        "letterSpacing": "0",
        "color": "#e8e0d8",
        "opacity": 0.75,
        "align": "left",
        "top": "62%",
        "maxWidth": "420px",
        "zIndex": 10
      }
    ],

    "accents": [
      {
        "id": "deep-cloud",
        "variant": "cloud",
        "color": "#1a0033",
        "seed": 8,
        "blobs": [[80, 50, 60, 40]],
        "intensity": 0.004,
        "spread": 50,
        "numOctaves": 3,
        "zIndex": 0,
        "opacity": 0.9
      },
      {
        "id": "mid-splatter",
        "variant": "splatter",
        "color": "#cc4400",
        "seed": 55,
        "blobs": [[90, 45, 25, 20], [110, 55, 18, 15]],
        "intensity": 0.014,
        "spread": 32,
        "zIndex": 3,
        "opacity": 0.7,
        "mixBlendMode": "hard-light"
      }
    ],

    "shapes": [
      {
        "id": "gradient-orb",
        "type": "circle",
        "background": "radial-gradient(circle, rgba(255,0,102,0.5), transparent)",
        "width": "200px",
        "height": "200px",
        "top": "20%",
        "left": "55%",
        "zIndex": 4,
        "mixBlendMode": "screen",
        "filter": "blur(10px)"
      }
    ],

    "svgs": [
      {
        "id": "decorative-mark",
        "content": "<svg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><polygon points='50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35' fill='#ffcc00'/></svg>",
        "width": "50px",
        "height": "50px",
        "top": "30%",
        "left": "40%",
        "zIndex": 7,
        "opacity": 0.5,
        "mixBlendMode": "screen"
      }
    ]
  }
}
```

## Appendix B: Minimal Example

```json
{
  "$schema": "scene-composition/1.3",
  "name": "Red Splash",
  "composition": {
    "accents": [
      {
        "color": "#cc2200",
        "seed": 42,
        "blobs": [[80, 45, 30, 20]]
      }
    ]
  }
}
```
