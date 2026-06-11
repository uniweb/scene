# Vendored source

`src/` is a vendored copy of the **`scene-renderer`** reference implementation of
the Scene Composition Format.

- Pinned at upstream commit: `725d0f7`
- Vendored: 2026-06-11

**Local changes:** reformatted to this repo's lint style (prettier — no
semicolons, single quotes, 2-space indent, no trailing commas). No behavioral
changes.

**To update:** copy `Scene.jsx`, `layers.js`, `compose.js`, and `index.js` from
the upstream `scene-renderer/src/`, then run `prettier --write src/`.
