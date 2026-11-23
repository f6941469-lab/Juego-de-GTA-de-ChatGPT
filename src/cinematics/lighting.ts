import * as THREE from 'three';
import type { LightingMood, ParticleBurstKind, Vec3Tuple } from './types';

interface MoodConfig {
  keyColor: number;
  keyIntensity: number;
  fillColor: number;
  fillIntensity: number;
  rimColor: number;
  rimIntensity: number;
}

const MOODS: Record<LightingMood, MoodConfig> = {
  golden_boulevard: {
    keyColor: 0xffd296,
    keyIntensity: 18,
    fillColor: 0xaad4ff,
    fillIntensity: 8,
    rimColor: 0xff9f5a,
    rimIntensity: 14,
  },
  police_tension: {
    keyColor: 0xffdeb0,
    keyIntensity: 16,
    fillColor: 0x89b4fa,
    fillIntensity: 9,
    rimColor: 0xffb380,
    rimIntensity: 12,
  },
  impact_flash: {
    keyColor: 0xfff5d6,
    keyIntensity: 32,
    fillColor: 0xffb870,
    fillIntensity: 14,
    rimColor: 0xffffff,
    rimIntensity: 24,
  },
  sunset_chase: {
    keyColor: 0xffa65c,
    keyIntensity: 22,
    fillColor: 0xd49eff,
    fillIntensity: 10,
    rimColor: 0xffe49c,
    rimIntensity: 16,
  },
  neon_night: {
    keyColor: 0xff6eb4,
    keyIntensity: 26,
    fillColor: 0x56d8ff,
    fillIntensity: 16,
    rimColor: 0xffcf70,
    rimIntensity: 20,
  },
  palma_handoff: {
    keyColor: 0xffe0a8,
    keyIntensity: 15,
    fillColor: 0xb0dcff,
    fillIntensity: 7,
    rimColor: 0xffb070,
    rimIntensity: 11,
  },
};

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  scale: number;
}

