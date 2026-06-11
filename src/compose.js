/**
 * Pure, SSR-safe templating for content-driven hosts. No React, no DOM, no
 * randomness — safe to call at build time, in SSR, and on the client (ids are
 * deterministic, so server/client output matches).
 *
 * `composeScene(template, { overrides, content })` returns a NEW composition
 * with two transforms applied, then handed straight to <Scene>:
 *
 *   - overrides (spec §11.3): named-slot templating. `{ [layerId]: partial }`
 *     shallow-merges onto the layer with that id. An explicit field wins.
 *   - content  (spec §12): ordered, variable-length content stream. Each item
 *     `{ kind, ...fields }` becomes a layer, merged under the template's
 *     `content.defaults[kind]` (so the template enforces brand styling), with
 *     zIndex auto-assigned from `content.{zStart,zStep}` unless the item sets
 *     its own.
 *
 * Input may be an envelope (`{ $schema, composition }`) or a bare composition;
 * the return value matches the input shape.
 */

const KIND_TO_GROUP = {
  subject: 'subjects',
  shape: 'shapes',
  spray: 'sprays',
  accent: 'accents',
  svg: 'svgs',
  text: 'texts',
  separator: 'separators'
}

const GROUPS = Object.values(KIND_TO_GROUP)

export function composeScene(template, { overrides, content } = {}) {
  const isEnvelope = !!(template && typeof template.composition === 'object')
  const comp = isEnvelope ? template.composition : template || {}

  // Shallow-clone the composition and each layer array/object so we never
  // mutate the caller's template.
  const next = { ...comp }
  for (const group of GROUPS) {
    if (Array.isArray(comp[group]))
      next[group] = comp[group].map((l) => ({ ...l }))
  }

  // 1) Overrides — shallow-merge by id across every layer kind.
  if (overrides) {
    for (const group of GROUPS) {
      if (!Array.isArray(next[group])) continue
      next[group] = next[group].map((l) =>
        overrides[l.id] ? { ...l, ...overrides[l.id] } : l
      )
    }
  }

  // 2) Content binding — expand the ordered content stream into layers.
  const items = Array.isArray(content) ? content : []
  if (items.length) {
    const cfg = comp.content || {}
    const zStart = cfg.zStart ?? 100
    const zStep = cfg.zStep ?? 100
    const kindDefaults = cfg.defaults || {}

    items.forEach((item, i) => {
      if (!item || !item.kind) return
      const group = KIND_TO_GROUP[item.kind]
      if (!group) return
      const layer = {
        ...(kindDefaults[item.kind] || {}),
        ...item,
        // Deterministic id (index-based) so SSR and client hydration agree.
        id: item.id || `content-${item.kind}-${i}`,
        zIndex: item.zIndex ?? zStart + i * zStep
      }
      if (!Array.isArray(next[group])) next[group] = []
      next[group] = [...next[group], layer]
    })
  }

  return isEnvelope ? { ...template, composition: next } : next
}
