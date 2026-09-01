/* Composition assertions — run with `npm run check`.
   Projects every island into screen space at every camera pose the site can be
   in, so framing problems surface here instead of in a browser at 1am. */

import { PerspectiveCamera, Vector3 } from 'three'
import {
  ISLANDS, SKY_CAMERA, SKY_TARGET,
  FRAMING_SHIFT_LANDSCAPE, FRAMING_SHIFT_PORTRAIT,
  tvSettlePose,
  tvWorldPose,
} from '../src/lib/islands'
import { buildFlightCurves } from '../src/lib/flightCurves'

let fails = 0
const ok = (c: boolean, m: string) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++ }

const VIEWPORTS = [
  { name: 'desktop 1600x900', w: 1600, h: 900 },
  { name: 'laptop  1280x800', w: 1280, h: 800 },
  { name: 'phone    390x844', w: 390, h: 844 },
]

import { framingForAspect, applyDolly, isPortrait, solveFitMultiplier } from '../src/lib/camera'

/** Projection WITHOUT the close-up dolly — used for the sky view, which solves
    its own distance. */
function projectRaw(camPos: Vector3, camTarget: Vector3, point: Vector3, w: number, h: number) {
  const aspect = w / h
  const { fov } = framingForAspect(aspect)
  const cam = new PerspectiveCamera(fov, aspect, 0.1, 500)
  cam.position.copy(camPos)
  cam.lookAt(camTarget)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  return { ndc: point.clone().project(cam), dist: camPos.distanceTo(point), fov, aspect }
}

function project(camPos: Vector3, camTarget: Vector3, point: Vector3, w: number, h: number) {
  const aspect = w / h
  const { fov, dolly } = framingForAspect(aspect)
  const pos = camPos.clone()
  applyDolly(pos, camTarget, dolly)
  const cam = new PerspectiveCamera(fov, aspect, 0.1, 200)
  cam.position.copy(pos)
  cam.lookAt(camTarget)
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  const ndc = point.clone().project(cam)
  // Angular radius of the island, converted to NDC vertical units.
  const dist = pos.distanceTo(point)
  return { ndc, dist, fov, aspect }
}

console.log('\n— sky view: all three islands framed, spread, and clear of the wordmark —')
for (const vp of VIEWPORTS) {
  const aspect = vp.w / vp.h
  const { fov } = framingForAspect(aspect)
  const spheres = ISLANDS.map((i) => ({ center: new Vector3(...i.position), radius: i.radius }))
  // Mirrors useScenePoses: portrait aims higher and is allowed a tighter fit.
  const skyTarget = new Vector3(...SKY_TARGET)
  if (isPortrait(aspect)) skyTarget.y += 3.2
  const fit = solveFitMultiplier(
    new Vector3(...SKY_CAMERA), skyTarget, spheres, aspect, fov,
    isPortrait(aspect) ? 1.0 : 0.88,
  )
  const skyPos = skyTarget
    .clone()
    .addScaledVector(new Vector3(...SKY_CAMERA).sub(skyTarget), fit)
  console.log(`  ..   ${vp.name}  fov ${fov.toFixed(0)}deg  fit x${fit.toFixed(2)}`)
  const shots = ISLANDS.map((i) => ({
    i,
    ...projectRaw(skyPos, skyTarget, new Vector3(...i.position), vp.w, vp.h),
  }))
  for (const s of shots) {
    const r = (s.i.radius / s.dist) / Math.tan((s.fov / 2) * Math.PI / 180)
    const limit = isPortrait(s.aspect) ? 1.06 : 1.0
    const inFrameY = Math.abs(s.ndc.y) + r < limit
    const inFrameX = Math.abs(s.ndc.x) + r / s.aspect < limit
    ok(inFrameX && inFrameY,
      `${vp.name}  ${s.i.label.padEnd(9)} ndc(${s.ndc.x.toFixed(2)}, ${s.ndc.y.toFixed(2)}) r=${r.toFixed(2)}`)
    // Top-right belongs to the wordmark.
    ok(!(s.ndc.x > 0.34 && s.ndc.y > 0.42), `${vp.name}  ${s.i.label.padEnd(9)} clear of wordmark corner`)
  }
  for (let a = 0; a < shots.length; a++)
    for (let b = a + 1; b < shots.length; b++) {
      const d = Math.hypot(shots[a].ndc.x - shots[b].ndc.x, shots[a].ndc.y - shots[b].ndc.y)
      ok(d > 0.35, `${vp.name}  ${shots[a].i.label}/${shots[b].i.label} separated (${d.toFixed(2)} ndc)`)
    }
}

