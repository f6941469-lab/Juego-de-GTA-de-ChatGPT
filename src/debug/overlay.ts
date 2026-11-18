import { BufferAttribute, BufferGeometry, DynamicDrawUsage, LineBasicMaterial, LineSegments, type Scene } from 'three'
import type { StaticBox } from '../physics/physics'
import type { RoadLane } from '../navigation/road-graph'

const edges = [0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 4, 1, 5, 2, 6, 3, 7]

export function createDebugOverlay(scene: Scene) {
  const geometry = new BufferGeometry()
  const coordinates = new Float32Array(6 * 1800)
  const attribute = new BufferAttribute(coordinates, 3).setUsage(DynamicDrawUsage)
  geometry.setAttribute('position', attribute)
  geometry.setDrawRange(0, 0)
  const lines = new LineSegments(geometry, new LineBasicMaterial({ color: '#75e6b6', transparent: true, opacity: 0.6 }))
  lines.visible = false
  lines.frustumCulled = false
  scene.add(lines)

  return {
    set visible(value: boolean) { lines.visible = value },
    update(boxes: readonly StaticBox[], routes: readonly (readonly RoadLane[])[], focus: { x: number; z: number }) {
      let index = 0
      for (const box of boxes) {
        if (box.halfY < 0.06 || box.halfX > 40 || box.halfZ > 40
          || Math.abs(box.x - focus.x) > 40 || Math.abs(box.z - focus.z) > 40
          || index + edges.length * 3 > coordinates.length) continue
        for (const corner of edges) {
          coordinates[index++] = box.x + (corner & 1 ? box.halfX : -box.halfX)
          coordinates[index++] = box.y + (corner & 2 ? box.halfY : -box.halfY)
          coordinates[index++] = box.z + (corner & 4 ? box.halfZ : -box.halfZ)
        }
      }
      for (const route of routes) {
        for (const lane of route) {
          if (index + 6 > coordinates.length) break
          coordinates.set([lane.start.x, 0.18, lane.start.z, lane.end.x, 0.18, lane.end.z], index)
          index += 6
        }
      }
      geometry.setDrawRange(0, index / 3)
      attribute.needsUpdate = true
    },
  }
}
