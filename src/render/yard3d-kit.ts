import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// Building blocks for the 3D yard. Plants and buildings are made of many small parts
// (lumps, limbs, blades) merged into one mesh with vertex colors, so a whole tree is one
// draw call. Each part is shaded darker toward its bottom, which gives cheap self-shadowing.

type Template = { pos: Float32Array; nor: Float32Array; lift: Float32Array };

function template(g: THREE.BufferGeometry, jitter = 0, seed = 1, smooth = false): Template {
  let ng = g.index ? g.toNonIndexed() : g;
  if (jitter) {
    // Push each vertex in or out a little so lumps look grown rather than turned on a lathe.
    const p = ng.attributes.position as THREE.BufferAttribute;
    const seen = new Map<string, number>();
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      let k = seen.get(key);
      if (k === undefined) seen.set(key, (k = 1 + (rnd() - 0.5) * jitter));
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k);
    }
  }
  if (smooth) {
    // Shared normals across faces, so a lump of leaves reads round instead of cut.
    ng.deleteAttribute("normal");
    ng.deleteAttribute("uv");
    ng = mergeVertices(ng);
    ng.computeVertexNormals();
    ng = ng.toNonIndexed();
  } else ng.computeVertexNormals();
  ng.computeBoundingBox();
  const b = ng.boundingBox!;
  const pos = ng.attributes.position.array as Float32Array;
  const lift = new Float32Array(pos.length / 3);
  for (let i = 0; i < lift.length; i++) lift[i] = (pos[i * 3 + 1] - b.min.y) / (b.max.y - b.min.y || 1);
  return { pos, nor: ng.attributes.normal.array as Float32Array, lift };
}

const up = (g: THREE.BufferGeometry) => g.translate(0, 0.5, 0);

// Unit shapes. Cones, cylinders and blades stand on y = 0; lumps and balls are centered.
export const T = {
  lumps: [1, 2, 3, 4].map((i) => template(new THREE.IcosahedronGeometry(1, 1), 0.3, i * 977, true)),
  ball: template(new THREE.IcosahedronGeometry(1, 1)),
  bead: template(new THREE.IcosahedronGeometry(1, 0)),
  cone: template(up(new THREE.ConeGeometry(1, 1, 8))),
  limb: template(up(new THREE.CylinderGeometry(0.62, 1, 1, 6))),
  post: template(up(new THREE.CylinderGeometry(1, 1, 1, 8))),
  blade: template(up(new THREE.ConeGeometry(1, 1, 3))),
  box: template(new THREE.BoxGeometry(1, 1, 1)),
  disc: template(new THREE.CircleGeometry(1, 6).rotateX(-Math.PI / 2)),
};

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const s3 = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const col = new THREE.Color();
const nm = new THREE.Matrix3();

export type V3 = [number, number, number];

export class Kit {
  pos: number[] = [];
  nor: number[] = [];
  col: number[] = [];

  // A part from a matrix. `dark` is how much darker its bottom is than its top.
  addM(t: Template, m: THREE.Matrix4, color: THREE.ColorRepresentation, dark = 0.35) {
    col.set(color);
    nm.getNormalMatrix(m);
    const { pos, nor, lift } = t;
    const a = m.elements, b = nm.elements;
    const P = this.pos, N = this.nor, C = this.col;
    for (let i = 0, j = 0; i < lift.length; i++, j += 3) {
      const x = pos[j], y = pos[j + 1], z = pos[j + 2];
      P.push(a[0] * x + a[4] * y + a[8] * z + a[12], a[1] * x + a[5] * y + a[9] * z + a[13], a[2] * x + a[6] * y + a[10] * z + a[14]);
      const nx = nor[j], ny = nor[j + 1], nz = nor[j + 2];
      const ox = b[0] * nx + b[3] * ny + b[6] * nz, oy = b[1] * nx + b[4] * ny + b[7] * nz, oz = b[2] * nx + b[5] * ny + b[8] * nz;
      const l = Math.hypot(ox, oy, oz) || 1;
      N.push(ox / l, oy / l, oz / l);
      const k = 1 - dark * (1 - lift[i]);
      C.push(col.r * k, col.g * k, col.b * k);
    }
  }

  add(t: Template, color: THREE.ColorRepresentation, at: V3, scale: V3, rot: V3 = [0, 0, 0], dark?: number) {
    m4.compose(v.set(...at), q.setFromEuler(e.set(...rot)), s3.set(...scale));
    this.addM(t, m4, color, dark);
  }

  // A tapered limb from a to b, thickness r at its base.
  limb(a: THREE.Vector3, b: THREE.Vector3, r: number, color: THREE.ColorRepresentation, t = T.limb) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    q.setFromUnitVectors(Y, dir.divideScalar(len || 1));
    m4.compose(a, q, s3.set(r, len, r));
    this.addM(t, m4, color, 0.15);
  }

  // Any geometry, in place, in one color.
  addGeo(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, dark = 0) {
    this.addM(template(g), m4.identity(), color, dark);
  }

  get empty() {
    return this.pos.length === 0;
  }

  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

// One shared material for everything built with a Kit.
export const kitMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });

export function kitMesh(kit: Kit, shadow = true) {
  const m = new THREE.Mesh(kit.geometry(), kitMaterial);
  m.castShadow = shadow;
  m.receiveShadow = true;
  return m;
}