console.log('\n— parked poses: the picture is square on, framed, and off-centre —')
for (const vp of VIEWPORTS) {
  const portrait = isPortrait(vp.w / vp.h)
  const shift = portrait ? FRAMING_SHIFT_PORTRAIT : FRAMING_SHIFT_LANDSCAPE
  const fraction = portrait ? 0.2 : 0.24
  for (const island of ISLANDS) {
    const { fov } = framingForAspect(vp.w / vp.h)
    const settle = tvSettlePose(island, fov, fraction)
    const pose = tvWorldPose(island)
    const target = new Vector3(...settle.target).add(new Vector3(...shift))
    const camPos = new Vector3(...settle.position)
    const s = projectRaw(camPos, target, new Vector3(...settle.target), vp.w, vp.h)

    // The picture should occupy the fraction of frame height it asked for.
    const halfFov = (s.fov / 2) * Math.PI / 180
    const covered = pose.screenHeight / (2 * Math.tan(halfFov) * s.dist)
    ok(Math.abs(covered - fraction) < 0.05,
      `${vp.name}  ${island.label.padEnd(10)} picture fills ${(covered * 100).toFixed(0)}% of frame height (asked ${(fraction * 100).toFixed(0)}%)`)

    // Square on: the camera must be within a few degrees of the screen normal,
    // or the panel growing out of the picture will not line up.
    const toCam = camPos.clone().sub(new Vector3(...settle.target)).normalize()
    const normal = new Vector3(...pose.forward)
    const offAxis = Math.acos(Math.min(1, Math.max(-1, toCam.dot(normal)))) * 180 / Math.PI
    ok(offAxis < 12, `${vp.name}  ${island.label.padEnd(10)} ${offAxis.toFixed(1)}deg off the screen normal`)

    ok(Math.abs(s.ndc.x) < 0.9 && Math.abs(s.ndc.y) < 0.9,
      `${vp.name}  ${island.label.padEnd(10)} picture in frame  ndc(${s.ndc.x.toFixed(2)}, ${s.ndc.y.toFixed(2)})`)
    if (portrait) ok(s.ndc.y > -0.1, `${vp.name}  ${island.label.padEnd(10)} sits high (sheet below)`)
    else ok(s.ndc.x < -0.02, `${vp.name}  ${island.label.padEnd(10)} sits left (panel right)`)
  }
}

console.log('\n— flights: smooth arcs, sane length, all three genuinely different —')
for (const island of ISLANDS) {
  for (const [name, path] of [['inbound', island.inbound], ['outbound', island.outbound]] as const) {
    const { position, look } = buildFlightCurves(path)
    const pts = position.getPoints(200)
    let maxTurn = 0
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i].clone().sub(pts[i - 1]).normalize()
      const b = pts[i + 1].clone().sub(pts[i]).normalize()
      maxTurn = Math.max(maxTurn, Math.acos(Math.min(1, Math.max(-1, a.dot(b)))) * 180 / Math.PI)
    }
    ok(maxTurn < 12, `${island.label.padEnd(9)} ${name.padEnd(8)} no cusp (max turn ${maxTurn.toFixed(1)}° per 0.5%)`)
    const straight = pts[0].distanceTo(pts[pts.length - 1])
    const arc = position.getLength()
    ok(arc / straight > 1.03, `${island.label.padEnd(9)} ${name.padEnd(8)} curves, not a straight line (arc ${(arc/straight).toFixed(2)}x direct)`)
    ok(look.getPoints(4).length === 5, `${island.label.padEnd(9)} ${name.padEnd(8)} look curve valid`)
  }
  ok(path_ok(island.inbound.duration), `${island.label.padEnd(9)} inbound ${island.inbound.duration}s within 1.2-2.0s`)
}
function path_ok(d: number) { return d >= 1.2 && d <= 2.0 }

const eases = new Set(ISLANDS.map((i) => i.inbound.ease))
const durations = new Set(ISLANDS.map((i) => i.inbound.duration))
ok(eases.size > 1, `inbound eases differ (${[...eases].join(', ')})`)
ok(durations.size === 3, `inbound durations all differ (${[...durations].join('s, ')}s)`)

console.log('\n— idle motion: no two islands ever re-sync —')
for (let a = 0; a < ISLANDS.length; a++)
  for (let b = a + 1; b < ISLANDS.length; b++) {
    const pa = ISLANDS[a].idle, pb = ISLANDS[b].idle
    ok(pa.period !== pb.period && pa.phase !== pb.phase,
      `${ISLANDS[a].label}/${ISLANDS[b].label} periods ${pa.period}s vs ${pb.period}s, phases differ`)
  }

console.log(fails === 0 ? '\nALL CHECKS PASSED\n' : `\n${fails} CHECK(S) FAILED\n`)
process.exit(fails === 0 ? 0 : 1)
