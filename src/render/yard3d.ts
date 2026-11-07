import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { plantsById } from "../model/library";
import type { Point, Property } from "../model/property";
import { bounds, centroid, inside, rng } from "./geometry";
import { expand, hasGroundSnow, lookOf, seasonOf, type ViewTime } from "./look";
import { feature, house, hipRoof, slabGeo, type Frame } from "./yard3d-built";
import { blotTexture, Kit, kitMaterial, kitMesh, shade, skyDome, surfaceTexture, T, vary, type Finish } from "./yard3d-kit";
import { plantParts, type Spot } from "./yard3d-plants";

// The yard as a small 3D model beside the plan. Plan feet map to scene units one to one:
// plan x is scene x, plan y is scene z, and heights go up the scene's y axis.
// It is rebuilt from the property on every change, which is cheap for a single lot.

export type Pick = { col: string; id: string };
export type CameraView = "overview" | "top" | "eye";

type Options = {
  onPick?: (ref: Pick | null) => void;
  onHover?: (ref: Pick | null, clientX: number, clientY: number) => void;
};

type Season = ReturnType<typeof seasonOf>;

// Light and color per season. Winter has a light snow cover in December and January.
const SEASON: Record<Season, { top: string; horizon: string; lawn: string; sun: string; elev: number; sunI: number; hemi: number }> = {
  spring: { top: "#7fb0d8", horizon: "#e4eef0", lawn: "#86ad58", sun: "#fff3dc", elev: 50, sunI: 2.7, hemi: 1.15 },
  summer: { top: "#6aa3d6", horizon: "#e2edf2", lawn: "#77a14c", sun: "#fff1d6", elev: 62, sunI: 2.9, hemi: 1.1 },
  fall: { top: "#86a9c9", horizon: "#f0e6d6", lawn: "#94a05a", sun: "#ffe2b8", elev: 38, sunI: 2.6, hemi: 1.05 },
  winter: { top: "#9fb4c8", horizon: "#e9edf0", lawn: "#e8ecee", sun: "#fff0e0", elev: 26, sunI: 2.1, hemi: 1.25 },
};

const SURFACE: Record<string, { color: string; finish: Finish; tile: number; depth: number; snow: boolean }> = {
  lawn: { color: "#86a957", finish: "lawn", tile: 24, depth: 0.05, snow: true },
  patio: { color: "#c9b79c", finish: "pavers", tile: 16, depth: 0.3, snow: false },
  path: { color: "#d8cbb2", finish: "speckle", tile: 10, depth: 0.12, snow: false },
  "stepping-stones": { color: "#a9a493", finish: "stones", tile: 5, depth: 0.1, snow: true },
  gravel: { color: "#cfc5b2", finish: "speckle", tile: 6, depth: 0.1, snow: true },
  mulch: { color: "#6f5039", finish: "speckle", tile: 6, depth: 0.16, snow: true },
  driveway: { color: "#aaa69e", finish: "slab", tile: 20, depth: 0.25, snow: false },
  pond: { color: "#3f7590", finish: "speckle", tile: 30, depth: 0.02, snow: false },
};
const STRUCTURE: Record<string, string> = { deck: "#a77b52", pergola: "#b48a5f", shed: "#9c6b4a", "raised-bed": "#8a6243" };
const FENCE = "#b9a88d";
const SNOW = "#eef2f4";

