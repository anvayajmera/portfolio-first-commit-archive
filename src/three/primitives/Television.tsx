/* ============================================================================
   TELEVISION - the screen standing on every island.
   ----------------------------------------------------------------------------
   Each island has a CRT showing its own channel. From the sky it is a small
   bright rectangle that tells you something is on; up close it is the thing
   you came to look at, and clicking the island brings its content up as a
   full screen version of what the set is showing.

   The screen is a shader rather than an emissive plane. A flat emissive
   rectangle reads as a coloured sticker; what says "a switched-on television"
   is the texture of the image: scanlines, a slow roll bar drifting up the
   tube, corner vignetting from the curved glass, and a faint flicker. All of
   that is a handful of instructions on one quad, far cheaper than a render
   target, and it never has to be kept in sync with the DOM panel that opens
   when you click.
   ========================================================================= */

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, Color, LinearFilter, ShaderMaterial } from 'three'
import { Facet } from './forms'

const CASE_DARK = '#2A2E3A'
const CASE_LIGHT = '#3D4353'
const TRIM = '#8C93A8'

const SCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * Draws the channel: the island's number and name, a station ident, and a
 * waveform. Rendered once into a canvas and uploaded as a texture, rather than
 * being a second WebGL render target: the set only ever shows one still frame
 * per island, and a render-to-texture pass for a static caption would be three
 * extra draw calls per island per frame for nothing.
 */
function makeChannelTexture(numeral: string, label: string, accent: string): CanvasTexture {
  const w = 512
  const h = 356
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#0A1420'
  ctx.fillRect(0, 0, w, h)

  // Colour bars down one edge, the way a test card carries them.
  const bars = ['#E8E2D4', '#E3C567', '#6FC9C2', '#5FA05C', '#C96F8E', '#C4543F', '#3A5FA8']
  bars.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.fillRect(0, (h / bars.length) * i, 26, h / bars.length + 1)
  })

  ctx.fillStyle = accent
  ctx.fillRect(52, 46, 96, 6)

  ctx.fillStyle = '#F2EEE4'
  ctx.font = 'bold 128px "Space Grotesk", system-ui, sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText(numeral, 48, 74)

  ctx.font = 'bold 40px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText(label.toUpperCase(), 48, 218)

  ctx.fillStyle = accent
  ctx.font = '22px "Space Grotesk", system-ui, sans-serif'
  ctx.fillText('ON AIR', 48, 274)

  // A waveform along the bottom: the one thing that says "signal" instantly.
  ctx.strokeStyle = accent
  ctx.lineWidth = 3
  ctx.beginPath()
  for (let x = 0; x <= w - 60; x += 4) {
    const p = x / 40
    const y = h - 44 + Math.sin(p) * 12 * Math.sin(p * 0.31) + Math.sin(p * 3.1) * 5
    if (x === 0) ctx.moveTo(x + 48, y)
    else ctx.lineTo(x + 48, y)
  }
  ctx.stroke()

  const texture = new CanvasTexture(canvas)
  /* flipY off, and the shader does the one flip that is actually needed.
     Leaving three's default flipY on AND flipping v in the shader cancelled
     out vertically while leaving the image mirrored, so every caption read
     backwards. One flip, in one place. */
  texture.flipY = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false
  return texture
}

