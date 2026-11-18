import { BoxGeometry, Color, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, type Scene } from 'three'
import type { Axis, RoadGraph, RoadNode, RoadPoint } from '../../navigation/road-graph'

const green = new Color('#84f6b0')
const amber = new Color('#ffc65f')
const red = new Color('#ff435c')
const dark = new Color('#382b33')

export type Signal = 'green' | 'amber' | 'red'

export function signalAt(node: RoadNode, axis: Axis, time: number): Signal {
  const phase = ((time + node.signalOffset + (axis === 'x' ? 10 : 0)) % 20 + 20) % 20
  return phase < 7.5 ? 'green' : phase < 9 ? 'amber' : 'red'
}

export function controlsJunction(graph: RoadGraph, node: RoadNode): boolean {
  const outgoing = graph.outgoing.get(node.id) ?? []
  return outgoing.length > 2 && outgoing.some(lane => lane.axis === 'x') && outgoing.some(lane => lane.axis === 'z')
}

export function createSignals(scene: Scene, graph: RoadGraph) {
  const nodes = [...graph.nodes.values()].filter(node => controlsJunction(graph, node))
  const geometry = new BoxGeometry(1, 1, 1)
  const housing = new MeshStandardMaterial({ color: '#414955', roughness: 0.65, metalness: 0.35 })
  const lamps = new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
  const cap = Math.min(nodes.length, 24) * 4
  const posts = new InstancedMesh(geometry, housing, cap * 2)
  const bulbs = new InstancedMesh(geometry, lamps, cap * 3)
  posts.frustumCulled = bulbs.frustumCulled = false
  posts.count = bulbs.count = 0
  scene.add(posts, bulbs)
  const pose = new Object3D()
  let untilPaint = 0
  function matrix(mesh: InstancedMesh, index: number, x: number, y: number, z: number, width: number, height: number, depth: number, angle = 0) {
    pose.position.set(x, y, z)
    pose.rotation.y = angle
    pose.scale.set(width, height, depth)
    pose.updateMatrix()
    mesh.setMatrixAt(index, pose.matrix)
  }
  return {
    update(time: number, focus: RoadPoint) {
      if (time < untilPaint) return
      untilPaint = time + 0.2
      const nearest = nodes.map((node) => ({ node, d: (node.x - focus.x) ** 2 + (node.z - focus.z) ** 2 }))
        .filter(({ d }) => d < 116 ** 2).sort((a, b) => a.d - b.d).slice(0, cap / 4)
      let signal = 0
      for (const { node } of nearest) {
        for (const axis of ['x', 'z'] as const) {
          const state = signalAt(node, axis, time)
          for (const side of [-1, 1]) {
            const x = node.x + (node.width / 2 + (axis === 'x' ? 0.9 : 0.62)) * side
            const z = node.z + (node.depth / 2 + (axis === 'x' ? 0.62 : 0.9)) * (axis === 'x' ? -side : side)
            const angle = axis === 'z' ? 0 : Math.PI / 2
            matrix(posts, signal * 2, x, 1.42, z, 0.11, 2.84, 0.11)
            matrix(posts, signal * 2 + 1, x, 2.99, z, 0.29, 0.66, 0.2, angle)
            for (const [index, [color, phase]] of [[red, 'red'], [amber, 'amber'], [green, 'green']].entries()) {
              matrix(bulbs, signal * 3 + index, x, 3.17 - index * 0.17, z, 0.15, 0.11, 0.217, angle)
              bulbs.setColorAt(signal * 3 + index, state === phase ? color as Color : dark)
            }
            signal++
          }
        }
      }
      posts.count = signal * 2
      bulbs.count = signal * 3
      posts.instanceMatrix.needsUpdate = bulbs.instanceMatrix.needsUpdate = true
      if (bulbs.instanceColor) bulbs.instanceColor.needsUpdate = true
    },
    dispose() {
      scene.remove(posts, bulbs)
      posts.dispose()
      bulbs.dispose()
      geometry.dispose()
      housing.dispose()
      lamps.dispose()
    },
  }
}
