# Anvay Ajmera — 3D Portfolio

A scroll-free, guided 3D experience: a film-style title card dissolves into an
extruded wordmark, the sky opens onto three floating islands, and each island
flies you in to its own content panel.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typeface -> tsc -> vite  ->  dist/
npm run preview    # serve the static build
npm run check      # composition + flight-path assertions (scripts/)
npm run typeface   # regenerate the extruded font subset
```

Deploy = upload `dist/`. No server, no runtime env vars.
The previous iteration of this project is archived in `old/`.

---

## The narrative, and where it lives in code

| Beat | What happens | Where |
|---|---|---|
| 1 · 0.0–2.5s | Title card fades and scales in over near-black | `ui/Overlay.tsx` + `ui/intro/useIntroSequence.ts` |
| 2 · 2.5–4.5s | 2D text dissolves into extruded 3D; sky rises behind | `three/Wordmark3D.tsx`, `three/Sky.tsx` |
| 3 · 4.5–6.5s | Wordmark travels to the top-right and stays there | `three/Wordmark3D.tsx` |
| 4 · 6.5–9.0s | Camera pulls back; clouds and islands arrive | `three/CameraController.tsx` |
| 5 | Sky view, pointer parallax, hover states | `three/islands/IslandBase.tsx` |
| 6–8 | Flight in, panel, flight back | `three/CameraController.tsx`, `ui/panels/` |

---

## The three decisions worth knowing about

**The dissolve is measured, not guessed.** The HTML title publishes its own
rect (`lib/titleMetrics.ts`) and the 3D wordmark sizes itself to project onto
exactly that rect, so the two are pixel-aligned at the swap at any viewport.
Critically, the extruded wordmark starts at **rotation zero** — dead face-on,
so its silhouette is identical to flat text and the crossfade has nothing to
give it away. It only turns *after* the crossfade, in Beat 3. That turn is the
reveal. Rotating during the fade smears two visibly different shapes together
and the trick collapses.

**Clouds are billboards, not a volumetric shader.** A noise raymarch looks
better and is the wrong call: its cost scales with screen coverage × samples
per fragment, clouds want to cover most of the frame, and it is the single
likeliest thing to break the 50fps phone budget — a cost paid every frame
whether or not anyone is looking up. ~35 alpha quads sharing one procedurally
generated texture give *real* parallax (they are genuinely at different depths,
so they separate correctly during every flight) for almost nothing.

**No post-processing.** §1 asks for a bloom/DOF cue at the dissolve. It is
implemented — as a CSS radial flash plus additive halo geometry on emissive
parts. An EffectComposer would mean a second render target, a full-screen blur
and ~40 kB gzipped carried permanently for one moment of the session. Same
perceptual beat, no per-frame cost, degrades cleanly on the low tier.

---

## Structure

```
scripts/make-typeface.mjs   woff2 -> ttf -> subset typeface JSON for <Text3D>
scripts/check-scene.ts      projects every island at every camera pose

src/
  lib/
    islands.ts              ← the manifest: positions, accents, flight paths.
                              MUST NOT import three (see note in the file).
    flightCurves.ts         the three-dependent half, split out for chunking
    camera.ts               fov/dolly framing + the sky-view fit solver
    experience.tsx          phase machine + the mutable per-frame state object
    quality.ts              tier definitions and device detection
    titleMetrics.ts         the 2D→3D handshake
  three/
    World.tsx               the lazy boundary — all of three lives behind this
    Stage.tsx               <Canvas> + renderer config
    Scene.tsx               composition + fog
    Sky.tsx                 dusk gradient, one fullscreen triangle
    Clouds.tsx              four parallax billboard layers
    Lighting.tsx            key + hemisphere fill + accent rim
    CameraController.tsx    poses, GSAP flights, path warping, parallax
    Wordmark3D.tsx          extruded HUD type
    GsapBridge.tsx          drives GSAP from R3F's loop
    PerformanceGovernor.tsx measures frame time, drops tiers
    primitives/forms.tsx    shared low-poly parts
    islands/                one component per island
  ui/
    Overlay.tsx             all chrome; the layer that holds every word
    Loader.tsx              branded loading state
    panels/                 three genuinely different interiors, one shell
  content/site.content.ts   ← every visible word. All placeholder.