const SCREEN_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uTint;
  uniform sampler2D uChannel;
  uniform float uTime;
  uniform float uNight;
  uniform float uActive;

  void main() {
    vec2 uv = vUv;

    // Horizontal bands of slightly different brightness, standing in for the
    // content of whatever is on. Not noise: bands read as an image, noise
    // reads as static, and static says "broken" rather than "playing".
    float bands = 0.5
      + 0.22 * sin(uv.y * 9.0 + uTime * 0.35)
      + 0.14 * sin(uv.y * 21.0 - uTime * 0.6)
      + 0.10 * sin(uv.x * 6.0 + uTime * 0.22);

    // The picture itself, with the bands showing through it as the uneven
    // brightness of a tube rather than replacing it.
    vec3 picture = texture2D(uChannel, vec2(uv.x, 1.0 - uv.y)).rgb;
    vec3 col = picture * (0.72 + bands * 0.5) + uTint * 0.12;

    // Scanlines. Fine enough to survive at sky-view distance without moireing
    // into a solid block.
    float scan = 0.86 + 0.14 * sin(uv.y * 210.0);
    col *= scan;

    // The roll bar: one soft bright line creeping up the tube, the single most
    // recognisable thing a CRT does.
    float roll = fract(uv.y - uTime * 0.08);
    col += uTint * smoothstep(0.97, 1.0, roll) * 0.5;

    // Curved glass: corners fall off, and the centre carries a little bloom.
    vec2 c = uv - 0.5;
    float vig = 1.0 - dot(c, c) * 1.15;
    col *= clamp(vig, 0.0, 1.0);

    // Mains flicker, and a lift at night so the set is clearly the brightest
    // thing on a dark island.
    float flicker = 0.97 + 0.03 * sin(uTime * 31.0);
    col *= flicker * (1.0 + uNight * 0.55) * (0.85 + uActive * 0.35);

    gl_FragColor = vec4(col, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export interface TelevisionProps {
  /** Shown on the screen: "01", "Flight Lab". */
  numeral: string
  label: string
  /** Local position on the island, before the island's own scale is applied. */
  position: [number, number, number]
  /** Y rotation so the screen faces where the camera will arrive. */
  rotationY: number
  /** Screen tint, the island's accent. */
  accent: string
  /** 0..1 night crossfade, read from the frame object by the caller. */
  nightRef: { current: number }
  /** Brightens when this island is the one being visited. */
  activeRef: { current: number }
  scale?: number
}

export default function Television({
  position,
  rotationY,
  accent,
  numeral,
  label,
  nightRef,
  activeRef,
  scale = 1,
}: TelevisionProps) {
  const channel = useMemo(
    () => makeChannelTexture(numeral, label, accent),
    [numeral, label, accent],
  )

  useEffect(() => () => channel.dispose(), [channel])

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: SCREEN_VERTEX,
        fragmentShader: SCREEN_FRAGMENT,
        uniforms: {
          uTint: { value: new Color(accent) },
          uChannel: { value: channel },
          uTime: { value: 0 },
          uNight: { value: 0 },
          uActive: { value: 0 },
        },
        toneMapped: true,
      }),
    [accent],
  )

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uNight.value = nightRef.current
    material.uniforms.uActive.value = activeRef.current
  })

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {/* Cabinet. Tapered toward the back, the way a real tube set is, so the
          silhouette from the side is not a plain box. */}
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.62, 1.24, 1.05]} />
        <Facet color={CASE_DARK} roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.62, -0.62]} castShadow>
        <boxGeometry args={[1.24, 0.92, 0.22]} />
        <Facet color={CASE_DARK} roughness={0.8} />
      </mesh>

      {/* Face plate, a shade lighter so the screen has a border to sit in. */}
      <mesh position={[0, 0.62, 0.53]} castShadow>
        <boxGeometry args={[1.66, 1.28, 0.06]} />
        <Facet color={CASE_LIGHT} roughness={0.6} />
      </mesh>

      {/* The picture. */}
      <mesh position={[0, 0.68, 0.575]} material={material}>
        <planeGeometry args={[1.24, 0.86]} />
      </mesh>

      {/* Controls, off to one side under the screen. */}
      <mesh position={[0.48, 0.11, 0.58]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 0.05, 7]} />
        <Facet color={TRIM} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0.66, 0.11, 0.58]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.05, 7]} />
        <Facet color={TRIM} metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[-0.3, 0.1, 0.58]} castShadow>
        <boxGeometry args={[0.62, 0.08, 0.04]} />
        <Facet color={TRIM} metalness={0.3} roughness={0.5} />
      </mesh>

      {/* Rabbit ears. Unequal lengths and angles, because a symmetrical pair
          reads as a decoration and a mismatched pair reads as an object
          somebody has actually pushed around to get a signal. */}
      <mesh position={[-0.16, 1.5, -0.1]} rotation={[0.12, 0, 0.42]} castShadow>
        <cylinderGeometry args={[0.022, 0.028, 1.15, 5]} />
        <Facet color={TRIM} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0.2, 1.42, -0.1]} rotation={[-0.1, 0, -0.56]} castShadow>
        <cylinderGeometry args={[0.02, 0.026, 0.92, 5]} />
        <Facet color={TRIM} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.26, -0.1]} castShadow>
        <sphereGeometry args={[0.08, 7, 5]} />
        <Facet color={CASE_LIGHT} roughness={0.55} />
      </mesh>

      {/* Legs. */}
      {[
        [-0.62, 0.5],
        [0.62, 0.5],
        [-0.62, -0.42],
        [0.62, -0.42],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.05, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.1, 5]} />
          <Facet color={TRIM} metalness={0.3} roughness={0.55} />
        </mesh>
      ))}
    </group>
  )
}

/** Where the screen sits, in the television's own local space. Used to aim the
    camera at the picture rather than at the cabinet. */
export const SCREEN_LOCAL_OFFSET: [number, number, number] = [0, 0.68, 0.58]
