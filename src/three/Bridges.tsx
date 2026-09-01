/* ============================================================================
   BRIDGES - three wooden crossings, no two alike.
   ----------------------------------------------------------------------------
   Three floating islands with nothing between them read as three separate
   scenes sharing a sky. A walkway turns them into one place somebody lives in.

   Each crossing is different carpentry:

     rope     slung, deep sag, narrow planks, rope handrails that sag with it
     truss    stiff, almost flat, boards butted tight, solid timber handrails
     stepped  separate platforms with real gaps, posts below, no rails

   TWO THINGS THIS GETS RIGHT THAT THE FIRST VERSION DID NOT.

   1. Plank spacing is measured along the ARC, not the straight line between
      islands. A span with two units of sag is nearly half as long again as the
      gap it crosses, so counting planks against the straight distance spread
      them out into ladder rungs with daylight between them.

   2. Orientation comes from an explicit basis (forward, right, up) rather than
      from setFromUnitVectors, which only pins the forward axis and leaves the
      roll about it arbitrary. That is what had consecutive planks twisted at
      random angles down the span.

   Planks follow their islands: each island bobs on its own period, so the
   endpoints move. The bob is recomputed here from the same formula and clock
   rather than read off the island groups, which avoids a frame-order
   dependency where the bridge lags a frame behind the land it is attached to.
   ========================================================================= */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  Color,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Object3D,
  Vector3,
} from 'three'
import { ISLANDS, type IslandDef } from '../lib/islands'
import { useExperience } from '../lib/experience'
import type { QualitySettings } from '../lib/quality'

type Style = 'rope' | 'truss' | 'stepped'

interface Span {
  from: IslandDef
  to: IslandDef
  style: Style
  /** Dip at midspan, in world units. */
  sag: number
  /** Centre-to-centre plank spacing measured ALONG THE DECK. */
  spacing: number
  width: number
  /** How far past the grass edge the first plank sits, so it overlaps. */
  inset: number
  /** Handrail height above the deck. 0 means no rails. */
  railHeight: number
}

const TIMBER = '#8A6A46'
const TIMBER_DARK = '#6B5136'
const ROPE = '#BCA179'

export default function Bridges({ quality }: { quality: QualitySettings }) {
  const spans = useMemo<Span[]>(() => {
    const [about, projects, journal] = ISLANDS
    return [
      { from: about, to: journal, style: 'rope', sag: 1.9, spacing: 0.4, width: 1.2, inset: 0.35, railHeight: 0.85 },
      { from: journal, to: projects, style: 'truss', sag: 0.3, spacing: 0.36, width: 1.45, inset: 0.35, railHeight: 0.7 },
      { from: about, to: projects, style: 'stepped', sag: 1.2, spacing: 1.15, width: 1.5, inset: 0.25, railHeight: 0 },
    ]
  }, [])

  return (
    <group>
      {spans.map((span, i) => (
        <Crossing key={i} span={span} quality={quality} />
      ))}
    </group>
  )
}

/** Live vertical offset of an island, matching IslandBase's idle formula. */
function islandBob(island: IslandDef, t: number, presence: number): number {
  const { amplitude, period, phase } = island.idle
  return Math.sin((t / period) * Math.PI * 2 + phase) * amplitude * presence
}

/** Where an island's walkway meets the air, and how high that surface is. */
function anchor(island: IslandDef): { radius: number; height: number } {
  return { radius: island.deck.radius * island.scale, height: island.deck.y * island.scale }
}

