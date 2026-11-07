import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { plantsById } from "../model/library";
import type { Plant } from "../model/plant";
import type { Point, Property } from "../model/property";
import { bounds } from "./geometry";
import { expand, lookOf, seasonOf, type Look, type ViewTime } from "./look";

// The yard as a small 3D model beside the plan. Plan feet map to scene units one to one:
// plan x is scene x, plan y is scene z, and heights go up the scene's y axis.
// It is rebuilt from the property on every change, which is cheap for a single lot.

export type Pick = { col: string; id: string };

type Options = {
  onPick?: (ref: Pick | null) => void;
};

const LAWN = { spring: "#8db25f", summer: "#7fa552", fall: "#a2a15d", winter: "#c9cbbd" } as const;
const SKY = { spring: "#dfecef", summer: "#d6e7f1", fall: "#ece5d8", winter: "#e3e7ea" } as const;
const SURFACE: Record<string, string> = {
  lawn: "#86a957",
  patio: "#c7b49a",
  path: "#d8cbb2",
  "stepping-stones": "#bcb2a2",
  gravel: "#cfc5b2",
  mulch: "#76563d",
  driveway: "#a7a39b",
  pond: "#5f93ab",
};
const STRUCTURE: Record<string, string> = { deck: "#a77b52", pergola: "#b48a5f", shed: "#9c6b4a", "raised-bed": "#8a6243" };
const FENCE = "#b9a88d";