```

### Things worth not re-learning

- **`lib/islands.ts` must not import three.** The panels and nav read it and
  ship in the shell chunk that paints before the 3D runtime. A single
  `import { Vector3 }` there dragged all of three.js into that chunk and undid
  the lazy boundary — shell went from 96 kB to 196 kB gzipped.
- **GSAP is ticked from R3F's loop**, with time *accumulated* from wherever
  GSAP's root already is. Passing `clock.elapsedTime` directly winds the root
  backwards (the clock starts at canvas mount, the root started at page load),
  which re-fires completed callbacks.
- **Flight state is derived during render, not assigned in an effect.** Effects
  run after the first frame of a new phase, which is long enough to show one
  frame of the wrong pose.
- **Flights start from where the camera actually is**, not from the authored
  start point. That is what makes island→island jumps via the nav dots work
  without a cut.
- **Segment counts are odd (5/7/9).** An 8- or 16-sided cylinder reads as "a
  cylinder with not enough sides"; a 7-sided one reads as a carved form.
- **The sky camera solves its own distance.** Three islands spanning 14×5 world
  units do not fit a 0.46-aspect phone at the authored distance; the solver
  preserves the authored look-at (that *is* the composition) and moves only the
  dolly. Desktop gets 1.09×, phone 2.85×.

---

## Verified vs. not

`npm run check` asserts, across desktop / laptop / phone viewports: all three
islands framed and separated in the sky view, none intruding on the wordmark's
corner, every settle pose framing its island off-centre on the correct side,
every flight path free of cusps and genuinely curved, all three flights
differing in ease and duration, and no two islands sharing an idle period.

The typeface generator is verified against the source font (outline bounding
box within 1% of opentype.js's own measurement, no NaN in the geometry).

**Not verified:** anything that needs a GPU. There was no browser in the build
environment, so how it actually *looks* — the dissolve landing, the dusk grade,
the cloud density, the flight pacing — has not been seen. Run `npm run dev`.

---

## Carried TODOs

- `public/resume.pdf` — the contact panel links to it; the file does not exist yet
- `public/og.png` (1200×630) and `public/apple-touch-icon.png` (180×180)
- Real domain in `index.html` canonical/OG and `SITE.url`
- Replace every `PLACEHOLDER` string in `src/content/site.content.ts`
- Bundle warns at 914 kB for the 3D chunk (245 kB gzipped). That is three +
  drei + the scene, behind the loader and after first paint. Further cuts mean
  dropping drei (`Text3D`/`Center` are the only uses) for hand-rolled
  equivalents.

---

## Visual checking

There is no substitute for looking at it, and a lot of this is art direction
that cannot be asserted in a test.

```bash
npm run dev
npm run shots      # headless Chromium with real WebGL -> /tmp/shots/*.png
```

`scripts/screenshot.mjs` takes a `SHOTS` list of steps, so a flow can be
captured end to end:

```bash
SHOTS='[{"wait":6500},{"click":"#nav-projects","after":3500,"name":"projects"}]' npm run shots
W=390 H=844 SHOTS='[{"wait":6500,"name":"mobile"}]' npm run shots
```

Things this caught that reasoning did not: the televisions were three times too
big, the island name labels floated in open sky, a cloud layer sat three units
in front of the lens, the birds were the size of hang gliders, the starfield
was rendering perfectly and permanently above the top of the frame, and the far
clouds were being erased by fog.

## Music

One track, looping, opt in. `public/audio/final-entry.mp3`, by GeoThology,
**CC BY-NC-ND 4.0**. That licence permits this use and requires visible credit,
which is why the artist and licence are in the button's title attribute. Do not
remove that. If the site ever becomes commercial, the track has to be replaced.
Swapping it is one entry in `src/lib/audio.ts` plus the file.
