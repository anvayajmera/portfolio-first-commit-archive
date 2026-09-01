/* ============================================================================
   LOW-POLY FORM LIBRARY
   ----------------------------------------------------------------------------
   Shared sculptural parts the three islands are assembled from. Everything is
   flat-shaded with low segment counts — the faceting IS the surface treatment,
   so there are no textures anywhere in this project.

   Segment counts are deliberately odd/prime-ish (7, 9, 5) rather than round.
   A 8- or 16-sided cylinder reads as "a cylinder with not enough sides"; a
   7- or 9-sided one reads as a carved, intentional form. That one choice does
   more for the "art-directed, not asset-pack" feeling than any amount of
   material tweaking.
   ========================================================================= */

export interface FormProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
  color: string
  /** Lower = fewer segments, for the low quality tier. */
  detail?: number
}

/** The one material used by every solid in the scene. */
export function Facet({
  color,
  roughness = 0.86,
  metalness = 0.02,
  emissive,
  emissiveIntensity = 0,
}: {
  color: string
  roughness?: number
  metalness?: number
  emissive?: string
  emissiveIntensity?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      flatShading
      roughness={roughness}
      metalness={metalness}
      {...(emissive ? { emissive, emissiveIntensity } : {})}
    />
  )
}

function seg(base: number, detail: number): number {
  return detail > 0 ? base : Math.max(4, base - 2)
}

/* --- terrain --------------------------------------------------------------- */

/** A single plateau tier. */
export function Tier({
  radiusTop,
  radiusBottom,
  height,
  y,
  sides,
  color,
  detail = 1,
  rotation = 0,
}: {
  radiusTop: number
  radiusBottom: number
  height: number
  y: number
  sides: number
  color: string
  detail?: number
  rotation?: number
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radiusTop, radiusBottom, height, seg(sides, detail)]} />
      <Facet color={color} />
    </mesh>
  )
}

/** The spike beneath a floating island. Reads as torn-off bedrock. */
export function Underside({
  radius,
  height,
  y,
  sides,
  color,
  detail = 1,
  rotation = 0,
}: {
  radius: number
  height: number
  y: number
  sides: number
  color: string
  detail?: number
  rotation?: number
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI, rotation, 0]} castShadow receiveShadow>
      <coneGeometry args={[radius, height, seg(sides, detail)]} />
      <Facet color={color} roughness={0.95} />
    </mesh>
  )
}

/* --- scatter --------------------------------------------------------------- */

export function Rock({ position, rotation, scale = 1, color, detail = 1 }: FormProps) {
  return (
    <mesh position={position} rotation={rotation} scale={[scale, scale * 0.72, scale * 0.9]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, detail > 0 ? 0 : 0]} />
      <Facet color={color} roughness={0.92} />
    </mesh>
  )
}

export function Tree({
  position,
  scale = 1,
  trunk,
  canopy,
  detail = 1,
}: {
  position: [number, number, number]
  scale?: number
  trunk: string
  canopy: string
  detail?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.055, 0.085, 0.6, seg(5, detail)]} />
        <Facet color={trunk} />
      </mesh>
      {/* Two stacked cones — one cone reads as a party hat, two reads as a tree. */}
      <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.4, 0.72, seg(7, detail)]} />
        <Facet color={canopy} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.18, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.28, 0.56, seg(7, detail)]} />
        <Facet color={canopy} roughness={0.9} />
      </mesh>
    </group>
  )
}

/* --- Portfolio: the standing marker ---------------------------------------- */

/* Four-sided throughout, so there is nothing for the low tier to simplify —
   hence no `detail` prop here. */
export function Obelisk({
  position,
  color,
  cap,
  height = 2.4,
}: {
  position: [number, number, number]
  color: string
  cap: string
  height?: number
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.24, height, 4]} />
        <Facet color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, height + 0.17, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <coneGeometry args={[0.19, 0.42, 4]} />
        <Facet color={cap} roughness={0.42} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.44, 0.14, 4]} />
        <Facet color={color} />
      </mesh>
    </group>
  )
}

/* --- Projects: the workshop structures -------------------------------------- */

/** Parabolic dish on a strut. Reads as instrumentation at silhouette distance. */
export function Dish({
  position,
  rotation,
  color,
  accent,
  scale = 1,
  detail = 1,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  accent: string
  scale?: number
  detail?: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.09, 0.84, seg(5, detail)]} />
        <Facet color={color} metalness={0.35} roughness={0.5} />
      </mesh>
      <group position={[0, 0.92, 0]} rotation={rotation ?? [-0.62, 0.5, 0]}>
        {/* An open hemisphere: thetaLength < PI/2 gives the shallow bowl. */}
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.62, seg(9, detail), seg(5, detail), 0, Math.PI * 2, 0, Math.PI * 0.42]} />
          <Facet color={accent} roughness={0.55} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.45, 4]} />
          <Facet color={color} metalness={0.4} roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

/** Lattice mast — three tapering stages. */
export function Mast({
  position,
  color,
  accent,
  detail = 1,
}: {
  position: [number, number, number]
  color: string
  accent: string
  detail?: number
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.26, 1.1, seg(5, detail)]} />
        <Facet color={color} metalness={0.3} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.42, 0]} rotation={[0, -0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.085, 0.15, 0.72, seg(5, detail)]} />
        <Facet color={color} metalness={0.3} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.94, 0]} castShadow>
        <octahedronGeometry args={[0.14, 0]} />
        <Facet color={accent} roughness={0.35} metalness={0.25} emissive={accent} emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

/** Small geometric craft — reads as "a built thing" without being literal. */
export function Craft({
  position,
  rotation,
  color,
  accent,
  scale = 1,
  detail = 1,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  color: string
  accent: string
  scale?: number
  detail?: number
}) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[0.24, 0.62, 2, seg(7, detail)]} />
        <Facet color={color} roughness={0.6} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0, 0.52]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.24, 0.34, seg(7, detail)]} />
        <Facet color={accent} roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.26, -0.1]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.05, 0.24]} />
        <Facet color={accent} roughness={0.6} />
      </mesh>
    </group>
  )
}

/* --- Contact: the beacon ---------------------------------------------------- */

export function Beacon({
  position,
  color,
  accent,
  detail = 1,
  glow = true,
}: {
  position: [number, number, number]
  color: string
  accent: string
  detail?: number
  glow?: boolean
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.17, 0.34, 1.5, seg(7, detail)]} />
        <Facet color={color} roughness={0.72} />
      </mesh>
      <mesh position={[0, 1.56, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.22, 0.16, seg(7, detail)]} />
        <Facet color={color} roughness={0.5} metalness={0.3} />
      </mesh>
      {/* The signal itself. Emissive rather than an actual light: a real light
          here would cost a shadow-casting source for a 20cm object. */}
      <mesh position={[0, 1.78, 0]} castShadow>
        <octahedronGeometry args={[0.23, 0]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={2.4}
          roughness={0.3}
          flatShading
        />
      </mesh>
      {glow && (
        /* A thin ring, not a translucent sphere. The soft halo blob that used
           to sit here read as a stock "glow" and gave the whole island away as
           generated; a hard-edged ring at a low poly count matches the faceted
           language of everything around it. */
        <mesh position={[0, 1.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.48, 7]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.55}
            depthWrite={false}
            side={2}
          />
        </mesh>
      )}
    </group>
  )
}