function Crossing({ span, quality }: { span: Span; quality: QualitySettings }) {
  const { frame } = useExperience()
  const deckRef = useRef<InstancedMesh>(null)
  const railRef = useRef<InstancedMesh>(null)
  const postRef = useRef<InstancedMesh>(null)

  const hasRails = span.railHeight > 0

  /* Plank count, resolved once from the ARC length. The islands bob, but only
     by a fraction of a unit, so the deck length is effectively fixed. */
  const { planks, postEvery } = useMemo(() => {
    const a = new Vector3(...span.from.position)
    const b = new Vector3(...span.to.position)
    const straight = a.distanceTo(b) - anchor(span.from).radius - anchor(span.to).radius + span.inset * 2

    /* Arc length of a parabola of sag s across a span L, to the usual
       small-sag approximation. At the sags used here that is within a couple
       of percent of the real integral and costs nothing. */
    const r = span.sag / Math.max(0.001, straight)
    const arc = straight * (1 + (8 / 3) * r * r)

    const spacing = span.spacing * (quality.tier === 'low' ? 1.7 : 1)
    const count = Math.max(5, Math.min(64, Math.round(arc / spacing)))
    return { planks: count, postEvery: Math.max(2, Math.round(1.6 / spacing)) }
  }, [span, quality.tier])

  const posts = hasRails ? Math.ceil(planks / postEvery) * 2 : planks

  const deckGeometry = useMemo(
    () =>
      new BoxGeometry(
        span.width,
        span.style === 'stepped' ? 0.15 : 0.1,
        // 0.82 of the spacing: enough gap between boards to read as planks,
        // not so much that the deck looks like a ladder.
        span.spacing * (span.style === 'stepped' ? 0.62 : 0.82),
      ),
    [span.width, span.style, span.spacing],
  )
  // Unit-length along Z so a scale sets the run.
  const railGeometry = useMemo(() => new BoxGeometry(0.075, 0.075, 1), [])
  const postGeometry = useMemo(() => new BoxGeometry(0.075, 1, 0.075), [])

  const deckMaterial = useMemo(
    () => new MeshStandardMaterial({ color: new Color(TIMBER), flatShading: true, roughness: 0.9 }),
    [],
  )
  const trimMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(span.style === 'rope' ? ROPE : TIMBER_DARK),
        flatShading: true,
        roughness: 0.88,
      }),
    [span.style],
  )

  const s = useMemo(
    () => ({
      dummy: new Object3D(),
      a: new Vector3(),
      b: new Vector3(),
      p: new Vector3(),
      next: new Vector3(),
      dir: new Vector3(),
      right: new Vector3(),
      up: new Vector3(),
      worldUp: new Vector3(0, 1, 0),
      basis: new Matrix4(),
    }),
    [],
  )

  useFrame((state) => {
    const deck = deckRef.current
    const rail = railRef.current
    const post = postRef.current
    if (!deck || !post) return

    const presence = frame.current.islandPresence
    const visible = presence > 0.02
    deck.visible = visible
    post.visible = visible
    if (rail) rail.visible = visible && hasRails
    if (!visible) return

    const t = state.clock.elapsedTime
    const { dummy, a, b, p, next, dir, right, up, worldUp, basis } = s

    // Endpoints on the grass, at deck height, moving with each island's bob.
    a.set(...span.from.position)
    b.set(...span.to.position)
    dir.subVectors(b, a).normalize()
    const ea = anchor(span.from)
    const eb = anchor(span.to)
    a.addScaledVector(dir, ea.radius - span.inset)
    b.addScaledVector(dir, -(eb.radius - span.inset))
    a.y += ea.height + 0.07 + islandBob(span.from, t, presence)
    b.y += eb.height + 0.07 + islandBob(span.to, t, presence)

    /** Deck point at u, including the sag. */
    const at = (u: number, out: Vector3) => {
      out.lerpVectors(a, b, u)
      out.y -= Math.sin(Math.PI * u) * span.sag
      return out
    }

    /** Fills `basis` and `right` for the deck frame at u. */
    const frameAt = (u: number) => {
      at(u, p)
      at(Math.min(1, u + 0.01), next)
      dir.subVectors(next, p).normalize()
      right.crossVectors(dir, worldUp).normalize()
      up.crossVectors(right, dir).normalize()
      basis.makeBasis(right, up, dir)
    }

    for (let i = 0; i < planks; i++) {
      const u = (i + 0.5) / planks
      frameAt(u)
      dummy.position.copy(p)
      dummy.quaternion.setFromRotationMatrix(basis)
      // A degree or two of unevenness: real boards are not laid perfectly.
      dummy.rotateY(Math.sin(i * 12.9898) * 0.045)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      deck.setMatrixAt(i, dummy.matrix)
    }
    deck.instanceMatrix.needsUpdate = true

    if (hasRails && rail) {
      // One continuous run per segment per side, joined end to end.
      const half = span.width * 0.5 - 0.06
      for (let i = 0; i < planks; i++) {
        const u = i / planks
        frameAt(u)
        at(u, p)
        at((i + 1) / planks, next)
        const run = p.distanceTo(next)
        for (let side = 0; side < 2; side++) {
          dummy.position.copy(p).addScaledVector(right, side === 0 ? half : -half)
          dummy.position.y += span.railHeight
          dummy.quaternion.setFromRotationMatrix(basis)
          dummy.scale.set(1, 1, run * 1.06)
          dummy.updateMatrix()
          rail.setMatrixAt(i * 2 + side, dummy.matrix)
        }
      }
      rail.instanceMatrix.needsUpdate = true

      // Uprights tying the rail to the deck, every few planks.
      let n = 0
      for (let i = 0; i < planks; i += postEvery) {
        const u = (i + 0.5) / planks
        frameAt(u)
        for (let side = 0; side < 2; side++) {
          dummy.position.copy(p).addScaledVector(right, side === 0 ? half : -half)
          dummy.position.y += span.railHeight / 2
          dummy.quaternion.setFromRotationMatrix(basis)
          dummy.scale.set(1, span.railHeight, 1)
          dummy.updateMatrix()
          post.setMatrixAt(n++, dummy.matrix)
        }
      }
      for (; n < posts; n++) {
        // Park unused instances inside the deck so they never show.
        dummy.scale.set(0.0001, 0.0001, 0.0001)
        dummy.updateMatrix()
        post.setMatrixAt(n, dummy.matrix)
      }
    } else {
      // Stepped crossing: a leg dropping from each platform instead of rails.
      for (let i = 0; i < planks; i++) {
        const u = (i + 0.5) / planks
        at(u, p)
        dummy.position.set(p.x, p.y - 0.42, p.z)
        dummy.quaternion.identity()
        dummy.scale.set(1, 0.8, 1)
        dummy.updateMatrix()
        post.setMatrixAt(i, dummy.matrix)
      }
    }
    post.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh
        ref={deckRef}
        args={[deckGeometry, deckMaterial, planks]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={railRef}
        args={[railGeometry, trimMaterial, Math.max(1, planks * 2)]}
        castShadow
        frustumCulled={false}
      />
      <instancedMesh
        ref={postRef}
        args={[postGeometry, trimMaterial, Math.max(1, posts)]}
        castShadow
        frustumCulled={false}
      />
    </group>
  )
}
