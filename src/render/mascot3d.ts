import * as THREE from "three";
import type { Plant } from "../model/plant";

// A cheerful potted plant with googly eyes, built from any plant in the database.
// Eyes follow the pointer, it bobs and sways on its own, and a click makes it hop and
// come back as a different plant. Cartoon shading keeps it toy-like rather than realistic.

type Options = { onSwap?: () => void };
// The caller decides which plant comes next and calls swapTo on click.

const TAU = Math.PI * 2;

export function createMascot(container: HTMLElement, plant: Plant, opts: Options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "mascot-canvas";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 1.6, 9.5);
  camera.lookAt(0, 1.45, 0);
  scene.add(new THREE.HemisphereLight("#ffffff", "#c9b9a0", 1.6));
  const key = new THREE.DirectionalLight("#fff6e0", 2.2);
  key.position.set(-3, 5, 6);
  scene.add(key);

  // Three-step toon ramp.
  const ramp = new THREE.DataTexture(new Uint8Array([90, 90, 90, 255, 180, 180, 180, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  const toon = (color: string) => new THREE.MeshToonMaterial({ color, gradientMap: ramp });

  // The body hops and squashes; the plant sways inside it.
  const body = new THREE.Group();
  scene.add(body);
  let sway = new THREE.Group();
  let face = new THREE.Group();
  let pupils: THREE.Object3D[] = [];
  let eyes = new THREE.Group();

  // ---------- pot ----------
  const pot = new THREE.Group();
  const profile = [
    [0.0, 0],
    [0.78, 0],
    [0.95, 1.15],
    [1.12, 1.2],
    [1.12, 1.5],
    [1.0, 1.5],
    [0.96, 1.36],
    [0.0, 1.36],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  pot.add(new THREE.Mesh(new THREE.LatheGeometry(profile, 40), toon("#cf7a4f")));
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.97, 32).rotateX(-Math.PI / 2), toon("#5b4030"));
  soil.position.y = 1.4;
  pot.add(soil);
  body.add(pot);

  // ---------- face ----------
  function makeFace(scale: number) {
    const g = new THREE.Group();
    pupils = [];
    eyes = new THREE.Group();
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.26 * scale, 24, 16), new THREE.MeshToonMaterial({ color: "#ffffff", gradientMap: ramp }));
      white.scale.z = 0.6;
      eye.add(white);
      const pupil = new THREE.Group();
      const black = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 16, 12), new THREE.MeshBasicMaterial({ color: "#1c1a18" }));
      black.scale.z = 0.5;
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.04 * scale, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
      shine.position.set(-0.04 * scale, 0.05 * scale, 0.06 * scale);
      pupil.add(black, shine);
      pupil.position.z = 0.13 * scale;
      eye.add(pupil);
      pupils.push(pupil);
      eye.position.set(side * 0.3 * scale, 0, 0);
      eyes.add(eye);
    }
    g.add(eyes);
    // Smile and rosy cheeks.
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.17 * scale, 0.035 * scale, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: "#3a2320" }));
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.28 * scale, 0.05 * scale);
    g.add(smile);
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.09 * scale, 16), new THREE.MeshBasicMaterial({ color: "#f29aa6", transparent: true, opacity: 0.75 }));
      cheek.position.set(side * 0.5 * scale, -0.2 * scale, 0.02 * scale);
      g.add(cheek);
    }
    return g;
  }

  // ---------- plants ----------
  const green = (p: Plant) => p.foliage.summer ?? p.foliage.spring ?? "#5f8a42";
  const bloom = (p: Plant) => p.bloom?.colors[0] ?? null;

  function build(p: Plant) {
    body.remove(sway);
    sway.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    sway = new THREE.Group();
    sway.position.y = 1.4;
    body.add(sway);
    const leaf = green(p), flower = bloom(p);
    const add = (geo: THREE.BufferGeometry, color: string, pos: [number, number, number], scale: [number, number, number] = [1, 1, 1], rot: [number, number, number] = [0, 0, 0]) => {
      const m = new THREE.Mesh(geo, toon(color));
      m.position.set(...pos);
      m.scale.set(...scale);
      m.rotation.set(...rot);
      sway.add(m);
      return m;
    };
    let faceAt: [number, number, number] = [0, 1.3, 0.95];
    let faceScale = 1;

    switch (p.render.form) {
      case "canopy": {
        add(new THREE.CylinderGeometry(0.13, 0.2, 1.4, 12), "#7a5a42", [0, 0.7, 0]);
        add(new THREE.SphereGeometry(1, 24, 18), leaf, [0, 1.95, 0], [1.1, 0.95, 1]);
        for (const [x, y, s] of [[-0.85, 1.7, 0.55], [0.85, 1.75, 0.55], [0, 2.75, 0.5]] as const) add(new THREE.SphereGeometry(1, 18, 14), leaf, [x, y, -0.15], [s, s, s]);
        if (flower) for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.09, 8, 6), flower, [Math.cos(i * 0.7) * 0.9, 1.9 + Math.sin(i * 1.3) * 0.7, 0.55 + (i % 2) * 0.1]);
        faceAt = [0, 1.9, 0.98];
        break;
      }
      case "columnar": {
        add(new THREE.ConeGeometry(0.85, 3.1, 20), leaf, [0, 1.55, 0]);
        faceAt = [0, 1.15, 0.5];
        faceScale = 0.85;
        break;
      }
      case "grass": {
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TAU;
          add(new THREE.ConeGeometry(0.09, 1.9, 6), i % 3 ? leaf : shadeHex(leaf, 0.2), [Math.cos(a) * 0.35, 0.9, Math.sin(a) * 0.35], [1, 1, 1], [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35]);
        }
        add(new THREE.SphereGeometry(0.62, 20, 16), leaf, [0, 0.45, 0], [1, 0.8, 1]);
        faceAt = [0, 0.5, 0.52];
        faceScale = 0.75;
        break;
      }
      case "mat": {
        add(new THREE.SphereGeometry(1, 24, 14), leaf, [0, 0.15, 0], [1.05, 0.5, 1]);
        if (flower) for (let i = 0; i < 14; i++) add(new THREE.SphereGeometry(0.08, 8, 6), flower, [Math.cos(i * 2.4) * 0.8 * ((i % 3) / 3 + 0.4), 0.45 + (i % 2) * 0.05, Math.sin(i * 2.4) * 0.6]);
        faceAt = [0, 0.32, 0.92];
        faceScale = 0.85;
        break;
      }
      case "rosette": {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * TAU + 0.3;
          add(new THREE.SphereGeometry(0.5, 18, 12), i % 2 ? leaf : shadeHex(leaf, 0.12), [Math.cos(a) * 0.55, 0.35, Math.sin(a) * 0.45], [1, 0.35, 0.6], [0.4 * Math.sin(a), -a, 0.5 * Math.cos(a)]);
        }
        if (flower) {
          add(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6), shadeHex(leaf, -0.2), [0.45, 1.0, -0.2]);
          for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(0.08, 8, 6), flower, [0.45 + (i % 2) * 0.06, 1.25 + i * 0.12, -0.2]);
        }
        add(new THREE.SphereGeometry(0.5, 20, 16), shadeHex(leaf, 0.08), [0, 0.6, 0.1], [1, 0.9, 0.9]);
        faceAt = [0, 0.62, 0.55];
        faceScale = 0.75;
        break;
      }
      case "upright": {
        // A big flower on a stem, with the face in the middle of the bloom.
        add(new THREE.CylinderGeometry(0.06, 0.08, 1.6, 8), shadeHex(leaf, -0.15), [0, 0.8, 0]);
        add(new THREE.SphereGeometry(0.35, 12, 8), leaf, [-0.35, 0.55, 0], [1, 0.3, 0.55], [0, 0, 0.6]);
        add(new THREE.SphereGeometry(0.35, 12, 8), leaf, [0.35, 0.85, 0], [1, 0.3, 0.55], [0, 0, -0.6]);
        const petals = flower ?? leaf;
        const center = flower ? (p.id === "purple-coneflower" ? "#b86a2e" : p.id === "black-eyed-susan" ? "#4a2c18" : "#f2c14e") : shadeHex(leaf, 0.2);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          add(new THREE.SphereGeometry(0.3, 12, 8), petals, [Math.cos(a) * 0.62, 1.95 + Math.sin(a) * 0.62, 0], [1, 0.42, 0.12], [0, 0, a]);
        }
        add(new THREE.SphereGeometry(0.5, 24, 16), center, [0, 1.95, 0.05], [1, 1, 0.45]);
        faceAt = [0, 1.98, 0.3];
        faceScale = 0.78;
        break;
      }
      default: {
        // Shrubs: a round, bouncy bush.
        add(new THREE.SphereGeometry(1, 24, 18), leaf, [0, 0.95, 0], [1.15, 1, 1.05]);
        for (const [x, y] of [[-0.75, 1.35], [0.75, 1.4], [0, 1.85]] as const) add(new THREE.SphereGeometry(0.55, 18, 14), shadeHex(leaf, 0.06), [x, y, -0.2]);
        if (flower) {
          const big = p.id === "annabelle-hydrangea";
          for (let i = 0; i < (big ? 6 : 11); i++) {
            const a = i * 2.3;
            add(new THREE.SphereGeometry(big ? 0.28 : 0.1, 12, 8), flower, [Math.cos(a) * 0.95, 1.3 + Math.sin(a * 1.7) * 0.5, 0.55 + Math.abs(Math.sin(a)) * 0.2]);
          }
        }
        faceAt = [0, 1.05, 1.08];
      }
    }
    face = makeFace(faceScale);
    face.position.set(...faceAt);
    sway.add(face);
    frame3();
  }

  // Fit the camera to this plant and its pot, with a little room above for the hop.
  function frame3() {
    const box = new THREE.Box3().setFromObject(body);
    const h = box.max.y - box.min.y;
    const w = Math.max(box.max.x - box.min.x, 2.4);
    const fov = (camera.fov * Math.PI) / 180;
    const fitH = (h * 1.22) / (2 * Math.tan(fov / 2));
    const fitW = (w * 1.3) / (2 * Math.tan(fov / 2) * Math.max(0.5, camera.aspect));
    const dist = Math.max(fitH, fitW);
    const cy = box.min.y + h * 0.53;
    camera.position.set(0, cy + dist * 0.08, dist);
    camera.lookAt(0, cy, 0);
  }

  build(plant);

  // ---------- motion ----------
  const target = new THREE.Vector2(0, 0);
  const look = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.4;
    target.set(Math.max(-1, Math.min(1, (e.clientX - cx) / 400)), Math.max(-1, Math.min(1, (e.clientY - cy) / 400)));
  };
  window.addEventListener("pointermove", look);

  let hover = 0;
  let hop = -1; // seconds since the hop started, or -1
  let swapped = false;
  let nextBlink = 1.5 + Math.random() * 3;
  const enter = () => (hover = 1);
  const leave = () => (hover = 0);
  const click = () => {
    if (hop < 0) {
      hop = 0;
      swapped = false;
    }
  };
  renderer.domElement.addEventListener("pointerenter", enter);
  renderer.domElement.addEventListener("pointerleave", leave);

  let pending: Plant | null = null;
  const clock = new THREE.Clock();
  let frame = 0;
  let visible = true;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let wiggle = 0;

  const tick = () => {
    frame = 0;
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    wiggle += (hover - wiggle) * 0.1;

    // Idle: a gentle bob and sway, more lively while hovered.
    const lively = reduce ? 0.2 : 1;
    sway.rotation.z = Math.sin(t * 1.7) * 0.06 * lively + Math.sin(t * 9) * 0.05 * wiggle * lively;
    sway.rotation.x = Math.sin(t * 1.1) * 0.03 * lively;
    let y = Math.sin(t * 2.2) * 0.04 * lively, sx = 1, sy = 1;

    if (hop >= 0) {
      hop += dt;
      const d = 0.75;
      const k = hop / d;
      if (k < 0.15) {
        sy = 1 - (k / 0.15) * 0.18; // crouch
        sx = 1 + (k / 0.15) * 0.12;
      } else if (k < 0.85) {
        const u = (k - 0.15) / 0.7;
        y += Math.sin(u * Math.PI) * 1.3;
        sy = 1.08;
        sx = 0.94;
        body.rotation.y = u * TAU;
        if (u > 0.5 && !swapped) {
          swapped = true;
          opts.onSwap?.();
          if (pending) {
            build(pending);
            pending = null;
          }
        }
      } else if (k < 1) {
        const u = (k - 0.85) / 0.15;
        sy = 1 - Math.sin(u * Math.PI) * 0.15; // land
        sx = 1 + Math.sin(u * Math.PI) * 0.1;
        body.rotation.y = 0;
      } else {
        hop = -1;
        body.rotation.y = 0;
      }
    }
    body.position.y = y;
    body.scale.set(sx, sy, sx);

    // Eyes: pupils drift toward the pointer; blink now and then.
    for (const p of pupils) {
      p.position.x += (target.x * 0.09 - p.position.x) * 0.2;
      p.position.y += (-target.y * 0.07 - p.position.y) * 0.2;
    }
    nextBlink -= dt;
    const blink = nextBlink < 0 ? Math.max(0.08, Math.abs(nextBlink + 0.07) / 0.07) : 1;
    eyes.scale.y = Math.min(1, blink);
    if (nextBlink < -0.14) nextBlink = 2 + Math.random() * 4;

    renderer.render(scene, camera);
    if (visible) frame = requestAnimationFrame(tick);
  };

  // Pause when off screen or the tab is hidden.
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    if (visible && !frame) frame = requestAnimationFrame(tick);
  });
  io.observe(container);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    frame3();
    renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  tick();

  return {
    // Hop, and come down as this plant.
    swapTo(p: Plant) {
      pending = p;
      click();
    },
    show(p: Plant) {
      build(p);
    },
    hop: click,
    dispose() {
      cancelAnimationFrame(frame);
      visible = false;
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", look);
      renderer.domElement.removeEventListener("pointerenter", enter);
      renderer.domElement.removeEventListener("pointerleave", leave);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function shadeHex(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  return `#${(amount < 0 ? c.lerp(new THREE.Color("#1f2a1c"), -amount) : c.lerp(new THREE.Color("#fffbea"), amount)).getHexString()}`;
}
