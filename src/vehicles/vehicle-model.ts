import {
  BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial,
  type ColorRepresentation,
} from 'three'

interface VehicleStyle {
  detail?: boolean
  police?: boolean
}

export const vehicleDimensions = {
  halfWidth: 0.94,
  halfLength: 1.96,
  hullHeight: 1.04,
} as const

// A series of transverse rectangles forms the beveled hood, roof, and tail.
function hullGeometry(sections: readonly (readonly [number, number, number, number])[]) {
  const vertices: number[] = []
  const indices: number[] = []
  for (const [z, halfWidth, bottom, top] of sections) {
    vertices.push(-halfWidth, bottom, z, halfWidth, bottom, z, halfWidth, top, z, -halfWidth, top, z)
  }
  indices.push(0, 2, 1, 0, 3, 2)
  const last = (sections.length - 1) * 4
  indices.push(last, last + 1, last + 2, last, last + 2, last + 3)
  for (let index = 0; index < last; index += 4) {
    for (let corner = 0; corner < 4; corner++) {
      const from = index + corner
      const to = index + (corner + 1) % 4
      indices.push(from, to, to + 4, from, to + 4, from + 4)
    }
  }
  const indexed = new BufferGeometry().setAttribute('position', new Float32BufferAttribute(vertices, 3)).setIndex(indices)
  const geometry = indexed.toNonIndexed()
  indexed.dispose()
  geometry.computeVertexNormals()
  return geometry
}

