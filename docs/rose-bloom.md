# Historical procedural rose bloom

> Retired from the recipient experience on 20 October 2026 at the owner’s request. Current rendering uses licensed photography; see [photographic presentation](motion/photographic-flowers.md). This document describes retained historical source, not the current UI.

The animated artwork uses one React Three Fiber canvas and two independent `RoseRig` instances. There is no external 3D model. Each rose has layered curved petal meshes: 35 on the primary and 29 on the secondary. The existing `rose-bud.webp` and `rose-bloom.webp` files are original project artwork and appear only in the static or WebGL-failure path.

## Coordinates and motion

- The flower head is at each rig's local origin. The stem extends toward negative Y.
- Each petal surface starts at local `(0,0,0)` and extends toward positive Y. Its angular parent group rotates about the flower's Y axis. Its opening pivot rotates about the attached root. The surface itself morphs through closed, intermediate, and open meshes with identical vertex order.
- `petalPose(master, layer, index, seed, secondary)` is pure. The 0–1 master progress comes from `BloomTimeline`, which uses elapsed milliseconds, supports play/pause/replay/skip, and completes once per run. The secondary flower starts approximately 0.6 seconds later.
- The scene uses `frameloop="demand"` and requests frames only during playback or a control change. A hidden tab stops advancing; returning resets the elapsed-time baseline.
- The decorative canvas never holds the name or greeting. Those remain ordinary HTML. Reduced motion and WebGL failure use the complete static artwork and finish the greeting immediately.

Colors, duration, seed, subdivision quality, and pixel-ratio limits are in `lib/bloom.config.ts`. Development-only motion inspection is available at `/?bloomDebug=1`; it provides a pose slider, controls, quality, wireframe, and flower visibility. The panel is absent from production builds.

## Verification and visual limits

`artifacts/bloom/` contains the five progress poses at 1440, 1024, 768, 390, and 320px, complete greeting screenshots, and a mobile WebM capture. Chrome software WebGL reported 84 draw calls and 10,008 triangles in balanced mode at the final pose. This is a browser measurement, not a claim about phone frame rate.

The roses are intentionally stylized procedural forms. They reproduce the reference's two-flower hierarchy and botanical palette but are not a photographic reconstruction. No third-party flower model or texture was used.