export function shade(hex: THREE.ColorRepresentation, amount: number) {
  const c = new THREE.Color(hex);
  return amount < 0 ? c.lerp(new THREE.Color("#1f2a1c"), -amount) : c.lerp(new THREE.Color("#fffbea"), amount);
}

// A color nudged a little in lightness and hue, so a bed of one plant isn't a flat swatch.
export function vary(hex: THREE.ColorRepresentation, rand: () => number, amount = 0.08) {
  const c = new THREE.Color(hex);
  c.offsetHSL((rand() - 0.5) * amount * 0.25, (rand() - 0.5) * amount, (rand() - 0.5) * amount);
  return c;
}

// ---------- textures ----------
// Small canvas textures, made once and kept: lawn with mowing stripes, mulch, gravel, pavers.

const textures = new Map<string, THREE.CanvasTexture>();

export type Finish = "lawn" | "speckle" | "pavers" | "slab" | "stones" | "snow";

export function surfaceTexture(color: string, finish: Finish, tileFt: number) {
  const key = `${color}:${finish}:${tileFt}`;
  let t = textures.get(key);
  if (t) return t;
  const n = 256;
  const cv = document.createElement("canvas");
  cv.width = cv.height = n;
  const g = cv.getContext("2d")!;
  g.fillStyle = color;
  g.fillRect(0, 0, n, n);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const dab = (light: number, alpha: number, size: number) => {
    g.fillStyle = light > 0 ? `rgba(255,252,235,${alpha})` : `rgba(20,24,12,${alpha})`;
    const x = rnd() * n, y = rnd() * n;
    g.fillRect(x, y, size, size * (0.6 + rnd()));
  };
  if (finish === "lawn") {
    // Two wide mowing stripes per tile, then fine blades.
    g.fillStyle = "rgba(255,255,230,0.07)";
    g.fillRect(0, 0, n, n / 4);
    g.fillRect(0, n / 2, n, n / 4);
    for (let i = 0; i < 5000; i++) dab(rnd() - 0.5, 0.07 + rnd() * 0.08, 1 + rnd() * 2);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(30,40,10,${0.015 + rnd() * 0.025})`;
      g.beginPath();
      g.arc(rnd() * n, rnd() * n, 8 + rnd() * 24, 0, Math.PI * 2);
      g.fill();
    }
  } else if (finish === "snow") {
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(90,104,80,${0.08 + rnd() * 0.16})`;
      g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 3, 2 + rnd() * 4);
    }
    for (let i = 0; i < 1500; i++) dab(1, 0.25, 1);
  } else if (finish === "speckle") {
    for (let i = 0; i < 4500; i++) dab(rnd() - 0.5, 0.12 + rnd() * 0.2, 1 + rnd() * 3);
  } else if (finish === "pavers" || finish === "slab") {
    const cells = finish === "pavers" ? 8 : 2;
    const w = n / cells;
    for (let y = 0; y < cells; y++)
      for (let x = 0; x < cells; x++) {
        g.fillStyle = `rgba(${rnd() > 0.5 ? "255,250,235" : "40,32,24"},${rnd() * 0.08})`;
        g.fillRect(x * w, y * w, w, w);
      }
    for (let i = 0; i < 2500; i++) dab(rnd() - 0.5, 0.06 + rnd() * 0.08, 1 + rnd() * 2);
    g.strokeStyle = "rgba(40,32,24,0.35)";
    g.lineWidth = finish === "pavers" ? 2 : 1.5;
    for (let i = 0; i <= cells; i++) {
      g.beginPath();
      g.moveTo(i * w, 0);
      g.lineTo(i * w, n);
      g.moveTo(0, i * w);
      g.lineTo(n, i * w);
      g.stroke();
    }
  } else if (finish === "stones") {
    for (let i = 0; i < 3000; i++) dab(rnd() - 0.5, 0.1 + rnd() * 0.15, 1 + rnd() * 2);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = "#cfc6b6";
      g.strokeStyle = "rgba(60,50,40,0.4)";
      g.beginPath();
      g.ellipse((i % 2) * (n / 2) + n / 4, Math.floor(i / 2) * (n / 2) + n / 4, n / 6, n / 7, rnd(), 0, Math.PI * 2);
      g.fill();
      g.stroke();
    }
  }
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tileFt, 1 / tileFt);
  t.anisotropy = 4;
  textures.set(key, t);
  return t;
}

// A soft dark spot, for contact shadows under plants.
let blot: THREE.CanvasTexture | null = null;
export function blotTexture() {
  if (blot) return blot;
  const n = 64;
  const cv = document.createElement("canvas");
  cv.width = cv.height = n;
  const g = cv.getContext("2d")!;
  const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grad.addColorStop(0, "rgba(0,0,0,1)");
  grad.addColorStop(0.55, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, n, n);
  blot = new THREE.CanvasTexture(cv);
  return blot;
}

// ---------- sky ----------
// A dome with a zenith-to-horizon gradient and a soft glow around the sun.
export function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; uniform vec3 sunColor;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 c = mix(horizon, top, pow(h, 0.55));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        c += sunColor * (pow(s, 600.0) * 1.2 + pow(s, 24.0) * 0.22 + pow(s, 4.0) * 0.06);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat);
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  return dome;
}