export function createYard(container: HTMLElement, opts: Options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.className = "yard3d-canvas";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.06; // never under the ground
  controls.minDistance = 8;
  controls.screenSpacePanning = false; // pan slides along the ground
  controls.autoRotateSpeed = 1.2;

  const hemi = new THREE.HemisphereLight("#f4f7ff", "#6b6a4a", 1.3);
  const sun = new THREE.DirectionalLight("#fff4dc", 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(hemi, sun, sun.target);

  let world = new THREE.Group();
  scene.add(world);
  let lotSize = 100;
  let framedFor = "";
  let selected: Pick | null = null;
  let current: { property: Property; time: ViewTime } | null = null;

  // ---------- rendering on demand ----------
  // Draw now; keep drawing each frame only while the camera is still easing or spinning.
  let frame = 0;
  let rendering = false;
  const render = () => {
    frame = 0;
    rendering = true;
    const moving = controls.update();
    renderer.render(scene, camera);
    rendering = false;
    if (moving || controls.autoRotate) frame = requestAnimationFrame(render);
  };
  const invalidate = () => {
    if (!frame && !rendering) render();
  };
  controls.addEventListener("change", invalidate);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    invalidate();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  // ---------- picking ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const toNdc = (clientX: number, clientY: number) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  let center: Point = [0, 0];

  // The plan point (in feet) under a screen position, on the ground.
  function groundAt(clientX: number, clientY: number): Point | null {
    toNdc(clientX, clientY);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(ground, hit)) return null;
    return [Math.round((hit.x + center[0]) * 10) / 10, Math.round((hit.z + center[1]) * 10) / 10];
  }

  function pickAt(clientX: number, clientY: number): Pick | null {
    toNdc(clientX, clientY);
    for (const h of ray.intersectObjects(world.children, true)) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.ref) o = o.parent;
      if (o?.userData.ref) return o.userData.ref as Pick;
    }
    return null;
  }

  // A click (not a drag) selects what is under it.
  let downAt: [number, number] | null = null;
  const down = (e: PointerEvent) => (downAt = [e.clientX, e.clientY]);
  const up = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;
    downAt = null;
    opts.onPick?.(pickAt(e.clientX, e.clientY));
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointerup", up);

  // ---------- building the scene ----------
  const geo = {
    sphere: new THREE.IcosahedronGeometry(1, 2),
    blob: new THREE.IcosahedronGeometry(1, 1),
    cone: new THREE.ConeGeometry(1, 1, 10),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
    box: new THREE.BoxGeometry(1, 1, 1),
  };
  const mats = new Map<string, THREE.MeshStandardMaterial>();
  const mat = (color: string, flat = true) => {
    const key = color + flat;
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, flatShading: flat });
      mats.set(key, m);
    }
    return m;
  };
  const mesh = (g: THREE.BufferGeometry, color: string, shadow = true, flat = true) => {
    const m = new THREE.Mesh(g, mat(color, flat));
    m.castShadow = shadow;
    m.receiveShadow = true;
    return m;
  };

  const shapeOf = (outline: Point[]) => {
    const s = new THREE.Shape();
    outline.forEach(([x, y], i) => (i ? s.lineTo(x - center[0], -(y - center[1])) : s.moveTo(x - center[0], -(y - center[1]))));
    return s;
  };
  // A flat or raised slab from a plan outline.
  const slab = (outline: Point[], depth: number, color: string, lift = 0) => {
    const g = depth > 0 ? new THREE.ExtrudeGeometry(shapeOf(outline), { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(shapeOf(outline));
    g.rotateX(-Math.PI / 2);
    const m = mesh(g, color, depth > 0.5, true);
    m.position.y = lift;
    return m;
  };
  const at3 = ([x, y]: Point) => new THREE.Vector3(x - center[0], 0, y - center[1]);

  function build(property: Property, time: ViewTime) {
    world.remove(ring);
    scene.remove(world);
    world.traverse((o) => {
      if (o instanceof THREE.Mesh && !Object.values(geo).includes(o.geometry)) o.geometry.dispose();
      if (o instanceof THREE.Points) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    world = new THREE.Group();
    scene.add(world);

    const season = seasonOf(time.month);
    const lb = bounds(property.lot.outline);
    center = [lb.minX + lb.w / 2, lb.minY + lb.h / 2];
    lotSize = Math.max(lb.w, lb.h);
    scene.background = new THREE.Color(SKY[season]);
    scene.fog = new THREE.Fog(SKY[season], lotSize * 2.2, lotSize * 6);

    // Ground beyond the lot, then the lot itself.
    const outside = mesh(new THREE.CircleGeometry(lotSize * 6, 48).rotateX(-Math.PI / 2), shade(LAWN[season], 0.42), false);
    outside.position.y = -0.05;
    world.add(outside);
    world.add(slab(property.lot.outline, 0, LAWN[season], 0));

    property.surfaces.forEach((s, i) => {
      const m = slab(s.outline, s.kind === "patio" || s.kind === "driveway" ? 0.25 : 0.08, SURFACE[s.kind] ?? "#bbb", 0.01 + i * 0.002);
      m.userData.ref = { col: "surfaces", id: s.id };
      world.add(m);
    });

    // House: walls, then a roof slab with a small overhang so it reads as a building.
    const wallH = property.house.heightFt * 0.7;
    const house = new THREE.Group();
    house.add(slab(property.house.outline, wallH, "#e6dccb"));
    house.add(roof(property.house.outline, wallH, property.house.heightFt - wallH));
    house.userData.ref = { col: "house", id: "house" };
    world.add(house);

    for (const s of property.structures) {
      const g = new THREE.Group();
      const color = STRUCTURE[s.kind] ?? "#9c7b5a";
      if (s.kind === "pergola") {
        const b = bounds(s.outline);
        for (const [x, y] of s.outline) {
          const post = mesh(geo.box, color);
          post.scale.set(0.5, s.heightFt, 0.5);
          post.position.copy(at3([x, y])).setY(s.heightFt / 2);
          g.add(post);
        }
        for (let i = 0; i <= 6; i++) {
          const slat = mesh(geo.box, color);
          slat.scale.set(b.w, 0.3, 0.35);
          slat.position.copy(at3([b.minX + b.w / 2, b.minY + (b.h * i) / 6])).setY(s.heightFt);
          g.add(slat);
        }
      } else {
        g.add(slab(s.outline, s.kind === "shed" ? s.heightFt * 0.75 : s.heightFt, color));
        if (s.kind === "shed") g.add(roof(s.outline, s.heightFt * 0.75, s.heightFt * 0.25));
        if (s.kind === "raised-bed") g.add(slab(s.outline, 0.05, "#5d4330", s.heightFt - 0.1));
      }
      g.userData.ref = { col: "structures", id: s.id };
      world.add(g);
    }

    for (const f of property.fences) {
      const g = new THREE.Group();
      for (let i = 1; i < f.path.length; i++) {
        const a = at3(f.path[i - 1]), b = at3(f.path[i]);
        const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5), ang = Math.atan2(b.z - a.z, b.x - a.x);
        if (f.kind === "solid") {
          const wall = mesh(geo.box, FENCE);
          wall.scale.set(len, f.heightFt, 0.25);
          wall.position.copy(mid).setY(f.heightFt / 2);
          wall.rotation.y = -ang;
          g.add(wall);
        } else {
          for (const y of f.kind === "open" ? [f.heightFt * 0.35, f.heightFt * 0.9] : [0.4, f.heightFt * 0.5, f.heightFt * 0.95]) {
            const rail = mesh(geo.box, FENCE);
            rail.scale.set(len, f.kind === "open" ? 0.2 : 0.5, 0.15);
            rail.position.copy(mid).setY(y);
            rail.rotation.y = -ang;
            g.add(rail);
          }
        }
        // Posts every 8 ft.
        const n = Math.max(1, Math.round(len / 8));
        for (let j = 0; j <= n; j++) {
          const post = mesh(geo.box, shade(FENCE, -0.2));
          post.scale.set(0.4, f.heightFt + 0.3, 0.4);
          post.position.copy(a.clone().lerp(b, j / n)).setY((f.heightFt + 0.3) / 2);
          g.add(post);
        }
      }
      g.userData.ref = { col: "fences", id: f.id };
      world.add(g);
    }

    for (const e of property.edges) {
      const g = new THREE.Group();
      const h = e.kind === "seat-wall" ? 1.6 : 0.35;
      for (let i = 1; i < e.path.length; i++) {
        const a = at3(e.path[i - 1]), b = at3(e.path[i]);
        const len = a.distanceTo(b), ang = Math.atan2(b.z - a.z, b.x - a.x);
        const w = mesh(geo.box, e.kind === "seat-wall" ? "#c9bca6" : "#8d8478");
        w.scale.set(len, h, e.kind === "seat-wall" ? 1.2 : 0.3);
        w.position.copy(a.clone().add(b).multiplyScalar(0.5)).setY(h / 2);
        w.rotation.y = -ang;
        g.add(w);
      }
      g.userData.ref = { col: "edges", id: e.id };
      world.add(g);
    }

    for (const f of property.features) {
      const g = feature(f.kind);
      g.position.copy(at3(f.at));
      g.userData.ref = { col: "features", id: f.id };
      world.add(g);
    }

    // Plants, with flowers and berries gathered into one point cloud per color.
    const dots = new Map<string, number[]>();
    const dot = (color: string, v: THREE.Vector3) => {
      let a = dots.get(color);
      if (!a) dots.set(color, (a = []));
      a.push(v.x, v.y, v.z);
    };
    for (const pl of property.plantings) {
      const plant = plantsById.get(pl.plantId);
      if (!plant) continue;
      for (const inst of expand(pl, plant)) {
        const look = lookOf(plant, time, inst.existing, inst.scale);
        if (!look) continue;
        const { group, flowers, fruit } = plantModel(plant, look, inst.seed);
        const pos = at3(inst.at);
        group.position.copy(pos);
        group.userData.ref = { col: "plantings", id: pl.id };
        world.add(group);
        flowers.forEach((v, i) => dot(look.bloom![i % look.bloom!.length], v.add(pos)));
        fruit.forEach((v) => dot(look.fruit!, v.add(pos)));
      }
    }
    for (const [color, arr] of dots) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.55, sizeAttenuation: true }));
      // Points are positioned in world space already.
      world.add(pts);
    }

    // Sun from the south (toward plan +y when north is up), high in summer and low in winter.
    const elev = { summer: 62, spring: 48, fall: 40, winter: 26 }[season] * (Math.PI / 180);
    const az = ((property.headingDeg + 180 + 25) * Math.PI) / 180;
    const d = lotSize * 1.2;
    sun.position.set(Math.sin(az) * Math.cos(elev) * d, Math.sin(elev) * d, Math.cos(az) * Math.cos(elev) * d);
    sun.intensity = season === "winter" ? 1.8 : 2.4;
    const c = sun.shadow.camera;
    c.left = c.bottom = -lotSize * 0.8;
    c.right = c.top = lotSize * 0.8;
    c.near = 1;
    c.far = d * 3;
    c.updateProjectionMatrix();

    highlight();
  }

  // A roof slab that overhangs the walls a little, with a lighter cap, so it reads as a roof.
  function roof(outline: Point[], base: number, height: number) {
    const b = bounds(outline);
    const mid: Point = [b.minX + b.w / 2, b.minY + b.h / 2];
    const grow = (k: number) => outline.map(([x, y]) => [mid[0] + (x - mid[0]) * (1 + k / b.w), mid[1] + (y - mid[1]) * (1 + k / b.h)] as Point);
    const g = new THREE.Group();
    g.add(slab(grow(2.2), Math.max(0.8, height * 0.35), "#5e544d", base));
    g.add(slab(grow(0.6), 0.3, "#8a7f74", base + Math.max(0.8, height * 0.35)));
    return g;
  }

  function feature(kind: string) {
    const g = new THREE.Group();
    const add = (geom: THREE.BufferGeometry, color: string, s: [number, number, number], y: number) => {
      const m = mesh(geom, color);
      m.scale.set(...s);
      m.position.y = y;
      g.add(m);
    };
    if (kind === "birdbath") {
      add(geo.cyl, "#bdb6a8", [0.35, 2.4, 0.35], 1.2);
      add(geo.cyl, "#cfc8ba", [1.3, 0.25, 1.3], 2.5);
      add(geo.cyl, "#8fb4c9", [1.1, 0.05, 1.1], 2.65);
    } else if (kind === "fire-pit") {
      add(geo.cyl, "#7c746b", [2.2, 0.9, 2.2], 0.45);
      add(geo.cyl, "#3d3631", [1.7, 0.05, 1.7], 0.92);
    } else if (kind === "bench") {
      add(geo.box, "#9b744f", [5, 0.3, 1.5], 1.5);
      add(geo.box, "#7d5d40", [0.3, 1.5, 1.3], 0.75);
      g.children[1].position.x = -2.1;
      add(geo.box, "#7d5d40", [0.3, 1.5, 1.3], 0.75);
      g.children[2].position.x = 2.1;
    } else if (kind === "feeder") {
      add(geo.cyl, "#5f564d", [0.15, 5, 0.15], 2.5);
      add(geo.box, "#b08a5c", [0.9, 0.9, 0.9], 5.2);
    } else {
      add(geo.cyl, "#8fb4c9", [2.4, 0.15, 2.4], 0.08);
      add(geo.sphere, "#a9a297", [0.7, 0.9, 0.7], 0.6);
    }
    return g;
  }

  // ---------- plants ----------
  function plantModel(plant: Plant, look: Look, seed: number) {
    const g = new THREE.Group();
    const r = look.spreadFt / 2, h = look.heightFt;
    const rand = mulberry(seed);
    const leaf = look.foliage;
    const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const flowers: THREE.Vector3[] = [];
    const fruit: THREE.Vector3[] = [];
    // Points scattered over the upper, outer surface of an ellipsoid.
    const onSurface = (cy: number, rx: number, ry: number, n: number, out: THREE.Vector3[]) => {
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, up = 0.15 + rand() * 0.85;
        const k = Math.sqrt(1 - up * up);
        out.push(local(Math.cos(a) * k * rx * 1.02, cy + up * ry * 1.02, Math.sin(a) * k * rx * 1.02));
      }
    };

    switch (plant.render.form) {
      case "canopy": {
        const trunkH = h * 0.38;
        const tw = Math.max(0.35, r * 0.07);
        const trunk = mesh(geo.cyl, "#6b5a4b");
        trunk.scale.set(tw, trunkH + h * 0.2, tw);
        trunk.position.y = (trunkH + h * 0.2) / 2;
        g.add(trunk);
        const cy = trunkH + (h - trunkH) / 2;
        if (leaf) {
          // A crown of overlapping lumps, so it reads as foliage rather than a ball.
          const lumps = 7;
          for (let i = 0; i < lumps; i++) {
            const a = (i / lumps) * Math.PI * 2 + rand();
            const off = i === 0 ? 0 : 0.42;
            const b = mesh(geo.blob, shade(leaf, (rand() - 0.5) * 0.25));
            const s = i === 0 ? 0.75 : 0.5 + rand() * 0.15;
            b.scale.set(r * s, ((h - trunkH) / 2) * s * 1.05, r * s);
            b.position.set(Math.cos(a) * r * off, cy + (i === 0 ? 0 : (rand() - 0.3) * (h - trunkH) * 0.3), Math.sin(a) * r * off);
            b.rotation.set(rand(), rand(), rand());
            g.add(b);
          }
        } else {
          // Bare branches.
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 + rand() * 0.5;
            const br = mesh(geo.cyl, "#6b5a4b");
            const len = (h - trunkH) * 0.7;
            br.scale.set(tw * 0.35, len, tw * 0.35);
            br.position.set(Math.cos(a) * r * 0.25, trunkH + len * 0.45, Math.sin(a) * r * 0.25);
            br.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
            g.add(br);
          }
        }
        if (look.bloom) onSurface(cy - (h - trunkH) * 0.15, r * 0.8, (h - trunkH) / 2, leaf ? 140 : 220, flowers);
        if (look.fruit) onSurface(cy - (h - trunkH) * 0.15, r * 0.85, (h - trunkH) / 2, 80, fruit);
        break;
      }
      case "columnar": {
        const c = mesh(geo.cone, leaf ?? "#3d6b3e");
        c.scale.set(r, h * 0.97, r);
        c.position.y = h * 0.5 + h * 0.03;
        g.add(c);
        break;
      }
      case "grass": {
        const c = mesh(geo.cyl, leaf ?? "#b9a07a");
        c.geometry = new THREE.CylinderGeometry(1, 0.35, 1, 9, 1, true);
        c.scale.set(r, h, r);
        c.position.y = h / 2;
        g.add(c);
        if (look.bloom || look.fruit) onSurface(h * 0.8, r, h * 0.2, 40, look.fruit ? fruit : flowers);
        break;
      }
      case "mat": {
        const m = mesh(geo.sphere, leaf ?? "#6c8f4c");
        m.scale.set(r, Math.max(0.25, h), r);
        g.add(m);
        if (look.bloom) onSurface(0, r, Math.max(0.25, h), 60, flowers);
        break;
      }
      case "rosette": {
        const m = mesh(geo.sphere, leaf ?? "#5a8a48");
        m.scale.set(r, h * 0.6, r);
        g.add(m);
        if (look.bloom) onSurface(h * 0.4, r * 0.5, h * 0.5, 18, flowers);
        break;
      }
      default: {
        // Mounds (shrubs) and upright perennials.
        const upright = plant.render.form === "upright";
        const color = leaf ?? "#6b5a4b";
        const m = mesh(geo.blob, leaf ? color : shade("#6b5a4b", 0.2));
        m.scale.set(r, upright ? h * 0.42 : h / 2, r);
        m.position.y = upright ? h * 0.38 : h / 2;
        if (!leaf) m.scale.multiplyScalar(0.9);
        g.add(m);
        const cy = upright ? h * 0.38 : h / 2;
        if (look.bloom) onSurface(cy, r, upright ? h * 0.6 : h / 2, upright ? 24 : 60, flowers);
        if (look.fruit) onSurface(cy, r, h / 2, 70, fruit);
      }
    }
    // Flower and berry points in the plant's own space; the caller adds them to shared clouds.
    return { group: g, flowers, fruit };
  }

  // ---------- selection highlight ----------
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1, 48).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: "#b0457a", transparent: true, opacity: 0.9, depthTest: false }),
  );
  ring.renderOrder = 10;
  function highlight() {
    world.remove(ring);
    if (!selected) return;
    const target = world.children.find((o) => o.userData.ref?.col === selected!.col && o.userData.ref?.id === selected!.id);
    if (!target) return;
    const box = new THREE.Box3();
    world.children.filter((o) => o.userData.ref?.col === selected!.col && o.userData.ref?.id === selected!.id).forEach((o) => box.expandByObject(o));
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const rr = Math.max(size.x, size.z) / 2 + 1;
    ring.scale.set(rr, 1, rr);
    ring.position.set(mid.x, 0.3, mid.z);
    world.add(ring);
  }

  // ---------- camera ----------
  function frameView() {
    // Back off further in a tall, narrow pane so the whole lot still fits across.
    const d = lotSize * 1.3 * Math.max(1, 0.8 / Math.max(0.3, camera.aspect));
    camera.position.set(-d * 0.5, d * 0.52, d * 1.0);
    controls.target.set(0, 0, 0);
    controls.maxDistance = lotSize * 4;
    controls.update();
    invalidate();
  }

  return {
    update(property: Property, time: ViewTime, sel: Pick | null) {
      selected = sel;
      const changed = !current || current.property !== property || current.time.month !== time.month || current.time.year !== time.year;
      current = { property, time };
      if (changed) build(property, time);
      else highlight();
      if (framedFor !== property.id) {
        framedFor = property.id;
        resize();
        frameView();
      }
      invalidate();
    },
    groundAt,
    resetView: frameView,
    setSpin(on: boolean) {
      controls.autoRotate = on;
      invalidate();
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function mulberry(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shade(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  return amount < 0 ? `#${c.lerp(new THREE.Color("#1f2a1c"), -amount).getHexString()}` : `#${c.lerp(new THREE.Color("#fffbea"), amount).getHexString()}`;
}
