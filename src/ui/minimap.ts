import type { DistrictMap, MapRectangle } from "../world/generation/layout";
import type { StoreMapMarker } from "../world/stores";

export interface PlayerMapPosition {
  x: number;
  z: number;
  heading: number;
  stores?: readonly StoreMapMarker[];
}

export function createMinimap(canvas: HTMLCanvasElement) {
  const background = document.createElement("canvas");
  const { width, height } = canvas;
  background.width = width;
  background.height = height;
  const backdrop = background.getContext("2d");
  const ctx = canvas.getContext("2d");
  const inset = 10;
  let projectX = (_x: number) => 0;
  let projectZ = (_z: number) => 0;
  let mapReady = false;
  let last: { x: number; z: number; heading: number; signature: string } | undefined;

  function setWorld(map: DistrictMap) {
    if (!ctx || !backdrop) return;
    const { minX, maxX, minZ, maxZ } = map.bounds;
    const spanX = Math.max(1, maxX - minX);
    const spanZ = Math.max(1, maxZ - minZ);
    const innerW = width - inset * 2;
    const innerH = height - inset * 2;
    const scale = Math.min(innerW / spanX, innerH / spanZ);
    const offsetX = inset + (innerW - spanX * scale) / 2;
    const offsetZ = inset + (innerH - spanZ * scale) / 2;
    projectX = (x) => offsetX + (x - minX) * scale;
    projectZ = (z) => offsetZ + (z - minZ) * scale;

    function drawRectangle(rectangle: MapRectangle, color: string) {
      if (!backdrop) return;
      const x = projectX(rectangle.x - rectangle.width / 2);
      const z = projectZ(rectangle.z - rectangle.depth / 2);
      backdrop.fillStyle = color;
      backdrop.fillRect(
        x,
        z,
        Math.max(1, projectX(rectangle.x + rectangle.width / 2) - x),
        Math.max(1, projectZ(rectangle.z + rectangle.depth / 2) - z),
      );
    }

    backdrop.fillStyle = "#161d25";
    backdrop.fillRect(0, 0, width, height);
    backdrop.save();
    backdrop.beginPath();
    backdrop.rect(inset, inset, innerW, innerH);
    backdrop.clip();

    if (map.landmasses?.length) {
      backdrop.fillStyle = "#1f485b";
      backdrop.fillRect(inset, inset, innerW, innerH);
      for (const land of map.landmasses) {
        drawRectangle(land, land.color ?? "#323542");
      }
      drawRectangle({ x: 58.6, z: 0, width: 6.8, depth: 416 }, "#a69270");
    } else {
      backdrop.fillStyle = "#303039";
      backdrop.fillRect(inset, inset, innerW, innerH);
      if (map.water) drawRectangle(map.water, "#285365");
    }

    if (map.bridges) {
      for (const bridge of map.bridges) drawRectangle(bridge, "#7c8291");
    }
    for (const road of map.roads) drawRectangle(road, "#666778");

    for (const landmark of map.landmarks) {
      const x = projectX(landmark.x);
      const z = projectZ(landmark.z);
      backdrop.fillStyle = "#9ea3ad";
      backdrop.fillRect(x - 2, z - 2, 4, 4);
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
    const stores = position.stores ?? [];
    const signature = stores.map((s) => (s.available ? "1" : "0")).join("");
    if (
      last
      && Math.hypot(x - last.x, z - last.z) < 0.5
      && Math.abs(position.heading - last.heading) < 0.01
      && last.signature === signature
    ) {
      return;
    }
    last = { x, z, heading: position.heading, signature };
    ctx.drawImage(background, 0, 0);

    for (const store of stores) {
      const sx = projectX(store.x);
      const sz = projectZ(store.z);
      ctx.save();
      ctx.translate(sx, sz);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "#101219";
      ctx.fillRect(-3.6, -3.6, 7.2, 7.2);
      ctx.fillStyle = store.available ? "#ffe168" : "#5e6775";
      ctx.fillRect(-2.4, -2.4, 4.8, 4.8);
      ctx.restore();
    }

    ctx.save();
    ctx.translate(
      Math.max(inset, Math.min(width - inset, x)),
      Math.max(inset, Math.min(height - inset, z)),
    );
    ctx.rotate(position.heading);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(6.5, 6.5);
    ctx.lineTo(0, 3.2);
    ctx.lineTo(-6.5, 6.5);
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
