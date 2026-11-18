import {
  DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Object3D,
  PlaneGeometry, ShaderMaterial, type Scene,
} from 'three'

export interface ContactShadowSource {
  x: number
  y: number
  z: number
  radiusX: number
  radiusZ: number
  heading?: number
  groundY?: number
  opacity?: number
}

export function createContactShadows(scene: Scene, maxShadows = 10) {
  const geometry = new PlaneGeometry(2, 2)
  geometry.rotateX(-Math.PI / 2)
  const values = new InstancedBufferAttribute(new Float32Array(maxShadows), 1).setUsage(DynamicDrawUsage)
  geometry.setAttribute('aStrength', values)
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: `
      attribute float aStrength;
      varying vec2 vLocal;
      varying float vStrength;
      void main() {
        vLocal = uv * 2.0 - 1.0;
        vStrength = aStrength;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec2 vLocal;
      varying float vStrength;
      void main() {
        float r = dot(vLocal, vLocal);
        float falloff = 1.0 - smoothstep(0.0, 1.0, r);
        gl_FragColor = vec4(0.02, 0.027, 0.04, falloff * falloff * vStrength);
      }`,
  })
  const mesh = new InstancedMesh(geometry, material, maxShadows)
  mesh.name = 'Sombras de proximidad'
  mesh.instanceMatrix.setUsage(DynamicDrawUsage)
  mesh.count = 0
  mesh.frustumCulled = false
  scene.add(mesh)
  const transform = new Object3D()

  return {
    update(sources: readonly ContactShadowSource[], hour: number) {
      let count = 0
      const daylight = Math.max(0, Math.sin((hour - 6) * Math.PI / 12))
      for (const source of sources) {
        if (count >= maxShadows) break
        const ground = source.groundY ?? 0
        const gap = Math.max(0, source.y - ground)
        const strength = (source.opacity ?? 0.37) * (0.6 + 0.4 * daylight) * Math.max(0, 1 - gap / 1.1)
        if (strength < 0.015) continue
        transform.position.set(source.x, ground + 0.025, source.z)
        transform.rotation.y = -(source.heading ?? 0)
        transform.scale.set(source.radiusX + gap * 0.35, 1, source.radiusZ + gap * 0.35)
        transform.updateMatrix()
        mesh.setMatrixAt(count, transform.matrix)
        values.setX(count, strength)
        count++
      }
      mesh.count = count
      mesh.instanceMatrix.needsUpdate = true
      values.needsUpdate = true
    },
    dispose() {
      scene.remove(mesh)
      mesh.dispose()
      geometry.dispose()
      material.dispose()
    },
  }
}