export function createCinematicLightingRig(parentScene: THREE.Object3D) {
  const root = new THREE.Group();
  root.name = 'CinematicLightingRig';
  parentScene.add(root);

  const keyLight = new THREE.PointLight(0xffd296, 0, 26, 1.5);
  const fillLight = new THREE.PointLight(0xaad4ff, 0, 22, 1.5);
  const rimLight = new THREE.PointLight(0xff9f5a, 0, 24, 1.5);
  const sirenBlue = new THREE.PointLight(0x3b82f6, 0, 24, 1.5);
  const sirenRed = new THREE.PointLight(0xff2e3b, 0, 24, 1.5);
  const carHeadlight = new THREE.PointLight(0xfff0c2, 0, 20, 1.5);

  root.add(keyLight, fillLight, rimLight, sirenBlue, sirenRed, carHeadlight);

  // Pooled burst particles (sparks, punch impact, tire smoke)
  const particleGroup = new THREE.Group();
  particleGroup.visible = false;
  root.add(particleGroup);

  const particleGeo = new THREE.BoxGeometry(1, 1, 1);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe478 });
  const impactMat = new THREE.MeshBasicMaterial({ color: 0xfff8e6 });
  const smokeMat = new THREE.MeshBasicMaterial({ color: 0xd8dce3 });

  const particles: BurstParticle[] = Array.from({ length: 28 }, () => {
    const mesh = new THREE.Mesh(particleGeo, sparkMat);
    mesh.visible = false;
    particleGroup.add(mesh);
    return {
      mesh,
      vel: new THREE.Vector3(),
      life: 0,
      maxLife: 0.4,
      scale: 0.1,
    };
  });

  let activeParticles = 0;
  let rngState = 0x9e3779b9;
  function nextRand(): number {
    rngState = (Math.imul(1664525, rngState) + 1013904223) >>> 0;
    return rngState / 4294967296;
  }

  function spawnBurst(kind: ParticleBurstKind, point: Vec3Tuple) {
    const count = kind === 'impact' ? 14 : kind === 'sparks' ? 8 : 10;
    const mat = kind === 'impact' ? impactMat : kind === 'sparks' ? sparkMat : smokeMat;
    let spawned = 0;
    for (const p of particles) {
      if (p.life > 0) continue;
      p.mesh.material = mat;
      p.mesh.position.set(
        point.x + (nextRand() - 0.5) * 0.25,
        point.y + (nextRand() - 0.5) * 0.25,
        point.z + (nextRand() - 0.5) * 0.25,
      );
      if (kind === 'sparks') {
        p.vel.set((nextRand() - 0.5) * 3.4, 1.2 + nextRand() * 2.2, (nextRand() - 0.5) * 3.4);
        p.maxLife = 0.28 + nextRand() * 0.18;
        p.scale = 0.055;
      } else if (kind === 'impact') {
        const angle = nextRand() * Math.PI * 2;
        const speed = 2.4 + nextRand() * 3.8;
        p.vel.set(Math.cos(angle) * speed, 0.8 + nextRand() * 2.4, Math.sin(angle) * speed);
        p.maxLife = 0.34 + nextRand() * 0.22;
        p.scale = 0.12;
      } else {
        p.vel.set((nextRand() - 0.5) * 1.8, 0.7 + nextRand() * 1.1, (nextRand() - 0.5) * 1.8);
        p.maxLife = 0.55 + nextRand() * 0.35;
        p.scale = 0.26;
      }
      p.life = p.maxLife;
      p.mesh.scale.setScalar(p.scale);
      p.mesh.visible = true;
      activeParticles++;
      spawned++;
      if (spawned >= count) break;
    }
    particleGroup.visible = activeParticles > 0;
  }

  function update(
    active: boolean,
    mood: LightingMood,
    focus: Vec3Tuple,
    cameraPos: Vec3Tuple,
    patrolPos: Vec3Tuple | null,
    sirensOn: boolean,
    carLightPos: Vec3Tuple | null,
    dt: number,
    clock: number,
  ) {
    root.visible = active;
    if (!active) {
      keyLight.intensity = 0;
      fillLight.intensity = 0;
      rimLight.intensity = 0;
      sirenBlue.intensity = 0;
      sirenRed.intensity = 0;
      carHeadlight.intensity = 0;
      return;
    }

    const cfg = MOODS[mood];
    // Position 3-point studio lights relative to camera -> focus axis
    const dx = cameraPos.x - focus.x;
    const dz = cameraPos.z - focus.z;
    const len = Math.max(0.01, Math.hypot(dx, dz));
    const fx = dx / len;
    const fz = dz / len;
    // Right perpendicular vector
    const rx = -fz;
    const rz = fx;

    // Key light: 45 deg front-right & elevated
    keyLight.color.setHex(cfg.keyColor);
    keyLight.intensity = cfg.keyIntensity;
    keyLight.position.set(focus.x + fx * 3.6 + rx * 3.2, focus.y + 3.8, focus.z + fz * 3.6 + rz * 3.2);

    // Fill light: opposite side softer
    fillLight.color.setHex(cfg.fillColor);
    fillLight.intensity = cfg.fillIntensity;
    fillLight.position.set(focus.x + fx * 3.0 - rx * 3.6, focus.y + 2.4, focus.z + fz * 3.0 - rz * 3.6);

    // Rim light: behind subject for crisp silhouette separation
    rimLight.color.setHex(cfg.rimColor);
    rimLight.intensity = cfg.rimIntensity;
    rimLight.position.set(focus.x - fx * 4.2 - rx * 1.4, focus.y + 3.4, focus.z - fz * 4.2 - rz * 1.4);

    // Dynamic police strobe lights on patrol roof
    if (sirensOn && patrolPos) {
      const phase = Math.floor(clock * 9) % 2 === 0;
      sirenBlue.position.set(patrolPos.x - 0.5, patrolPos.y + 1.85, patrolPos.z);
      sirenRed.position.set(patrolPos.x + 0.5, patrolPos.y + 1.85, patrolPos.z);
      sirenBlue.intensity = phase ? 36 : 2;
      sirenRed.intensity = phase ? 2 : 36;
    } else {
      sirenBlue.intensity = 0;
      sirenRed.intensity = 0;
    }

    // Sports car warm front glow (for night neon & chase scenes)
    if (carLightPos) {
      carHeadlight.position.set(carLightPos.x, carLightPos.y + 1.1, carLightPos.z);
      carHeadlight.intensity = mood === 'neon_night' ? 18 : 10;
    } else {
      carHeadlight.intensity = 0;
    }

    // Update active burst particles
    if (activeParticles > 0 && dt > 0) {
      let alive = 0;
      for (const p of particles) {
        if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.mesh.visible = false;
          continue;
        }
        p.mesh.position.addScaledVector(p.vel, dt);
        p.vel.y -= 5.2 * dt;
        const frac = p.life / p.maxLife;
        p.mesh.scale.setScalar(p.scale * (0.35 + frac * 0.9));
        p.mesh.rotation.x += dt * 7;
        p.mesh.rotation.y += dt * 5;
        alive++;
      }
      activeParticles = alive;
      particleGroup.visible = alive > 0;
    }
  }

  function clearParticles() {
    for (const p of particles) {
      p.life = 0;
      p.mesh.visible = false;
    }
    activeParticles = 0;
    particleGroup.visible = false;
  }

  root.visible = false;

  return {
    root,
    spawnBurst,
    update,
    clearParticles,
    dispose() {
      particleGeo.dispose();
      sparkMat.dispose();
      impactMat.dispose();
      smokeMat.dispose();
      root.removeFromParent();
    },
  };
}

export type CinematicLightingRig = ReturnType<typeof createCinematicLightingRig>;
