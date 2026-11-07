import * as THREE from "three";
import type { Plant } from "../model/plant";
import { rng } from "./geometry";
import type { Look } from "./look";
import { Kit, T, vary, type V3 } from "./yard3d-kit";

// Plant forms for the 3D yard. Each plant becomes one Kit (one mesh), plus flower, berry and
// fallen-leaf spots that the caller gathers into shared instanced meshes.

export type Spot = { at: THREE.Vector3; size: number; color: string };

const BARK = "#5f5044";
const STEM = "#8a7a5c";

export function plantParts(plant: Plant, look: Look, seed: number, snow: boolean) {
  const kit = new Kit();
  const rand = rng(seed);
  const r = look.spreadFt / 2, h = look.heightFt;
  const leaf = look.foliage;
  const spots: Spot[] = [];
  const litter: Spot[] = [];
  const lump = () => T.lumps[Math.floor(rand() * T.lumps.length)];
  const flowerSize = Math.min(0.55, Math.max(0.16, r * 0.09));

  // Points over the upper, outer part of an ellipsoid, for flowers and berries.
  const onShell = (cy: number, rx: number, ry: number, n: number, size: number, colors: string[], from = 0.1) => {
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2, u = from + rand() * (1 - from);
      const k = Math.sqrt(1 - u * u);
      spots.push({ at: new THREE.Vector3(Math.cos(a) * k * rx, cy + u * ry, Math.sin(a) * k * rx), size: size * (0.75 + rand() * 0.5), color: colors[i % colors.length] });
    }
  };
  const blooms = (cy: number, rx: number, ry: number, n: number, from?: number) => {
    if (look.bloom) onShell(cy, rx * 1.03, ry * 1.03, n, flowerSize, look.bloom, from);
    if (look.fruit) onShell(cy, rx * 1.03, ry * 1.03, Math.ceil(n * 0.6), flowerSize * 0.7, [look.fruit], from);
  };

  // Branches that fork twice, for trees and shrubs without leaves.
  const branches = (base: THREE.Vector3, len: number, thick: number, count: number, spread: number, depth: number) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand() * 0.9;
      const tilt = spread * (0.7 + rand() * 0.5);
      const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt));
      const end = base.clone().addScaledVector(dir, len * (0.8 + rand() * 0.4));
      kit.limb(base, end, thick, BARK);
      if (depth > 0) branches(end, len * 0.55, thick * 0.55, 2 + Math.floor(rand() * 2), spread * 1.1, depth - 1);
      else if (snow) kit.add(T.bead, "#f4f6f8", [end.x, end.y, end.z], [thick * 1.6, thick * 0.8, thick * 1.6]);
    }
  };

  switch (plant.render.form) {
    case "canopy": {
      const trunkH = h * 0.36;
      const crownH = h - trunkH;
      const tw = Math.max(0.3, r * 0.08);
      const cy = trunkH + crownH * 0.5;
      kit.add(T.limb, BARK, [0, 0, 0], [tw, trunkH + crownH * 0.25, tw], [0, 0, (rand() - 0.5) * 0.08]);
      const fork = new THREE.Vector3(0, trunkH, 0);
      if (leaf) {
        branches(fork, crownH * 0.45, tw * 0.6, 3, 0.55, 0);
        // A dark core, then clumps around it that catch the light on top.
        kit.add(lump(), vary(leaf, rand, 0.05).multiplyScalar(0.7), [0, cy, 0], [r * 0.7, crownH * 0.42, r * 0.7], [rand(), rand(), rand()], 0.4);
        const n = 26 + Math.floor(r * 1.5);
        for (let i = 0; i < n; i++) {
          const a = rand() * Math.PI * 2, u = rand() * 1.6 - 0.6;
          const k = Math.sqrt(Math.max(0, 1 - u * u));
          const s = (0.22 + rand() * 0.12) * r;
          const at: V3 = [Math.cos(a) * k * r * 0.76, cy + u * crownH * 0.38, Math.sin(a) * k * r * 0.76];
          kit.add(lump(), vary(leaf, rand, 0.16), at, [s, s * (crownH / (2 * r)) * 1.05, s], [rand() * 3, rand() * 3, rand() * 3], 0.45);
        }
        blooms(cy - crownH * 0.08, r * 0.9, crownH * 0.44, Math.round(60 + r * 10));
        // Fall color drops some leaves on the ground under the crown.
        if (!plant.evergreen && isAutumn(leaf))
          for (let i = 0; i < 40 + r * 6; i++) {
            const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r * 1.2;
            litter.push({ at: new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d), size: 0.35 + rand() * 0.3, color: `#${vary(leaf, rand, 0.2).getHexString()}` });
          }
      } else {
        branches(fork, crownH * 0.5, tw * 0.62, 4 + Math.floor(rand() * 2), 0.5, 1);
        // Blossoms on bare wood (a redbud in April).
        blooms(cy, r * 0.8, crownH * 0.45, Math.round(160 + r * 12), -0.3);
      }
      break;
    }
    case "columnar": {
      if (leaf) {
        // Stacked, slightly offset tiers read as a conifer or a sheared column.
        const tiers = 4;
        for (let i = 0; i < tiers; i++) {
          const y0 = h * 0.03 + (i / tiers) * h * 0.62;
          const w = r * (1 - i * 0.17);
          const th = h * (0.97 - (i / tiers) * 0.62) - y0 + h * 0.03;
          const c = vary(leaf, rand, 0.08).multiplyScalar(1 - (tiers - i) * 0.04);
          kit.add(T.cone, c, [(rand() - 0.5) * r * 0.08, y0, (rand() - 0.5) * r * 0.08], [w, th, w], [0, rand() * 3, 0], 0.4);
          if (snow) kit.add(T.cone, "#f2f5f7", [0, y0 + th * 0.55, 0], [w * 0.5, th * 0.45, w * 0.5], [0, rand() * 3, 0], 0.1);
        }
        kit.add(T.limb, BARK, [0, 0, 0], [r * 0.12, h * 0.1, r * 0.12]);
      } else {
        branches(new THREE.Vector3(0, 0, 0), h * 0.7, r * 0.1, 5, 0.15, 1);
      }
      blooms(h * 0.4, r * 0.85, h * 0.55, 40);
      break;
    }
    case "grass": {
      const color = leaf ?? "#b9a07a";
      const n = 16 + Math.floor(r * 6);
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, lean = 0.12 + rand() * 0.42;
        const bh = h * (0.7 + rand() * 0.35);
        kit.add(T.blade, vary(color, rand, 0.14), [Math.cos(a) * r * 0.15, 0, Math.sin(a) * r * 0.15], [Math.max(0.05, r * 0.07), bh, Math.max(0.03, r * 0.035)], [Math.sin(a) * lean, -a, -Math.cos(a) * lean], 0.5);
      }
      if (look.bloom || look.fruit) {
        const colors = look.fruit ? [look.fruit] : look.bloom!;
        onShell(h * 0.75, r * 0.9, h * 0.35, 18, flowerSize * 0.9, colors, 0.3);
      }
      break;
    }
    case "mat": {
      const color = leaf ?? "#6c8f4c";
      const t = Math.max(0.25, h);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + rand();
        const s = r * (0.55 + rand() * 0.2);
        kit.add(lump(), vary(color, rand, 0.1), [Math.cos(a) * r * 0.35, t * 0.3, Math.sin(a) * r * 0.35], [s, t, s], [0, rand() * 3, 0], 0.4);
      }
      blooms(t * 0.3, r * 0.85, t, 30);
      break;
    }
    case "rosette": {
      // Leaves fanned out from the crown, like a hosta or a fern.
      const color = leaf;
      if (color) {
        const n = 7 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + rand() * 0.4;
          kit.add(lump(), vary(color, rand, 0.12), [Math.cos(a) * r * 0.45, h * 0.32, Math.sin(a) * r * 0.45], [r * 0.5, h * 0.3, r * 0.24], [0, -a, 0.35], 0.5);
        }
        kit.add(lump(), vary(color, rand, 0.05).multiplyScalar(0.8), [0, h * 0.3, 0], [r * 0.4, h * 0.35, r * 0.4], [0, 0, 0], 0.5);
      }
      if (look.bloom) {
        // Flower stalks above the leaves.
        for (let i = 0; i < 3; i++) {
          const x = (rand() - 0.5) * r * 0.5, z = (rand() - 0.5) * r * 0.5;
          kit.limb(new THREE.Vector3(x, 0, z), new THREE.Vector3(x * 1.3, h * 1.25, z * 1.3), 0.06, STEM);
          for (let j = 0; j < 4; j++) spots.push({ at: new THREE.Vector3(x * 1.3, h * (0.95 + j * 0.1), z * 1.3), size: flowerSize, color: look.bloom[j % look.bloom.length] });
        }
      }
      break;
    }
    default: {
      // Mounds (shrubs) and upright perennials.
      const upright = plant.render.form === "upright";
      if (leaf) {
        if (upright) {
          // A clump of upright stems with leafy masses, tallest in the middle.
          const n = 3 + Math.floor(rand() * 3);
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + rand() * 0.5, d = i === 0 ? 0 : r * 0.42;
            const sh = h * (i === 0 ? 0.82 : 0.6 + rand() * 0.2);
            kit.add(lump(), vary(leaf, rand, 0.12), [Math.cos(a) * d, sh * 0.5, Math.sin(a) * d], [r * 0.42, sh * 0.5, r * 0.42], [0, rand() * 3, 0], 0.45);
          }
          if (look.bloom) {
            const n2 = Math.round(8 + r * 8);
            for (let i = 0; i < n2; i++) {
              const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * r * 0.85;
              const y = h * (0.8 + rand() * 0.3);
              kit.limb(new THREE.Vector3(Math.cos(a) * d * 0.6, h * 0.4, Math.sin(a) * d * 0.6), new THREE.Vector3(Math.cos(a) * d, y, Math.sin(a) * d), 0.03, STEM);
              spots.push({ at: new THREE.Vector3(Math.cos(a) * d, y, Math.sin(a) * d), size: flowerSize * 1.2, color: look.bloom[i % look.bloom.length] });
            }
          }
          if (look.fruit) onShell(h * 0.5, r * 0.9, h * 0.45, 14, flowerSize * 0.7, [look.fruit]);
        } else {
          // A shrub: a core and lumps around it, flattened a little on the ground.
          kit.add(lump(), vary(leaf, rand, 0.05).multiplyScalar(0.75), [0, h * 0.48, 0], [r * 0.8, h * 0.48, r * 0.8], [rand(), rand(), rand()], 0.45);
          const n = Math.min(10, 3 + Math.floor(r * 1.2));
          for (let i = 0; i < n; i++) {
            const a = rand() * Math.PI * 2, u = rand() * 1.4 - 0.4;
            const k = Math.sqrt(Math.max(0, 1 - u * u));
            const s = r * (0.42 + rand() * 0.14);
            kit.add(lump(), vary(leaf, rand, 0.12), [Math.cos(a) * k * r * 0.5, h * 0.5 + u * h * 0.3, Math.sin(a) * k * r * 0.5], [s, s * (h / (2 * r)) * 1.1, s], [rand() * 3, rand() * 3, rand() * 3], 0.45);
          }
          blooms(h * 0.45, r * 0.95, h * 0.55, Math.round(30 + r * 14));
        }
      } else if (upright) {
        // Dormant perennial: a tuft of last year's stems.
        for (let i = 0; i < 7; i++) {
          const a = rand() * Math.PI * 2, d = rand() * r * 0.4;
          kit.limb(new THREE.Vector3(Math.cos(a) * d * 0.3, 0, Math.sin(a) * d * 0.3), new THREE.Vector3(Math.cos(a) * d, h * (0.3 + rand() * 0.3), Math.sin(a) * d), 0.05, "#9d8a68");
        }
      } else {
        // Dormant shrub: a twiggy vase of stems.
        branches(new THREE.Vector3(0, 0, 0), h * 0.6, Math.max(0.06, r * 0.05), 6 + Math.floor(r), 0.55, 1);
        blooms(h * 0.45, r * 0.9, h * 0.55, Math.round(20 + r * 10));
      }
    }
  }
  return { kit, spots, litter, radius: r };
}

// Reds, oranges and yellows: a leaf color past summer green.
function isAutumn(hex: string) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl);
  return hsl.h < 0.17 || hsl.h > 0.9;
}
