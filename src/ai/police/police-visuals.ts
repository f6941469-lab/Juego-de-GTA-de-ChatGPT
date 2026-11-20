import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  InstancedMesh,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  type Scene,
} from 'three'

export interface PoliceVisualUnit {
  x: number
  z: number
  previousX: number
  previousZ: number
  heading: number
  previousHeading: number
  speed: number
  braking: boolean
  dismounted: boolean
  officer: {
    x: number
    z: number
    previousX: number
    previousZ: number
    heading: number
    speed: number
    active: boolean
  }
}

const bodyColor = new Color('#24345a')
const stripeColor = new Color('#e3e6ee')
const windowColor = new Color('#213b4d')
const trimColor = new Color('#1d2028')
const wheelColor = new Color('#16181f')
const officerUniformColor = new Color('#1c2d4f')
const officerSkinColor = new Color('#c28562')
const officerBadgeColor = new Color('#d9b648')
const headDim = new Color('#f5dfc0').multiplyScalar(0.45)
const headLit = new Color('#fff1d6')
const tailDim = new Color('#6d212f')
const tailLit = new Color('#ff3252')
const sirenRedDim = new Color('#5c1623')
const sirenRedLit = new Color('#ff2747')
const sirenBlueDim = new Color('#153563')
const sirenBlueLit = new Color('#2b8aff')

