/* ============================================================================
   SKY - a flat colour field, day or night.
   ----------------------------------------------------------------------------
   One fullscreen triangle: three vertices, no depth test, drawn before
   everything. It lives in the scene rather than as a CSS layer beneath the
   canvas because it has to sit BEHIND the geometry, so islands occlude it.

   Flat, not gradient. A gradient sky reads as a stock "3D web scene" and it
   was the first thing that made this look generated rather than designed. A
   single confident colour, like a paper backdrop in a photo studio, lets the
   island silhouettes carry the frame.

   Two uniforms drive it. `uNight` crossfades day to night, animated over about
   a second so the change reads as dusk falling rather than a light switch.
   `uPresence` used to fade the sky up out of a dark title card; the site now
   opens straight onto daylight, so VOID_DAY is simply the sky colour and the
   fade has nothing left to do in the day. It is kept because night still
   benefits from resolving out of a darker ground.
   ========================================================================= */

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  ShaderMaterial,
  type Mesh,
} from 'three'
import { useExperience } from '../lib/experience'

/* Kept in sync with tokens.css by hand: the CSS needs them for the loader and
   the HTML chrome, the GPU needs them here. */
export const SKY_DAY = '#5C93C9'
export const SKY_NIGHT = '#0C1A33'
export const VOID_DAY = '#5C93C9'
export const VOID_NIGHT = '#05090F'

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uSkyDay;
  uniform vec3 uSkyNight;
  uniform vec3 uVoidDay;
  uniform vec3 uVoidNight;
  uniform float uPresence;
  uniform float uNight;

  void main() {
    vec3 sky = mix(uSkyDay, uSkyNight, uNight);
    vec3 voidC = mix(uVoidDay, uVoidNight, uNight);
    vec3 col = mix(voidC, sky, uPresence);

    gl_FragColor = vec4(col, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function fullscreenTriangle(): BufferGeometry {
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  // UVs run 0..2 so the visible quadrant maps exactly to the screen.
  g.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2))
  return g
}

export default function Sky() {
  const { frame } = useExperience()
  const meshRef = useRef<Mesh>(null)

  const { geometry, material } = useMemo(() => {
    const mat = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uSkyDay: { value: new Color(SKY_DAY) },
        uSkyNight: { value: new Color(SKY_NIGHT) },
        uVoidDay: { value: new Color(VOID_DAY) },
        uVoidNight: { value: new Color(VOID_NIGHT) },
        uPresence: { value: 0 },
        uNight: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
      // Tone-mapped and colour-managed like every other material, so the sky
      // and the lit geometry never drift apart in grade.
      toneMapped: true,
    })
    return { geometry: fullscreenTriangle(), material: mat }
  }, [])

  useFrame(() => {
    material.uniforms.uPresence.value = frame.current.skyPresence
    material.uniforms.uNight.value = frame.current.nightPresence
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-1000}
    />
  )
}
