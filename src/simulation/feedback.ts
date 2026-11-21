import { BoxGeometry, CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, PointLight, Scene, Vector3 } from 'three';
import type { Physics, Point3, StaticBox } from '../physics/physics';
import { shopWindows } from '../world/generation/shop';

export function createFeedback(scene: Scene, physics: Physics, onGeometryChanged: (boxes: StaticBox[], changed?: StaticBox) => void) {
  const geometry = new BoxGeometry();
  const glass = new MeshStandardMaterial({ color: 0x91d4d1, transparent: true, opacity: 0.32, roughness: 0.13, metalness: 0.1, depthWrite: false });
  const particleMaterial = new MeshBasicMaterial({ color: 0xe9d6aa });
  const windows = shopWindows.map((box, index) => {
    const mesh = new Mesh(geometry, glass); mesh.position.set(box.x, box.y, box.z); mesh.scale.set(box.halfX * 2, box.halfY * 2, box.halfZ * 2); scene.add(mesh);
    return { id: `damage:mercado-palma:window:${index}`, box, mesh, collider: physics.addBox(box), intact: true };
  });
  const particles = Array.from({ length: 36 }, () => {
    const mesh = new Mesh(geometry, particleMaterial); mesh.visible = false; scene.add(mesh);
    return { mesh, velocity: new Vector3(), life: 0, duration: 0, ballistic: false };
  });
  let nextParticle = 0;
  const interior = new PointLight(0xffd8a2, 18, 13, 2); interior.position.set(15, 2.8, 34.4); scene.add(interior);
  let sign: Mesh | undefined;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#163e3d'; ctx.fillRect(0, 0, 1024, 160);
      ctx.fillStyle = '#ffe7b1'; ctx.font = 'bold 69px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MERCADO PALMA', 512, 93);
      ctx.font = '22px sans-serif'; ctx.fillStyle = '#8cd9c4'; ctx.fillText('ABIERTO  ·  PRODUCTOS LOCALES', 512, 135);
      sign = new Mesh(new PlaneGeometry(7.6, 1.18), new MeshBasicMaterial({ map: new CanvasTexture(canvas), side: DoubleSide }));
      sign.position.set(15, 3.88, 39.65); scene.add(sign);
    }
  }
  const updateGeometry = (changed?: StaticBox) => onGeometryChanged(windows.filter((window) => window.intact).map((window) => window.box), changed);
  function particle(point: Point3, ballistic: boolean, lifetime: number) {
    const item = particles[nextParticle++ % particles.length]; item.mesh.position.set(point.x, point.y, point.z);
    item.mesh.visible = true; item.ballistic = ballistic; item.life = item.duration = lifetime;
    return item;
  }
  updateGeometry();
  return {
    windows,
    get particleCount() { return particles.filter((particle) => particle.life > 0).length; },
    hit(handle: number, point: Point3) {
      const target = windows.find((window) => window.intact && window.collider.handle === handle);
      if (!target) return false;
      target.intact = false; target.mesh.visible = false; physics.world.removeCollider(target.collider, true); updateGeometry(target.box);
      for (let i = 0; i < 14; i++) {
        const p = particle(point, true, 0.7 + i * 0.045);
        p.mesh.scale.set(0.04 + i % 3 * 0.018, 0.08, 0.025); p.mesh.rotation.set(i, i * 0.7, 0);
        p.velocity.set(Math.sin(i * 2.4) * 2.5, 1.5 + i % 4 * 0.5, Math.cos(i * 2.4) * 1.7);
      }
      return true;
    },
    shot(from: Vector3, to: Vector3, struck = true) {
      const trace = particle(from.clone().add(to).multiplyScalar(0.5), false, 0.065);
      trace.mesh.scale.set(0.015, 0.015, from.distanceTo(to)); trace.mesh.lookAt(to);
      const flash = particle(from, false, 0.055); flash.mesh.scale.set(0.13, 0.13, 0.13); flash.mesh.rotation.set(0, 0, 0);
      if (struck) {
        const impact = particle(to, false, 0.18); impact.mesh.scale.set(0.11, 0.11, 0.035); impact.mesh.rotation.set(0, 0, 0);
      }
    },
    step(dt: number) {
      for (const item of particles) {
        if (item.life <= 0) continue;
        item.life = Math.max(0, item.life - dt); item.mesh.visible = item.life > 0;
        if (item.ballistic) {
          item.velocity.y -= 10 * dt; item.mesh.position.addScaledVector(item.velocity, dt);
          item.mesh.rotation.x += dt * 3;
          if (item.mesh.position.y < 0.06) { item.mesh.position.y = 0.06; item.velocity.multiplyScalar(0.2); item.velocity.y = Math.abs(item.velocity.y); }
        }
      }
    },
    reset() {
      for (const target of windows) { if (!target.intact) target.collider = physics.addBox(target.box); target.intact = true; target.mesh.visible = true; }
      for (const item of particles) { item.life = 0; item.mesh.visible = false; } updateGeometry();
    },
    dispose() {
      for (const target of windows) { if (target.intact) physics.world.removeCollider(target.collider, true); target.mesh.removeFromParent(); }
      for (const particle of particles) particle.mesh.removeFromParent();
      interior.removeFromParent(); interior.dispose();
      if (sign) { (sign.material as MeshBasicMaterial).map?.dispose(); (sign.material as MeshBasicMaterial).dispose(); sign.geometry.dispose(); sign.removeFromParent(); }
      geometry.dispose(); glass.dispose(); particleMaterial.dispose();
    },
  };
}
