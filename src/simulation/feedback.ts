import { BoxGeometry, CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, Scene, Vector3 } from 'three';
import type { Physics, Point3, StaticBox } from '../physics/physics';
import { allShops } from '../world/generation/shop';

interface DestructiblePropSpec {
  id: string;
  kind: 'hydrant' | 'crate';
  box: StaticBox;
  color: number;
}

const streetPropSpecs: readonly DestructiblePropSpec[] = [
  { id: 'damage:prop:hydrant:0', kind: 'hydrant', box: { x: 22.8, y: 0.42, z: 38.8, halfX: 0.22, halfY: 0.42, halfZ: 0.22 }, color: 0xc9423a },
  { id: 'damage:prop:hydrant:1', kind: 'hydrant', box: { x: -6.5, y: 0.42, z: 38.8, halfX: 0.22, halfY: 0.42, halfZ: 0.22 }, color: 0xc9423a },
  { id: 'damage:prop:hydrant:2', kind: 'hydrant', box: { x: -26.8, y: 0.42, z: 0.5, halfX: 0.22, halfY: 0.42, halfZ: 0.22 }, color: 0xc9423a },
  { id: 'damage:prop:hydrant:3', kind: 'hydrant', box: { x: 22.8, y: 0.42, z: -22.2, halfX: 0.22, halfY: 0.42, halfZ: 0.22 }, color: 0xc9423a },
  { id: 'damage:prop:hydrant:4', kind: 'hydrant', box: { x: -49.8, y: 0.42, z: -57.8, halfX: 0.22, halfY: 0.42, halfZ: 0.22 }, color: 0xc9423a },
  { id: 'damage:prop:crate:0', kind: 'crate', box: { x: 9.2, y: 0.45, z: 38.6, halfX: 0.42, halfY: 0.45, halfZ: 0.42 }, color: 0xb2824e },
  { id: 'damage:prop:crate:1', kind: 'crate', box: { x: -17.5, y: 0.45, z: 38.6, halfX: 0.42, halfY: 0.45, halfZ: 0.42 }, color: 0xb2824e },
  { id: 'damage:prop:crate:2', kind: 'crate', box: { x: 42.6, y: 0.45, z: 2.0, halfX: 0.42, halfY: 0.45, halfZ: 0.42 }, color: 0xb2824e },
  { id: 'damage:prop:crate:3', kind: 'crate', box: { x: -27.2, y: 0.45, z: -32.2, halfX: 0.42, halfY: 0.45, halfZ: 0.42 }, color: 0xb2824e },
];