export function createYard(container: HTMLElement, opts: Options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  renderer.domElement.className = "yard3d-canvas";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 6000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.04; // never under the ground
  controls.minDistance = 6;
  controls.screenSpacePanning = false; // pan slides along the ground
  controls.autoRotateSpeed = 1.2;

  const hemi = new THREE.HemisphereLight("#f4f7ff", "#6b6a4a", 1.1);
  const sun = new THREE.DirectionalLight("#fff4dc", 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.5;
  const sky = skyDome();
  scene.add(hemi, sun, sun.target, sky);

  let world = new THREE.Group();
  scene.add(world);
  let lotSize = 100;
  let framedFor = "";
  let selected: Pick | null = null;
  let hovered: Pick | null = null;
  let current: { property: Property; time: ViewTime } | null = null;
  // Which way the garden faces from the house, so the first view looks at the plants.
  let facing = new THREE.Vector2(0, 1);
  // Where plants stand (scene x, z, radius) and the lot outline, so eye level can stand clear.
  let standing: [number, number, number][] = [];
  let lotOutline: Point[] = [];

  // ---------- rendering on demand ----------
  // Draw now; keep drawing each frame only while the camera is easing, flying or spinning.
  let frame = 0;
  let rendering = false;
  let flight: { from: THREE.Vector3; to: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3; start: number; ms: number } | null = null;
  const render = () => {
    frame = 0;
    rendering = true;
    if (flight) {
      const k = Math.min(1, (performance.now() - flight.start) / flight.ms);
      const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(flight.from, flight.to, e);
      controls.target.lerpVectors(flight.fromT, flight.toT, e);
      if (k >= 1) flight = null;
    }
    const moving = controls.update();
    sky.position.copy(camera.position);
    // Haze starts just past the lot however far back the camera stands.
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.near = camera.position.distanceTo(controls.target) + lotSize * 0.45;
      scene.fog.far = scene.fog.near + lotSize * 2.6;
    }
    renderer.render(scene, camera);
    rendering = false;
    if (moving || controls.autoRotate || flight) frame = requestAnimationFrame(render);
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
  const frameOf: Frame = { center: [0, 0] };

  // The plan point (in feet) under a screen position, on the ground.
  function groundAt(clientX: number, clientY: number): Point | null {
    toNdc(clientX, clientY);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(ground, hit)) return null;
    return [Math.round((hit.x + frameOf.center[0]) * 10) / 10, Math.round((hit.z + frameOf.center[1]) * 10) / 10];
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
  // Hover names what is under the pointer, checked at most once a frame and never mid-drag.
  let hoverFrame = 0;
  const move = (e: PointerEvent) => {
    if (e.buttons || hoverFrame) return;
    const { clientX, clientY } = e;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      const ref = pickAt(clientX, clientY);
      renderer.domElement.style.cursor = ref ? "pointer" : "";
      if (ref?.col !== hovered?.col || ref?.id !== hovered?.id) {
        hovered = ref;
        ringOn(hoverRing, hovered && !same(hovered, selected) ? hovered : null);
        invalidate();
      }
      opts.onHover?.(ref, clientX, clientY);
    });
  };
  const leave = () => {
    hovered = null;
    ringOn(hoverRing, null);
    renderer.domElement.style.cursor = "";
    opts.onHover?.(null, 0, 0);
    invalidate();
  };
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerleave", leave);

  // ---------- materials made once ----------
  const surfaceMats = new Map<string, THREE.MeshStandardMaterial>();
  const surfaceMat = (color: string, finish: Finish, tile: number, rough = 0.95) => {
    const key = `${color}:${finish}:${tile}:${rough}`;
    let m = surfaceMats.get(key);
    if (!m) surfaceMats.set(key, (m = new THREE.MeshStandardMaterial({ color: "#ffffff", map: surfaceTexture(color, finish, tile), roughness: rough, metalness: 0 })));
    return m;
  };
  const water = new THREE.MeshStandardMaterial({ color: "#3d7390", roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.92 });
  const glassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.18, metalness: 0.35, flatShading: true });
  const spotMat = new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true });
  const litterMat = new THREE.MeshStandardMaterial({ roughness: 0.95, side: THREE.DoubleSide });
  const blotMat = new THREE.MeshBasicMaterial({ color: "#1d2412", map: blotTexture(), transparent: true, opacity: 0.38, depthWrite: false });
  const spotGeo = new THREE.IcosahedronGeometry(1, 0);
  const litterGeo = new THREE.CircleGeometry(1, 5).rotateX(-Math.PI / 2);
  const blotGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);

  // Plant geometry by look, kept across rebuilds: most month changes reuse every plant.
  const plantCache = new Map<string, { geo: THREE.BufferGeometry | null; spots: Spot[]; litter: Spot[]; radius: number }>();

  const at3 = ([x, y]: Point) => new THREE.Vector3(x - frameOf.center[0], 0, y - frameOf.center[1]);

  function surfaceMesh(outline: Point[], depth: number, lift: number, mat: THREE.Material) {
    const m = new THREE.Mesh(slabGeo(outline, frameOf, depth, lift), mat);
    m.receiveShadow = true;
    return m;
  }

  // Many small spots (flowers, berries, leaves, contact shadows) as one instanced mesh.
  function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, spots: Spot[], flat: boolean) {
    const im = new THREE.InstancedMesh(geo, mat, spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler(), c = new THREE.Color();
    const rand = rng(spots.length + 11);
    spots.forEach((p, i) => {
      q.setFromEuler(e.set(flat ? (rand() - 0.5) * 0.3 : rand() * 3, rand() * 6, flat ? (rand() - 0.5) * 0.3 : rand() * 3));
      im.setMatrixAt(i, m.compose(p.at, q, s.set(p.size, flat ? 1 : p.size, p.size)));
      im.setColorAt(i, c.set(p.color));
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    return im;
  }

  function build(property: Property, time: ViewTime) {
    world.remove(selRing, hoverRing);
    scene.remove(world);
    world.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
        if (!o.userData.cached && o.geometry !== spotGeo && o.geometry !== litterGeo && o.geometry !== blotGeo) o.geometry.dispose();
        if (o instanceof THREE.InstancedMesh) o.dispose();
      }
    });
    world = new THREE.Group();
    scene.add(world);
    if (plantCache.size > 4000) {
      plantCache.forEach((p) => p.geo?.dispose());
      plantCache.clear();
    }

    const season = seasonOf(time.month);
    const snow = hasGroundSnow(time.month);
    // Late winter without snow shows dormant, straw-colored grass.
    const look = season === "winter" && !snow ? { ...SEASON.winter, lawn: "#b3b089" } : SEASON[season];
    const lb = bounds(property.lot.outline);
    frameOf.center = [lb.minX + lb.w / 2, lb.minY + lb.h / 2];
    lotSize = Math.max(lb.w, lb.h);

    // Sky, fog and light.
    const skyMat = sky.material as THREE.ShaderMaterial;
    skyMat.uniforms.top.value.set(look.top);
    skyMat.uniforms.horizon.value.set(look.horizon);
    skyMat.uniforms.sunColor.value.set(look.sun);
    sky.scale.setScalar(4000);
    scene.background = new THREE.Color(look.horizon);
    scene.fog = new THREE.Fog(look.horizon, lotSize * 1.5, lotSize * 4);
    hemi.color.set(look.top).lerp(new THREE.Color("#ffffff"), 0.55);
    hemi.groundColor.set(shade(look.lawn, -0.35));
    hemi.intensity = look.hemi;

    // Ground beyond the lot, the lot, then each surface on top.
    const lawnFinish: Finish = snow ? "snow" : "lawn";
    const outside = new THREE.Mesh(new THREE.CircleGeometry(lotSize * 7, 64).rotateX(-Math.PI / 2), surfaceMat(`#${(snow ? new THREE.Color(look.lawn) : shade(look.lawn, -0.1).lerp(new THREE.Color(look.horizon), 0.25)).getHexString()}`, lawnFinish, 40));
    outside.position.y = -0.05;
    outside.receiveShadow = true;
    world.add(outside);
    world.add(surfaceMesh(property.lot.outline, 0, 0, surfaceMat(look.lawn, lawnFinish, 24)));

    const pondRim = new Kit();
    property.surfaces.forEach((s, i) => {
      const k = SURFACE[s.kind] ?? SURFACE.gravel;
      const lift = 0.01 + i * 0.002;
      const color = snow && k.snow ? `#${new THREE.Color(k.color).lerp(new THREE.Color(SNOW), 0.75).getHexString()}` : s.kind === "lawn" ? look.lawn : k.color;
      let m: THREE.Mesh;
      if (s.kind === "pond") {
        m = surfaceMesh(s.outline, 0, 0.06, snow ? surfaceMat("#cfdde4", "speckle", 10, 0.3) : water);
        // Stones around the edge.
        const rand = rng(i + 101);
        for (let j = 0; j < s.outline.length; j++) {
          const a = at3(s.outline[j]), b = at3(s.outline[(j + 1) % s.outline.length]);
          const n = Math.ceil(a.distanceTo(b) / 1.3);
          for (let t = 0; t < n; t++) {
            const p = a.clone().lerp(b, t / n);
            const sz = 0.45 + rand() * 0.35;
            pondRim.add(T.lumps[t % 4], vary(snow ? "#dfe5e8" : "#9c968a", rand, 0.12), [p.x, 0.15, p.z], [sz, sz * 0.6, sz], [rand(), rand() * 6, rand()], 0.3);
          }
        }
      } else {
        m = surfaceMesh(s.outline, k.depth, lift, surfaceMat(color, k.finish, k.tile));
        m.castShadow = k.depth > 0.2;
      }
      m.userData.ref = { col: "surfaces", id: s.id };
      world.add(m);
    });
    if (!pondRim.empty) world.add(kitMesh(pondRim));

    // House: walls with windows and a door, under a hip roof.
    const roofColor = snow ? SNOW : "#5f5650";
    const walls = new Kit(), glass = new Kit();
    const path = property.surfaces.find((s) => s.kind === "path") ?? property.surfaces.find((s) => s.kind === "patio");
    house(walls, glass, property.house.outline, frameOf, property.house.heightFt, roofColor, path ? centroid(path.outline) : null);
    const home = new THREE.Group();
    home.add(kitMesh(walls));
    const gm = new THREE.Mesh(glass.geometry(), glassMat);
    home.add(gm);
    home.userData.ref = { col: "house", id: "house" };
    world.add(home);

    for (const s of property.structures) {
      const kit = new Kit();
      const color = STRUCTURE[s.kind] ?? "#9c7b5a";
      if (s.kind === "pergola") {
        const b = bounds(s.outline);
        for (const p of s.outline) {
          const v = at3(p);
          kit.add(T.box, color, [v.x, s.heightFt / 2, v.z], [0.55, s.heightFt, 0.55]);
        }
        for (let i = 0; i <= 8; i++) {
          const v = at3([b.minX + b.w / 2, b.minY + (b.h * i) / 8]);
          kit.add(T.box, shade(color, 0.08), [v.x, s.heightFt + 0.2, v.z], [b.w + 1.5, 0.35, 0.3]);
        }
      } else if (s.kind === "shed") {
        const wallH = s.heightFt * 0.7;
        kit.addGeo(slabGeo(s.outline, frameOf, wallH, 0), color, 0.15);
        hipRoof(kit, s.outline, frameOf, wallH, s.heightFt - wallH, snow ? SNOW : "#5f5650", 0.8, 0.6);
      } else {
        kit.addGeo(slabGeo(s.outline, frameOf, s.heightFt, 0), color, 0.2);
        if (s.kind === "raised-bed") kit.addGeo(slabGeo(s.outline, frameOf, 0.05, s.heightFt - 0.12), snow ? SNOW : "#4a3526");
      }
      const m = kitMesh(kit);
      m.userData.ref = { col: "structures", id: s.id };
      world.add(m);
    }

    for (const f of property.fences) {
      const kit = new Kit();
      const rand = rng(f.path.length * 7 + 3);
      for (let i = 1; i < f.path.length; i++) {
        const a = at3(f.path[i - 1]), b = at3(f.path[i]);
        const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5), ang = -Math.atan2(b.z - a.z, b.x - a.x);
        const dir = b.clone().sub(a).normalize();
        if (f.kind === "solid") {
          // Board by board, so the fence has a grain.
          const n = Math.max(1, Math.round(len / 0.5));
          for (let j = 0; j < n; j++) {
            const p = a.clone().addScaledVector(dir, (j + 0.5) * (len / n));
            kit.add(T.box, vary(FENCE, rand, 0.06), [p.x, f.heightFt / 2, p.z], [len / n - 0.04, f.heightFt - rand() * 0.15, 0.18], [0, ang, 0], 0.2);
          }
        } else {
          for (const y of f.kind === "open" ? [f.heightFt * 0.35, f.heightFt * 0.9] : [0.4, f.heightFt * 0.5, f.heightFt * 0.95]) {
            kit.add(T.box, FENCE, [mid.x, y, mid.z], [len, f.kind === "open" ? 0.2 : 0.45, 0.15], [0, ang, 0], 0.1);
          }
        }
        // Posts every 8 ft.
        const n = Math.max(1, Math.round(len / 8));
        for (let j = 0; j <= n; j++) {
          const p = a.clone().lerp(b, j / n);
          kit.add(T.box, shade(FENCE, -0.22), [p.x, (f.heightFt + 0.3) / 2, p.z], [0.4, f.heightFt + 0.3, 0.4], [0, ang, 0], 0.2);
        }
      }
      const m = kitMesh(kit);
      m.userData.ref = { col: "fences", id: f.id };
      world.add(m);
    }

    for (const e of property.edges) {
      const kit = new Kit();
      const h = e.kind === "seat-wall" ? 1.6 : 0.35;
      for (let i = 1; i < e.path.length; i++) {
        const a = at3(e.path[i - 1]), b = at3(e.path[i]);
        const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
        kit.add(T.box, e.kind === "seat-wall" ? "#c9bca6" : "#8d8478", [mid.x, h / 2, mid.z], [len, h, e.kind === "seat-wall" ? 1.2 : 0.3], [0, -Math.atan2(b.z - a.z, b.x - a.x), 0], 0.25);
      }
      const m = kitMesh(kit);
      m.userData.ref = { col: "edges", id: e.id };
      world.add(m);
    }

    for (const f of property.features) {
      const kit = new Kit();
      const v = at3(f.at);
      feature(kit, f.kind, [v.x, 0, v.z]);
      const m = kitMesh(kit);
      m.userData.ref = { col: "features", id: f.id };
      world.add(m);
    }

    // Plants: each one is one mesh; flowers, fallen leaves and contact shadows are shared.
    const spots: Spot[] = [], litter: Spot[] = [], blots: Spot[] = [];
    const sum = new THREE.Vector2();
    let count = 0;
    standing = [];
    lotOutline = property.lot.outline;
    for (const pl of property.plantings) {
      const plant = plantsById.get(pl.plantId);
      if (!plant) continue;
      for (const inst of expand(pl, plant)) {
        const lk = lookOf(plant, time, inst.existing, inst.scale);
        if (!lk) continue;
        const pos = at3(inst.at);
        sum.x += pos.x;
        sum.y += pos.z;
        count++;
        const key = `${plant.id}|${inst.seed}|${lk.spreadFt.toFixed(1)}|${lk.heightFt.toFixed(1)}|${lk.foliage}|${lk.bloom}|${lk.fruit}|${snow}`;
        let parts = plantCache.get(key);
        if (!parts) {
          const p = plantParts(plant, lk, inst.seed, snow);
          plantCache.set(key, (parts = { geo: p.kit.empty ? null : p.kit.geometry(), spots: p.spots, litter: p.litter, radius: p.radius }));
        }
        if (parts.geo) {
          const m = new THREE.Mesh(parts.geo, kitMaterial);
          m.castShadow = m.receiveShadow = true;
          m.userData.cached = true;
          m.position.copy(pos);
          m.userData.ref = { col: "plantings", id: pl.id };
          world.add(m);
        }
        for (const s of parts.spots) spots.push({ ...s, at: s.at.clone().add(pos) });
        for (const s of parts.litter) litter.push({ ...s, at: s.at.clone().add(pos).setY(0.2) });
        standing.push([pos.x, pos.z, lk.spreadFt / 2]);
        if (lk.foliage) blots.push({ at: pos.clone().setY(0.19), size: parts.radius * 1.15 + 0.3, color: "#000000" });
      }
    }
    if (spots.length) world.add(instanced(spotGeo, spotMat, spots, false));
    if (litter.length) world.add(instanced(litterGeo, litterMat, litter, true));
    if (blots.length) {
      const b = instanced(blotGeo, blotMat, blots, true);
      b.renderOrder = 1;
      world.add(b);
    }
    // The first view stands on the planted side of the house, looking back at it.
    const hc = centroid(property.house.outline);
    const toGarden = new THREE.Vector2(count ? sum.x / count : 0, count ? sum.y / count : 1).sub(new THREE.Vector2(hc[0] - frameOf.center[0], hc[1] - frameOf.center[1]));
    facing = toGarden.lengthSq() > 1 ? toGarden.normalize() : new THREE.Vector2(0, 1);

    world.add(neighborhood(season, property.lot.outline, snow));

    // Sun from the south (toward plan +y when north is up), high in summer and low in winter.
    const elev = look.elev * (Math.PI / 180);
    const az = ((property.headingDeg + 180 + 25) * Math.PI) / 180;
    const d = lotSize * 1.2;
    sun.position.set(Math.sin(az) * Math.cos(elev) * d, Math.sin(elev) * d, Math.cos(az) * Math.cos(elev) * d);
    sun.color.set(look.sun);
    sun.intensity = look.sunI;
    skyMat.uniforms.sunDir.value.copy(sun.position).normalize();
    const c = sun.shadow.camera;
    c.left = c.bottom = -lotSize * 0.75;
    c.right = c.top = lotSize * 0.75;
    c.near = 1;
    c.far = d * 3;
    c.updateProjectionMatrix();

    highlight();
  }

  // Trees on the neighboring lots, past the fence line, so the yard sits in a place and
  // the horizon isn't bare. They fade into the fog and can't be picked.
  function neighborhood(season: Season, lot: Point[], snow: boolean) {
    const kit = new Kit();
    const rand = rng(lot.length * 131 + Math.round(lotSize));
    const leafy: Record<Season, string[]> = {
      spring: ["#7fa653", "#8db35f", "#6d9548"],
      summer: ["#5d7f3e", "#4f7337", "#6a8a45"],
      fall: ["#c0612b", "#d9a43a", "#8f3b2a", "#7d7f3a", "#b8822f"],
      winter: [],
    };
    const n = 38;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand() * 0.12;
      const dist = lotSize * (1.55 + rand() * 1.6);
      const x = Math.cos(a) * dist, z = Math.sin(a) * dist;
      const h = 24 + rand() * 26, r = h * (0.3 + rand() * 0.12);
      const evergreen = rand() < 0.25;
      if (evergreen) {
        for (let t = 0; t < 3; t++) kit.add(T.cone, vary("#3f5f3a", rand, 0.1), [x, h * t * 0.22, z], [r * 0.62 * (1 - t * 0.22), h * (1 - t * 0.22), r * 0.62 * (1 - t * 0.22)], [0, rand() * 3, 0], 0.4);
        if (snow) kit.add(T.cone, SNOW, [x, h * 0.45, z], [r * 0.32, h * 0.5, r * 0.32], [0, 0, 0], 0.1);
        continue;
      }
      kit.add(T.limb, "#5f5044", [x, 0, z], [r * 0.1, h * 0.55, r * 0.1]);
      const colors = leafy[season];
      if (!colors.length) {
        for (let j = 0; j < 4; j++) {
          const b = (j / 4) * Math.PI * 2 + rand();
          kit.limb(new THREE.Vector3(x, h * 0.4, z), new THREE.Vector3(x + Math.cos(b) * r * 0.6, h * (0.85 + rand() * 0.15), z + Math.sin(b) * r * 0.6), r * 0.05, "#6a5b4e");
        }
        continue;
      }
      const base = colors[Math.floor(rand() * colors.length)];
      for (let j = 0; j < 5; j++) {
        const b = rand() * Math.PI * 2, o = j ? r * 0.45 : 0;
        const s = r * (j ? 0.55 : 0.75);
        kit.add(T.lumps[j % 4], vary(base, rand, 0.1), [x + Math.cos(b) * o, h * 0.62 + (rand() - 0.3) * h * 0.2, z + Math.sin(b) * o], [s, s * 0.9, s], [rand(), rand(), rand()], 0.45);
      }
    }
    return kitMesh(kit, false);
  }

  // ---------- selection and hover rings ----------
  const ringMesh = (color: string, opacity: number) => {
    const m = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, toneMapped: false }),
    );
    m.renderOrder = 10;
    return m;
  };
  const selRing = ringMesh("#b0457a", 0.95);
  const hoverRing = ringMesh("#ffffff", 0.75);
  const same = (a: Pick | null, b: Pick | null) => !!a && !!b && a.col === b.col && a.id === b.id;

  function ringOn(ring: THREE.Mesh, pick: Pick | null) {
    world.remove(ring);
    if (!pick) return;
    const parts = world.children.filter((o) => same(o.userData.ref, pick));
    if (!parts.length) return;
    const box = new THREE.Box3();
    parts.forEach((o) => box.expandByObject(o));
    const size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const rr = Math.max(size.x, size.z) / 2 + 1;
    ring.scale.set(rr, 1, rr);
    ring.position.set(mid.x, 0.35, mid.z);
    world.add(ring);
  }
  function highlight() {
    ringOn(selRing, selected);
    ringOn(hoverRing, hovered && !same(hovered, selected) ? hovered : null);
  }

  // ---------- camera ----------
  // Where each named view puts the camera, around the lot's center.
  function viewOf(kind: CameraView) {
    const fit = Math.max(1, 0.8 / Math.max(0.3, camera.aspect));
    const f = new THREE.Vector3(facing.x, 0, facing.y);
    const side = new THREE.Vector3(-f.z, 0, f.x);
    // Straight down with north up, like the plan.
    if (kind === "top") return { pos: new THREE.Vector3(0, lotSize * 1.55 * fit, 0.01), target: new THREE.Vector3() };
    if (kind === "eye") {
      // Standing in the garden at eye height, in the clearest spot out toward the planted
      // side, looking back across the beds at the house.
      const c = frameOf.center;
      let best = new THREE.Vector3(f.x * lotSize * 0.3, 5.5, f.z * lotSize * 0.3), bestScore = -Infinity;
      for (let i = 0; i < 9; i++)
        for (const k of [0.5, 0.44, 0.38, 0.3]) {
          const a = Math.atan2(f.z, f.x) + (i - 4) * 0.16;
          const x = Math.cos(a) * lotSize * k, z = Math.sin(a) * lotSize * k;
          if (!inside([x + c[0], z + c[1]], lotOutline)) continue;
          const room = Math.min(40, ...standing.map(([px, pz, r]) => Math.hypot(px - x, pz - z) - r));
          const score = Math.min(room, 4) * 5 + k * 60 - Math.abs(i - 4) * 1.5;
          if (score > bestScore) [bestScore, best] = [score, new THREE.Vector3(x, 5.5, z)];
        }
      return { pos: best, target: new THREE.Vector3(0, 6, 0) };
    }
    const d = lotSize * 1.3 * fit;
    const p = f.clone().multiplyScalar(d * 0.85).addScaledVector(side, d * 0.42).setY(d * 0.5);
    return { pos: p, target: new THREE.Vector3(0, 2, 0) };
  }

  function setView(kind: CameraView, animate = true) {
    const v = viewOf(kind);
    controls.maxDistance = lotSize * 4;
    if (!animate) {
      camera.position.copy(v.pos);
      controls.target.copy(v.target);
      controls.update();
      invalidate();
      return;
    }
    flight = { from: camera.position.clone(), to: v.pos, fromT: controls.target.clone(), toT: v.target, start: performance.now(), ms: 650 };
    cancelAnimationFrame(frame);
    frame = 0;
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
        setView("overview", false);
      }
      invalidate();
    },
    groundAt,
    resetView: () => setView("overview"),
    setView,
    setSpin(on: boolean) {
      controls.autoRotate = on;
      invalidate();
    },
    dispose() {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(hoverFrame);
      plantCache.forEach((p) => p.geo?.dispose());
      ro.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
