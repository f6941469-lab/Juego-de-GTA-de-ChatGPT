import type { DistrictMap, MapRectangle } from "../world/generation/layout";

export interface RadarContact {
  x: number;
  z: number;
  kind: "police" | "patrol" | "heli";
}

export interface PlayerMapPosition {
  x: number;
  z: number;
  heading: number;
  wantedStars?: number;
  contacts?: readonly RadarContact[];
}

export function createMinimap(canvas: HTMLCanvasElement) {
  const background = document.createElement("canvas");
  const { width, height } = canvas;
  background.width = width;
  background.height = height;
  const backdrop = background.getContext("2d");
  const ctx = canvas.getContext("2d");
  const inset = 12;
  let projectX = (_x: number) => 0;
  let projectZ = (_z: number) => 0;
  let mapReady = false;
  let last: { x: number; z: number; heading: number; pulse: number; stars: number } | undefined;

  function setWorld(map: DistrictMap) {
    if (!ctx || !backdrop) return;
    const { minX, maxX, minZ, maxZ } = map.bounds;
    projectX = (x) => inset + ((x - minX) / (maxX - minX)) * (width - inset * 2);
    projectZ = (z) => inset + ((z - minZ) / (maxZ - minZ)) * (height - inset * 2);

    function drawRectangle(rectangle: MapRectangle, color: string) {
      if (!backdrop) return;
      const x = projectX(rectangle.x - rectangle.width / 2);
      const z = projectZ(rectangle.z - rectangle.depth / 2);
      backdrop.fillStyle = color;
      backdrop.fillRect(
        x,
        z,
        projectX(rectangle.x + rectangle.width / 2) - x,
        projectZ(rectangle.z + rectangle.depth / 2) - z,
      );
    }

    backdrop.fillStyle = "#161d25";
    backdrop.fillRect(0, 0, width, height);
    backdrop.save();
    backdrop.beginPath();
    backdrop.rect(inset, inset, width - inset * 2, height - inset * 2);
    backdrop.clip();
    backdrop.fillStyle = "#30333c";
    backdrop.fillRect(inset, inset, width - inset * 2, height - inset * 2);
    if (map.mountains) {
      for (const mountain of map.mountains) drawRectangle(mountain, "#464b46");
    }
    if (map.water) drawRectangle(map.water, "#224e62");
    if (map.islands) {
      for (const island of map.islands) drawRectangle(island, "#40454a");
    }
    for (const road of map.roads) drawRectangle(road, "#6a6e7f");
    if (map.bridges) {
      for (const bridge of map.bridges) drawRectangle(bridge, "#b8a784");
    }

    const landmarkColor: Record<string, string> = {
      casino: "#ffcf76",
      police_hq: "#4da3ff",
      prison: "#f08a4b",
      house: "#56e39f",
      restaurant: "#ff7d6b",
      transit: "#59d2c4",
      shop: "#c6b78e",
      landmark: "#b5b0a2",
    };

    for (const landmark of map.landmarks) {
      const x = projectX(landmark.x);
      const z = projectZ(landmark.z);
      const isKeyVenue = landmark.kind && ['casino', 'police_hq', 'prison', 'house', 'restaurant'].includes(landmark.kind);
      const size = isKeyVenue ? 7 : 5;
      backdrop.fillStyle = landmarkColor[landmark.kind ?? 'landmark'] ?? "#c6b78e";
      backdrop.fillRect(x - size / 2, z - size / 2, size, size);
      if (isKeyVenue) {
        backdrop.strokeStyle = "#10141c";
        backdrop.lineWidth = 1.2;
        backdrop.strokeRect(x - size / 2, z - size / 2, size, size);
      }
    }
    backdrop.restore();
    ctx.drawImage(background, 0, 0);
    mapReady = true;
    last = undefined;
  }

  function update(position: PlayerMapPosition) {
    if (!ctx || !mapReady) return;
    const x = projectX(position.x);
    const z = projectZ(position.z);
    const stars = position.wantedStars ?? 0;
    const pulse = stars > 0 ? Math.floor(performance.now() / 220) % 2 : 0;
    if (
      stars === 0
      && last
      && last.stars === 0
      && Math.hypot(x - last.x, z - last.z) < 0.5
      && Math.abs(position.heading - last.heading) < 0.01
    ) {
      return;
    }
    last = { x, z, heading: position.heading, pulse, stars };
    ctx.drawImage(background, 0, 0);

    // Draw live police radar blips during active alert
    if (stars > 0 && position.contacts?.length) {
      for (const c of position.contacts) {
        const cx = Math.max(inset + 2, Math.min(width - inset - 2, projectX(c.x)));
        const cz = Math.max(inset + 2, Math.min(height - inset - 2, projectZ(c.z)));
        if (c.kind === "heli") {
          ctx.strokeStyle = pulse ? "#ff4e5e" : "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cz, 6.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(cx - 2, cz - 2, 4, 4);
        } else {
          ctx.fillStyle = pulse ? "#ff404f" : "#4da3ff";
          ctx.beginPath();
          ctx.arc(cx, cz, c.kind === "patrol" ? 4.5 : 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // Subtle flashing red/blue radar frame
      ctx.strokeStyle = pulse ? "rgba(255, 68, 86, 0.78)" : "rgba(77, 163, 255, 0.78)";
      ctx.lineWidth = 3;
      ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    }

    ctx.save();
    ctx.translate(
      Math.max(inset, Math.min(width - inset, x)),
      Math.max(inset, Math.min(height - inset, z)),
    );
    ctx.rotate(position.heading);
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(7, 7);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.strokeStyle = "#101219";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.fillStyle = "#f3ef83";
    ctx.fill();
    ctx.restore();
  }

  return { setWorld, update };
}