export function createFeedback(scene: Scene, physics: Physics, onGeometryChanged: (boxes: StaticBox[], changed?: StaticBox) => void) {
  const geometry = new BoxGeometry();
  const glass = new MeshStandardMaterial({ color: 0x91d4d1, transparent: true, opacity: 0.32, roughness: 0.13, metalness: 0.1, depthWrite: false });
  const hydrantMat = new MeshStandardMaterial({ color: 0xc9423a, roughness: 0.55 });
  const crateMat = new MeshStandardMaterial({ color: 0xb2824e, roughness: 0.88 });
  const particleMaterial = new MeshBasicMaterial({ color: 0xe9d6aa });

  const windows = allShops.flatMap((store) =>
    store.windows.map((box, index) => {
      const mesh = new Mesh(geometry, glass);
      mesh.position.set(box.x, box.y, box.z);
      mesh.scale.set(box.halfX * 2, box.halfY * 2, box.halfZ * 2);
      scene.add(mesh);
      const prefix = store.id === 'shop:mercado-palma' ? 'damage:mercado-palma' : `damage:${store.id}`;
      return { id: `${prefix}:window:${index}`, storeId: store.id, kind: 'glass' as const, box, mesh, collider: physics.addBox(box), intact: true };
    }),
  );

  const props = streetPropSpecs.map((spec) => {
    const mesh = new Mesh(geometry, spec.kind === 'hydrant' ? hydrantMat : crateMat);
    mesh.position.set(spec.box.x, spec.box.y, spec.box.z);
    mesh.scale.set(spec.box.halfX * 2, spec.box.halfY * 2, spec.box.halfZ * 2);
    mesh.castShadow = mesh.receiveShadow = true;
    scene.add(mesh);
    return { id: spec.id, kind: spec.kind, box: spec.box, mesh, collider: physics.addBox(spec.box), intact: true };
  });

  const particleGroup = new Group();
  particleGroup.visible = false;
  scene.add(particleGroup);
  const particles = Array.from({ length: 48 }, () => {
    const mesh = new Mesh(geometry, particleMaterial);
    mesh.visible = false;
    particleGroup.add(mesh);
    return { mesh, velocity: new Vector3(), life: 0, duration: 0, ballistic: false };
  });
  let nextParticle = 0;
  let activeParticles = 0;

  // Keep a single pooled interior PointLight so shaders stay at NUM_POINT_LIGHTS=1 across all 9 stores.
  const interior = new PointLight(0xffd8a2, 18, 13, 2);
  interior.position.set(allShops[0].centerX, 2.8, allShops[0].centerZ + 0.2);
  scene.add(interior);
  let lastLightFocusX = Number.NaN;
  let lastLightFocusZ = Number.NaN;

  const signs: Mesh[] = [];
  if (typeof document !== 'undefined') {
    for (const store of allShops) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = store.id === 'shop:mercado-palma' ? '#163e3d' : store.accentColor;
        ctx.fillRect(0, 0, 512, 80);
        ctx.fillStyle = '#ffe7b1';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(store.name.toUpperCase(), 256, 46);
        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#e8f5ee';
        ctx.fillText(`ABIERTO  ·  ${store.tagline.toUpperCase()}`, 256, 68);
        const sign = new Mesh(new PlaneGeometry(Math.min(7.6, store.width * 0.76), 1.18), new MeshBasicMaterial({ map: new CanvasTexture(canvas), side: DoubleSide }));
        sign.position.set(store.centerX, 3.88, store.centerZ + 5.45);
        scene.add(sign);
        signs.push(sign);
      }
    }
  }

  const allIntactBoxes = () => [
    ...windows.filter((w) => w.intact).map((w) => w.box),
    ...props.filter((p) => p.intact).map((p) => p.box),
  ];
  const updateGeometry = (changed?: StaticBox) => onGeometryChanged(allIntactBoxes(), changed);

  function particle(point: Point3, ballistic: boolean, lifetime: number) {
    const item = particles[nextParticle++ % particles.length];
    if (item.life <= 0) activeParticles++;
    particleGroup.visible = true;
    item.mesh.position.set(point.x, point.y, point.z);
    item.mesh.visible = true;
    item.ballistic = ballistic;
    item.life = item.duration = lifetime;
    return item;
  }

  updateGeometry();

  return {
    windows,
    props,
    get particleCount() { return activeParticles; },
    hit(handle: number, point: Point3) {
      const targetWindow = windows.find((w) => w.intact && w.collider.handle === handle);
      if (targetWindow) {
        targetWindow.intact = false;
        targetWindow.mesh.visible = false;
        physics.world.removeCollider(targetWindow.collider, true);
        updateGeometry(targetWindow.box);
        for (let i = 0; i < 12; i++) {
          const p = particle(point, true, 0.7 + i * 0.045);
          p.mesh.scale.set(0.04 + (i % 3) * 0.018, 0.08, 0.025);
          p.mesh.rotation.set(i, i * 0.7, 0);
          p.velocity.set(Math.sin(i * 2.4) * 2.5, 1.5 + (i % 4) * 0.5, Math.cos(i * 2.4) * 1.7);
        }
        return true;
      }
      const targetProp = props.find((p) => p.intact && p.collider.handle === handle);
      if (targetProp) {
        targetProp.intact = false;
        targetProp.mesh.visible = false;
        physics.world.removeCollider(targetProp.collider, true);
        updateGeometry(targetProp.box);
        const count = targetProp.kind === 'hydrant' ? 14 : 9;
        for (let i = 0; i < count; i++) {
          const p = particle(point, true, targetProp.kind === 'hydrant' ? 1.1 + i * 0.04 : 0.7 + i * 0.04);
          p.mesh.scale.set(0.06, targetProp.kind === 'hydrant' ? 0.14 : 0.08, 0.06);
          p.mesh.rotation.set(i, i * 0.5, 0);
          p.velocity.set(Math.sin(i * 2.1) * 1.8, targetProp.kind === 'hydrant' ? 4.2 + (i % 4) * 0.7 : 2.0 + (i % 3) * 0.4, Math.cos(i * 2.1) * 1.8);
        }
        return true;
      }
      return false;
    },
    hitNear(point: Point3, radius = 1.6) {
      let broke = false;
      for (const prop of props) {
        if (!prop.intact) continue;
        if (Math.hypot(prop.box.x - point.x, prop.box.z - point.z) < radius) {
          this.hit(prop.collider.handle, prop.box);
          broke = true;
        }
      }
      for (const win of windows) {
        if (!win.intact) continue;
        if (Math.hypot(win.box.x - point.x, win.box.z - point.z) < radius) {
          this.hit(win.collider.handle, win.box);
          broke = true;
        }
      }
      return broke;
    },
    shot(from: Vector3, to: Vector3, struck = true) {
      const trace = particle(from.clone().add(to).multiplyScalar(0.5), false, 0.065);
      trace.mesh.scale.set(0.015, 0.015, from.distanceTo(to));
      trace.mesh.lookAt(to);
      const flash = particle(from, false, 0.055);
      flash.mesh.scale.set(0.13, 0.13, 0.13);
      flash.mesh.rotation.set(0, 0, 0);
      if (struck) {
        const impact = particle(to, false, 0.18);
        impact.mesh.scale.set(0.11, 0.11, 0.035);
        impact.mesh.rotation.set(0, 0, 0);
      }
    },
    step(dt: number, focus?: Point3) {
      if (focus && Math.hypot(focus.x - lastLightFocusX, focus.z - lastLightFocusZ) >= 1.5) {
        lastLightFocusX = focus.x;
        lastLightFocusZ = focus.z;
        let best = allShops[0];
        let bestD = Infinity;
        for (const store of allShops) {
          const d = Math.hypot(store.centerX - focus.x, store.centerZ - focus.z);
          if (d < bestD) { bestD = d; best = store; }
        }
        interior.position.set(best.centerX, 2.8, best.centerZ + 0.2);
      }
      if (activeParticles === 0) return;
      let remaining = 0;
      for (const item of particles) {
        if (item.life <= 0) continue;
        item.life = Math.max(0, item.life - dt);
        if (item.life > 0) {
          remaining++;
          if (item.ballistic) {
            item.velocity.y -= 10 * dt;
            item.mesh.position.addScaledVector(item.velocity, dt);
            item.mesh.rotation.x += dt * 3;
            if (item.mesh.position.y < 0.06) {
              item.mesh.position.y = 0.06;
              item.velocity.multiplyScalar(0.2);
              item.velocity.y = Math.abs(item.velocity.y);
            }
          }
        } else {
          item.mesh.visible = false;
        }
      }
      activeParticles = remaining;
      particleGroup.visible = remaining > 0;
    },
    reset() {
      for (const target of windows) {
        if (!target.intact) target.collider = physics.addBox(target.box);
        target.intact = true;
        target.mesh.visible = true;
      }
      for (const prop of props) {
        if (!prop.intact) prop.collider = physics.addBox(prop.box);
        prop.intact = true;
        prop.mesh.visible = true;
      }
      for (const item of particles) { item.life = 0; item.mesh.visible = false; }
      activeParticles = 0;
      particleGroup.visible = false;
      lastLightFocusX = lastLightFocusZ = Number.NaN;
      interior.position.set(allShops[0].centerX, 2.8, allShops[0].centerZ + 0.2);
      updateGeometry();
    },
    dispose() {
      for (const target of windows) {
        if (target.intact) physics.world.removeCollider(target.collider, true);
        target.mesh.removeFromParent();
      }
      for (const prop of props) {
        if (prop.intact) physics.world.removeCollider(prop.collider, true);
        prop.mesh.removeFromParent();
      }
      particleGroup.removeFromParent();
      interior.removeFromParent();
      interior.dispose();
      for (const sign of signs) {
        (sign.material as MeshBasicMaterial).map?.dispose();
        (sign.material as MeshBasicMaterial).dispose();
        sign.geometry.dispose();
        sign.removeFromParent();
      }
      geometry.dispose();
      glass.dispose();
      hydrantMat.dispose();
      crateMat.dispose();
      particleMaterial.dispose();
    },
  };
}
