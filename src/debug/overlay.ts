import { BufferAttribute, BufferGeometry, DynamicDrawUsage, LineBasicMaterial, LineSegments, type Scene } from 'three'
import type { PedestrianGraph } from '../navigation/pedestrian-graph'
import type { RoadLane } from '../navigation/road-graph'
import type { StaticBox } from '../physics/physics'

const edges = [0, 1, 1, 3, 3, 2, 2, 0, 4, 5, 5, 7, 7, 6, 6, 4, 0, 4, 1, 5, 2, 6, 3, 7]

export interface DebugObserverCone {
  x: number
  z: number
  heading: number
  range: number
  halfAngleRad: number
}

export function createDebugOverlay(scene: Scene) {
  const geometry = new BufferGeometry()
  const coordinates = new Float32Array(6 * 2400)
  const attribute = new BufferAttribute(coordinates, 3).setUsage(DynamicDrawUsage)
  geometry.setAttribute('position', attribute)
  geometry.setDrawRange(0, 0)
  const material = new LineBasicMaterial({ color: '#75e6b6', transparent: true, opacity: 0.6 })
  const lines = new LineSegments(geometry, material)
  lines.visible = false
  lines.frustumCulled = false
  scene.add(lines)

  const navGeometry = new BufferGeometry()
  const navCoordinates = new Float32Array(6 * 1200)
  const navAttribute = new BufferAttribute(navCoordinates, 3).setUsage(DynamicDrawUsage)
  navGeometry.setAttribute('position', navAttribute)
  navGeometry.setDrawRange(0, 0)
  const navMaterial = new LineBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.7 })
  const navLines = new LineSegments(navGeometry, navMaterial)
  navLines.visible = false
  navLines.frustumCulled = false
  scene.add(navLines)

  return {
    set visible(value: boolean) {
      lines.visible = value
      navLines.visible = value
    },
    update(
      boxes: readonly StaticBox[],
      routes: readonly (readonly RoadLane[])[],
      focus: { x: number; z: number },
      pedestrianGraph?: PedestrianGraph,
      cones: readonly DebugObserverCone[] = [],
    ) {
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

      let navIndex = 0
      if (pedestrianGraph) {
        for (const edge of pedestrianGraph.edges) {
          if (navIndex + 6 > navCoordinates.length) break
          if (Math.abs(edge.from.x - focus.x) > 36 || Math.abs(edge.from.z - focus.z) > 36) continue
          navCoordinates.set([edge.from.x, 0.14, edge.from.z, edge.to.x, 0.14, edge.to.z], navIndex)
          navIndex += 6
        }
      }
      for (const cone of cones) {
        if (navIndex + 18 > navCoordinates.length) break
        const left = cone.heading - cone.halfAngleRad
        const right = cone.heading + cone.halfAngleRad
        const lx = cone.x + Math.sin(left) * cone.range
        const lz = cone.z - Math.cos(left) * cone.range
        const rx = cone.x + Math.sin(right) * cone.range
        const rz = cone.z - Math.cos(right) * cone.range
        navCoordinates.set([cone.x, 1.3, cone.z, lx, 1.3, lz], navIndex)
        navCoordinates.set([cone.x, 1.3, cone.z, rx, 1.3, rz], navIndex + 6)
        navCoordinates.set([lx, 1.3, lz, rx, 1.3, rz], navIndex + 12)
        navIndex += 18
      }
      navGeometry.setDrawRange(0, navIndex / 3)
      navAttribute.needsUpdate = true
    },
    dispose() {
      lines.removeFromParent()
      navLines.removeFromParent()
      geometry.dispose()
      material.dispose()
      navGeometry.dispose()
      navMaterial.dispose()
    },
  }
}
