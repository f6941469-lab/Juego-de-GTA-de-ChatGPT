import { BoxGeometry, Color, InstancedMesh, MathUtils, MeshBasicMaterial, MeshStandardMaterial, Object3D, type Scene } from 'three'

export interface TrafficVisual {
  x: number
  z: number
  previousX: number
  previousZ: number
  heading: number
  previousHeading: number
  speed: number
  paint: Color
  braking: boolean
  occupied?: boolean
  driverShirt?: number
}

const windowColor = new Color('#293e51')
const wheelsColor = new Color('#171b22')
const chromeColor = new Color('#8296a3')
const driverSkinColor = new Color('#bd7855')
const driverShirtScratch = new Color('#4c6073')
const frontDim = new Color('#fff0db').multiplyScalar(0.65)
const frontLit = new Color('#fff0db')
const rearDim = new Color('#772939')
const rearLit = new Color('#ff4668')

export function createTrafficVisuals(scene: Scene, capacity: number) {
  const cube = new BoxGeometry(1, 1, 1)
  const standard = new MeshStandardMaterial({ roughness: 0.66, metalness: 0.13 })
  const glow = new MeshBasicMaterial({ toneMapped: false })
  const shells = new InstancedMesh(cube, standard, capacity * 4)
  const wheels = new InstancedMesh(cube, standard, capacity * 4)
  const lights = new InstancedMesh(cube, glow, capacity * 4)
  const drivers = new InstancedMesh(cube, standard, capacity * 2)
  const pose = new Object3D()
  for (const mesh of [shells, wheels, lights, drivers]) {
    mesh.frustumCulled = false
    mesh.count = 0
    scene.add(mesh)
  }
  shells.castShadow = true
  shells.receiveShadow = true

  function render(vehicles: readonly TrafficVisual[], alpha: number, night: boolean) {
    let index = 0
    let driverParts = 0
    for (const car of vehicles) {
      const x = MathUtils.lerp(car.previousX, car.x, alpha)
      const z = MathUtils.lerp(car.previousZ, car.z, alpha)
      const angle = car.previousHeading + (MathUtils.euclideanModulo(car.heading - car.previousHeading + Math.PI, 2 * Math.PI) - Math.PI) * alpha
      const c = Math.cos(angle)
      const s = Math.sin(angle)
      const set = (mesh: InstancedMesh, slot: number, dx: number, y: number, dz: number, width: number, height: number, depth: number, color: Color) => {
        pose.position.set(x + c * dx - s * dz, y, z + s * dx + c * dz)
        pose.rotation.y = -angle
        pose.scale.set(width, height, depth)
        pose.updateMatrix()
        mesh.setMatrixAt(slot, pose.matrix)
        mesh.setColorAt(slot, color)
      }
      set(shells, index * 4 + 0, 0, 0.60, 0, 1.72, 0.62, 3.55, car.paint)
      set(shells, index * 4 + 1, 0, 1.01, 0.18, 1.47, 0.41, 1.61, windowColor)
      set(shells, index * 4 + 2, 0, 1.23, 0.21, 1.36, 0.095, 1.5, car.paint)
      set(shells, index * 4 + 3, 0, 0.36, -1.77, 1.54, 0.13, 0.16, chromeColor)
      for (const [sideIndex, side] of [-1, 1].entries()) {
        set(wheels, index * 4 + sideIndex * 2, side * 0.82, 0.29, -1.12, 0.23, 0.55, 0.61, wheelsColor)
        set(wheels, index * 4 + sideIndex * 2 + 1, side * 0.82, 0.29, 1.12, 0.23, 0.55, 0.61, wheelsColor)
        set(lights, index * 4 + sideIndex * 2, side * 0.58, 0.69, -1.787, 0.25, 0.13, 0.055, night ? frontLit : frontDim)
        set(lights, index * 4 + sideIndex * 2 + 1, side * 0.6, 0.67, 1.782, 0.22, 0.11, 0.067, car.braking ? rearLit : rearDim)
      }
      if (car.occupied !== false && driverParts + 2 <= capacity * 2) {
        driverShirtScratch.setHex(car.driverShirt ?? 0x4c6073)
        set(drivers, driverParts++, -0.34, 0.89, 0.14, 0.36, 0.32, 0.24, driverShirtScratch)
        set(drivers, driverParts++, -0.34, 1.12, 0.14, 0.24, 0.22, 0.24, driverSkinColor)
      }
      index++
    }
    for (const mesh of [shells, wheels, lights]) {
      mesh.count = index * 4
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    drivers.count = driverParts
    drivers.instanceMatrix.needsUpdate = true
    if (drivers.instanceColor) drivers.instanceColor.needsUpdate = true
  }

  return {
    render,
    dispose() {
      scene.remove(shells, wheels, lights, drivers)
      shells.dispose()
      wheels.dispose()
      lights.dispose()
      drivers.dispose()
      cube.dispose()
      standard.dispose()
      glow.dispose()
    },
  }
}