export function createPoliceVisuals(scene: Scene, capacity = 8) {
  const cube = new BoxGeometry(1, 1, 1)
  const wheelGeo = new CylinderGeometry(0.33, 0.33, 0.24, 10)
  wheelGeo.rotateZ(Math.PI / 2)

  const standard = new MeshStandardMaterial({ roughness: 0.56, metalness: 0.18 })
  const glow = new MeshBasicMaterial({ toneMapped: false })

  // Up to 7 boxes per cruiser (chassis, cabin, roof, front/rear bumpers, 2 side stripes)
  const shells = new InstancedMesh(cube, standard, capacity * 7)
  // 4 wheels per cruiser
  const wheels = new InstancedMesh(wheelGeo, standard, capacity * 4)
  // 6 lights per cruiser (2 headlights, 2 taillights, red/blue siren bar)
  const lights = new InstancedMesh(cube, glow, capacity * 6)
  // Up to 5 boxes per foot officer (2 legs, torso, badge/vest, head+cap -> 6 parts max)
  const officers = new InstancedMesh(cube, standard, capacity * 6)

  shells.castShadow = true
  shells.receiveShadow = true
  officers.castShadow = true
  officers.receiveShadow = true

  for (const mesh of [shells, wheels, lights, officers]) {
    mesh.frustumCulled = false
    mesh.count = 0
    scene.add(mesh)
  }

  const pose = new Object3D()

  function setBox(
    mesh: InstancedMesh,
    slot: number,
    ox: number,
    oz: number,
    angle: number,
    dx: number,
    y: number,
    dz: number,
    w: number,
    h: number,
    d: number,
    color: Color,
  ) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    pose.position.set(ox + c * dx - s * dz, y, oz + s * dx + c * dz)
    pose.rotation.set(0, -angle, 0)
    pose.scale.set(w, h, d)
    pose.updateMatrix()
    mesh.setMatrixAt(slot, pose.matrix)
    mesh.setColorAt(slot, color)
  }

  function render(
    units: readonly PoliceVisualUnit[],
    alpha: number,
    elapsed: number,
    night: boolean,
    sirenActive: boolean,
  ) {
    let shellCount = 0
    let wheelCount = 0
    let lightCount = 0
    let officerCount = 0

    const count = Math.min(units.length, capacity)
    for (let i = 0; i < count; i++) {
      const unit = units[i]
      const x = MathUtils.lerp(unit.previousX, unit.x, alpha)
      const z = MathUtils.lerp(unit.previousZ, unit.z, alpha)
      const dHeading = MathUtils.euclideanModulo(unit.heading - unit.previousHeading + Math.PI, Math.PI * 2) - Math.PI
      const angle = unit.previousHeading + dHeading * alpha

      // Chassis, windows cabin, roof cap, front & rear bumpers, side doors
      setBox(shells, shellCount++, x, z, angle, 0, 0.56, 0, 1.84, 0.54, 3.86, bodyColor)
      setBox(shells, shellCount++, x, z, angle, 0, 0.99, 0.12, 1.46, 0.39, 1.78, windowColor)
      setBox(shells, shellCount++, x, z, angle, 0, 1.19, 0.14, 1.32, 0.08, 1.38, stripeColor)
      setBox(shells, shellCount++, x, z, angle, 0, 0.34, -1.94, 1.72, 0.15, 0.14, trimColor)
      setBox(shells, shellCount++, x, z, angle, 0, 0.36, 1.94, 1.72, 0.15, 0.14, trimColor)
      setBox(shells, shellCount++, x, z, angle, -0.925, 0.58, 0.04, 0.03, 0.28, 1.62, stripeColor)
      setBox(shells, shellCount++, x, z, angle, 0.925, 0.58, 0.04, 0.03, 0.28, 1.62, stripeColor)

      const c = Math.cos(angle)
      const s = Math.sin(angle)
      for (const side of [-1, 1]) {
        for (const axle of [-1, 1]) {
          const dx = side * 0.82
          const dz = axle * 1.22
          pose.position.set(x + c * dx - s * dz, 0.33, z + s * dx + c * dz)
          pose.rotation.set(0, -angle, 0)
          pose.scale.set(1, 1, 1)
          pose.updateMatrix()
          wheels.setMatrixAt(wheelCount, pose.matrix)
          wheels.setColorAt(wheelCount, wheelColor)
          wheelCount++
        }
        setBox(lights, lightCount++, x, z, angle, side * 0.62, 0.55, -1.95, 0.26, 0.11, 0.05, night ? headLit : headDim)
        setBox(lights, lightCount++, x, z, angle, side * 0.62, 0.58, 1.95, 0.25, 0.10, 0.05, unit.braking ? tailLit : tailDim)
      }

      const strobe = sirenActive ? Math.sin(elapsed * 14 + i * 1.9) : 0
      setBox(lights, lightCount++, x, z, angle, -0.23, 1.27, 0.14, 0.42, 0.09, 0.20, strobe > 0 ? sirenRedLit : sirenRedDim)
      setBox(lights, lightCount++, x, z, angle, 0.23, 1.27, 0.14, 0.42, 0.09, 0.20, strobe < 0 ? sirenBlueLit : sirenBlueDim)

      if (unit.dismounted && unit.officer.active && officerCount + 6 <= capacity * 6) {
        const ox = MathUtils.lerp(unit.officer.previousX, unit.officer.x, alpha)
        const oz = MathUtils.lerp(unit.officer.previousZ, unit.officer.z, alpha)
        const oh = unit.officer.heading
        const stride = unit.officer.speed > 0.4 ? Math.sin(elapsed * 9 + i) * 0.16 : 0
        setBox(officers, officerCount++, ox, oz, oh, -0.11, 0.38, stride, 0.17, 0.72, 0.19, trimColor)
        setBox(officers, officerCount++, ox, oz, oh, 0.11, 0.38, -stride, 0.17, 0.72, 0.19, trimColor)
        setBox(officers, officerCount++, ox, oz, oh, 0, 0.99, 0, 0.46, 0.54, 0.26, officerUniformColor)
        setBox(officers, officerCount++, ox, oz, oh, -0.12, 1.09, -0.135, 0.09, 0.09, 0.03, officerBadgeColor)
        setBox(officers, officerCount++, ox, oz, oh, 0, 1.40, 0, 0.27, 0.27, 0.27, officerSkinColor)
        setBox(officers, officerCount++, ox, oz, oh, 0, 1.56, -0.02, 0.29, 0.10, 0.32, officerUniformColor)
      }
    }

    const pairs: [InstancedMesh, number][] = [
      [shells, shellCount],
      [wheels, wheelCount],
      [lights, lightCount],
      [officers, officerCount],
    ]
    for (const [mesh, nextCount] of pairs) {
      mesh.count = nextCount
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }

  return {
    render,
    dispose() {
      scene.remove(shells, wheels, lights, officers)
      shells.dispose()
      wheels.dispose()
      lights.dispose()
      officers.dispose()
      cube.dispose()
      wheelGeo.dispose()
      standard.dispose()
      glow.dispose()
    },
  }
}