export function createVehicleModel(
  paint: ColorRepresentation = 0xcf5039,
  { detail = true, police = false }: VehicleStyle = {},
) {
  const mesh = new Group()
  mesh.name = police ? 'Patrulla' : 'Rayo GT'
  const box = new BoxGeometry()
  const tires = new CylinderGeometry(0.34, 0.34, 0.24, detail ? 16 : 8)
  const rims = new CylinderGeometry(0.2, 0.2, 0.246, detail ? 12 : 8)
  const lower = hullGeometry([
    [-1.96, 0.79, 0.26, 0.58],
    [-1.66, 0.91, 0.26, 0.69],
    [1.62, 0.91, 0.26, 0.72],
    [1.96, 0.81, 0.26, 0.62],
  ])
  const glass = hullGeometry([
    [-0.85, 0.75, 0.67, 0.74],
    [-0.39, 0.65, 0.67, 1.18],
    [0.66, 0.64, 0.67, 1.18],
    [1.14, 0.74, 0.69, 0.76],
  ])
  const materials: MeshStandardMaterial[] = []
  function material(color: ColorRepresentation, roughness: number, metalness = 0, emissive?: ColorRepresentation) {
    const item = new MeshStandardMaterial({ color, roughness, metalness })
    if (emissive !== undefined) {
      item.emissive.set(emissive)
      item.emissiveIntensity = 0
    }
    materials.push(item)
    return item
  }

  const body = material(paint, 0.34, 0.42)
  const windows = material(0x233f50, 0.24, 0.34)
  const trim = material(0x24252e, 0.63, 0.15)
  const rubber = material(0x17171b, 0.87)
  const metal = material(0xb9b9ba, 0.4, 0.65)
  const headlight = material(0xfbdfa6, 0.31, 0.03, 0xffb64b)
  const taillight = material(0xdd2629, 0.35, 0, 0xff2424)
  const policeRed = police ? material(0xb4273a, 0.23, 0, 0xff2240) : undefined
  const policeBlue = police ? material(0x2364af, 0.23, 0, 0x207aff) : undefined

  function part(parent: Group, geometry: BufferGeometry, surface: MeshStandardMaterial, castsShadow = false) {
    const item = new Mesh(geometry, surface)
    item.castShadow = castsShadow
    item.receiveShadow = castsShadow
    parent.add(item)
    return item
  }

  function block(
    parent: Group, surface: MeshStandardMaterial,
    x: number, y: number, z: number, width: number, height: number, depth: number,
  ) {
    const item = part(parent, box, surface)
    item.position.set(x, y, z)
    item.scale.set(width, height, depth)
    return item
  }

  part(mesh, lower, body, true)
  part(mesh, glass, windows, true)
  block(mesh, body, 0, 1.177, 0.13, 1.29, 0.04, 1.05).castShadow = detail
  block(mesh, trim, 0, 0.32, -1.96, 1.56, 0.12, 0.11)
  block(mesh, trim, 0, 0.36, 1.96, 1.59, 0.14, 0.13)
  block(mesh, trim, 0, 0.48, -1.974, 0.77, 0.11, 0.04)
  block(mesh, metal, 0, 0.48, 1.976, 0.31, 0.105, 0.03)

  const wheels: { steering: Group; wheel: Group; front: boolean }[] = []
  for (const side of [-1, 1]) {
    block(mesh, headlight, side * 0.608, 0.501, -1.971, 0.26, 0.10, 0.06)
    block(mesh, taillight, side * 0.622, 0.541, 1.968, 0.25, 0.095, 0.045)
    if (detail) {
      block(mesh, trim, side * 0.895, 0.309, 0, 0.06, 0.085, 1.51)
      block(mesh, trim, side * 0.746, 0.778, -0.54, 0.084, 0.045, 0.09)
      block(mesh, body, side * 0.844, 0.808, -0.54, 0.142, 0.067, 0.148)
      block(mesh, trim, side * 0.913, 0.603, 0.37, 0.013, 0.04, 0.19)
      block(mesh, trim, side * 0.694, 0.958, 0.4, 0.032, 0.38, 0.085)
      for (let slot = 0; slot < 3; slot++) {
        block(mesh, trim, side * 0.898, 0.46 + slot * 0.034, 0.83, 0.034, 0.014, 0.32)
      }
    }

    for (const axle of [-1, 1]) {
      const steering = new Group()
      steering.position.set(side * 0.80, 0.342, axle * 1.22)
      mesh.add(steering)
      const wheel = new Group()
      steering.add(wheel)
      part(wheel, tires, rubber, detail).rotation.z = Math.PI / 2
      part(wheel, rims, metal).rotation.z = Math.PI / 2
      if (detail) {
        block(wheel, trim, side * 0.126, 0, 0, 0.014, 0.23, 0.055)
        block(wheel, trim, side * 0.126, 0, 0, 0.014, 0.055, 0.23)
      }
      wheels.push({ steering, wheel, front: axle === -1 })
    }
  }

  if (policeRed && policeBlue) {
    const stripe = material(0xdfded1, 0.55)
    for (const side of [-1, 1]) block(mesh, stripe, side * 0.913, 0.53, 0, 0.022, 0.13, 1.48)
    block(mesh, trim, 0, 1.218, 0.15, 0.91, 0.075, 0.26)
    block(mesh, policeRed, -0.227, 1.274, 0.15, 0.42, 0.082, 0.203)
    block(mesh, policeBlue, 0.227, 1.274, 0.15, 0.42, 0.082, 0.203)
  }

  let lights = false
  let braking = false
  let roll = 0

  function updateLights() {
    headlight.emissiveIntensity = lights ? 2.9 : 0.03
    taillight.emissiveIntensity = braking ? 2.6 : lights ? 0.42 : 0.06
  }

  return {
    mesh,
    update(dt: number, signedSpeed: number, steer: number, brake: boolean) {
      roll = (roll - signedSpeed * dt / 0.34) % (Math.PI * 2)
      for (const { steering, wheel, front } of wheels) {
        if (front) steering.rotation.y = -steer
        wheel.rotation.x = roll
      }
      if (braking !== brake) { braking = brake; updateLights() }
    },
    setLights(enabled: boolean) {
      if (lights === enabled) return
      lights = enabled
      updateLights()
    },
    setSiren(elapsed: number, enabled: boolean) {
      if (!policeRed || !policeBlue) return
      const phase = Math.floor(elapsed * 8) % 4
      policeRed.emissiveIntensity = enabled && phase < 2 ? 5 : 0.04
      policeBlue.emissiveIntensity = enabled && phase >= 2 ? 5 : 0.04
    },
    dispose() {
      mesh.removeFromParent()
      for (const geometry of [box, tires, rims, lower, glass]) geometry.dispose()
      for (const surface of materials) surface.dispose()
    },
  }
}
