import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MISSIONS, type MissionObjective } from "../data/catalogs";
import { fetchLiveISSCrew } from "../data/crew";
import { CHALLENGE_RESOURCES } from "../data/nasaResources";
import Leaderboard from "./Leaderboard";

/**
 * Open-world solar system: free-fly camera over a to-scale-in-order
 * (not-to-scale-in-size) system with real CC-BY texture maps
 * (solar-system-scope.com, derived from NASA imagery). Click a body to
 * target it; missions for that destination appear in the HUD.
 */

interface BodyDef {
  name: string;
  size: number;
  dist: number;
  tex: string;
  color: number;
  target?: MissionObjective["target"];
  orbitDays: number; // visual speed
  ring?: string;
  isMoonOf?: string;
}

const BODIES: BodyDef[] = [
  { name: "Mercury", size: 1.3, dist: 18, tex: "2k_mercury.jpg", color: 0x8a8a8a, orbitDays: 88 },
  { name: "Venus", size: 2.2, dist: 26, tex: "2k_venus_atmosphere.jpg", color: 0xd9b26a, orbitDays: 225 },
  { name: "Earth", size: 2.5, dist: 36, tex: "2k_earth_daymap.jpg", color: 0x2a6fdb, target: "earth", orbitDays: 365 },
  { name: "Moon", size: 0.7, dist: 5, tex: "2k_moon.jpg", color: 0x9aa0a6, target: "lunar", orbitDays: 28, isMoonOf: "Earth" },
  { name: "Mars", size: 1.7, dist: 48, tex: "2k_mars.jpg", color: 0xc1440e, target: "mars", orbitDays: 687 },
  { name: "Ceres", size: 0.9, dist: 64, tex: "2k_ceres_fictional.jpg", color: 0x6f6659, target: "deep", orbitDays: 1680 },
  { name: "Jupiter", size: 5.5, dist: 90, tex: "2k_jupiter.jpg", color: 0xd8b28a, target: "deep", orbitDays: 4333 },
  { name: "Saturn", size: 4.8, dist: 120, tex: "2k_saturn.jpg", color: 0xd8c8a0, target: "deep", orbitDays: 10759, ring: "2k_saturn_ring_alpha.png" },
  { name: "Uranus", size: 3.2, dist: 150, tex: "2k_uranus.jpg", color: 0x9fd6d9, target: "deep", orbitDays: 30687 },
  { name: "Neptune", size: 3.1, dist: 178, tex: "2k_neptune.jpg", color: 0x3f66f4, target: "deep", orbitDays: 60190 },
];

/** Real facts shown on close-up (NASA planetary fact sheets). */
const FACTS: Record<string, string> = {
  Mercury: "A year here is only 88 Earth days — but one solar day lasts 176.",
  Venus: "465°C — hot enough to melt lead, hotter than Mercury despite being farther out.",
  Earth: "The only known world with liquid-water oceans covering 71% of its surface.",
  Moon: "Twelve humans have walked here. It drifts 3.8 cm farther from Earth every year.",
  Mars: "Home to Olympus Mons — a volcano nearly 3× the height of Everest.",
  Ceres: "A dwarf planet hiding salty ice — possibly a subsurface ocean.",
  Jupiter: "More massive than all other planets combined; its Great Red Spot is a storm bigger than Earth.",
  Saturn: "Its glorious rings are mostly water ice — under 1 km thick in places.",
  Uranus: "Spins on its side (98° tilt), likely knocked over by an ancient giant impact.",
  Neptune: "Fastest winds in the solar system — over 2,000 km/h.",
};

/** Planet dossier rows — NASA planetary fact sheets. */
const DETAILS: Record<string, [string, string][]> = {
  Mercury: [["Diameter", "4,879 km"], ["Distance from Sun", "57.9 million km (0.39 AU)"], ["Day length", "176 Earth days"], ["Year length", "88 Earth days"], ["Moons", "0"], ["Temperature", "-173°C to 427°C"], ["Gravity", "3.7 m/s²"]],
  Venus: [["Diameter", "12,104 km"], ["Distance from Sun", "108.2 million km (0.72 AU)"], ["Day length", "243 Earth days (backwards!)"], ["Year length", "225 Earth days"], ["Moons", "0"], ["Temperature", "465°C (hottest planet)"], ["Gravity", "8.9 m/s²"]],
  Earth: [["Diameter", "12,756 km"], ["Distance from Sun", "149.6 million km (1 AU)"], ["Day length", "24 hours"], ["Year length", "365.25 days"], ["Moons", "1"], ["Temperature", "15°C average"], ["Gravity", "9.8 m/s²"]],
  Moon: [["Diameter", "3,475 km"], ["Distance from Earth", "384,400 km"], ["Day length", "27.3 Earth days"], ["Orbit period", "27.3 days (tidally locked)"], ["Visitors", "12 astronauts"], ["Temperature", "-173°C to 127°C"], ["Gravity", "1.6 m/s²"]],
  Mars: [["Diameter", "6,792 km"], ["Distance from Sun", "227.9 million km (1.52 AU)"], ["Day length", "24.6 hours"], ["Year length", "687 Earth days"], ["Moons", "2 (Phobos, Deimos)"], ["Temperature", "-65°C average"], ["Gravity", "3.7 m/s²"]],
  Ceres: [["Diameter", "940 km"], ["Distance from Sun", "413.7 million km (2.77 AU)"], ["Day length", "9 hours"], ["Year length", "4.6 Earth years"], ["Moons", "0"], ["Temperature", "-105°C average"], ["Gravity", "0.27 m/s²"]],
  Jupiter: [["Diameter", "142,984 km"], ["Distance from Sun", "778.6 million km (5.2 AU)"], ["Day length", "9.9 hours (fastest!)"], ["Year length", "11.9 Earth years"], ["Moons", "95 known"], ["Temperature", "-110°C cloud tops"], ["Gravity", "24.8 m/s²"]],
  Saturn: [["Diameter", "120,536 km"], ["Distance from Sun", "1,433.5 million km (9.5 AU)"], ["Day length", "10.7 hours"], ["Year length", "29.4 Earth years"], ["Moons", "146 known"], ["Temperature", "-140°C"], ["Gravity", "10.4 m/s²"]],
  Uranus: [["Diameter", "51,118 km"], ["Distance from Sun", "2,872.5 million km (19.2 AU)"], ["Day length", "17.2 hours"], ["Year length", "84 Earth years"], ["Moons", "28 known"], ["Temperature", "-195°C (coldest atmosphere)"], ["Gravity", "8.9 m/s²"]],
  Neptune: [["Diameter", "49,528 km"], ["Distance from Sun", "4,495.1 million km (30.1 AU)"], ["Day length", "16.1 hours"], ["Year length", "165 Earth years"], ["Moons", "16 known"], ["Temperature", "-200°C"], ["Gravity", "11.2 m/s²"]],
};

function makeLabel(text: string): THREE.Sprite {  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "600 30px Segoe UI, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8ecf8";
  ctx.shadowColor = "#000"; ctx.shadowBlur = 6;
  ctx.fillText(text, 128, 42);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false,
  }));
  sprite.scale.set(10, 2.5, 1);
  return sprite;
}

export default function SolarSystemView({ onDesign, onLab }: { onDesign: (missionId: string) => void; onLab?: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const bodiesRef = useRef<{ def: BodyDef; mesh: THREE.Mesh; group: THREE.Group }[]>([]);
  const [selected, setSelected] = useState<BodyDef | null>(null);
  const selectedRef = useRef<BodyDef | null>(null);
  const flyRef = useRef(false);
  const selectRef = useRef<(d: BodyDef | null) => void>(() => {});
  const [ultra, setUltra] = useState(true);
  const [showLb, setShowLb] = useState(false);
  const [liveCrew, setLiveCrew] = useState<{ name: string; craft: string }[] | null>(null);
  const [hint, setHint] = useState(true);
  const [showRes, setShowRes] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const transferRef = useRef({ current: false });

  useEffect(() => { selectedRef.current = selected; }, [selected]);

  /** Select a body AND fly the camera into a close orbit around it. */
  const selectBody = (d: BodyDef | null) => {
    setSelected(d);
    setHint(false);
    flyRef.current = !!d;
  };
  selectRef.current = selectBody;

  /* live ISS crew ticker (open-notify, free) */
  useEffect(() => { fetchLiveISSCrew().then((c) => setLiveCrew(c.length ? c : null)); }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cleanup: (() => void) | null = null;
    try { cleanup = initScene(mount); }
    catch (e) { console.warn("SolarSystemView unavailable", e); }
    function initScene(m: HTMLDivElement): () => void {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, m.clientWidth / Math.max(1, m.clientHeight), 0.1, 4000);
      camera.position.set(0, 110, 240);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      const ultraRef = { current: true };
      const applyQuality = () => {
        const dpr = window.devicePixelRatio || 1;
        // Ultra renders at up to 2x native pixels (4K-class on any display)
        renderer.setPixelRatio(Math.min(3, dpr * (ultraRef.current ? 2 : 1)));
        renderer.setSize(m.clientWidth, m.clientHeight);
      };
      applyQuality();
      m.appendChild(renderer.domElement);
      const setUltraRender = (v: boolean) => { ultraRef.current = v; applyQuality(); };
      (m as unknown as { __setUltra?: (v: boolean) => void }).__setUltra = setUltraRender;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 6;
      controls.maxDistance = 900;

      // lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.22));
      const sunLight = new THREE.PointLight(0xfff2d0, 60000, 0, 1.6);
      scene.add(sunLight);

      // milky way backdrop
      const bgTex = new THREE.TextureLoader().load("/textures/2k_stars_milky_way.jpg", undefined, undefined, () => {});
      scene.add(new THREE.Mesh(
        new THREE.SphereGeometry(1500, 48, 48),
        new THREE.MeshBasicMaterial({ map: bgTex, side: THREE.BackSide }),
      ));

      // sun
      const sunMesh = new THREE.Mesh(
        new THREE.SphereGeometry(9, 48, 48),
        new THREE.MeshBasicMaterial({ map: new THREE.TextureLoader().load("/textures/2k_sun.jpg", undefined, undefined, () => {}) }),
      );
      scene.add(sunMesh);

      const loader = new THREE.TextureLoader();
      const aniso = renderer.capabilities.getMaxAnisotropy();
      const loadTex = (url: string, onOk: (t: THREE.Texture) => void) =>
        loader.load(url, (t) => { t.anisotropy = aniso; onOk(t); }, undefined, () => {});

      // CRITICAL: clear stale entries left by HMR remounts — duplicates here
      // make camera/raycast target disposed clones (selecting a body flies
      // to empty space).
      bodiesRef.current = [];

      // planets + orbit rings
      const orbitSpeed = (days: number) => 0.9 / Math.sqrt(days); // Keplerian feel
      for (const def of BODIES) {
        const group = new THREE.Group();
        group.rotation.y = Math.random() * Math.PI * 2;
        const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.9 });
        loadTex(`/textures/${def.tex}`, (t) => { mat.map = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(def.size, 48, 48), mat);
        mesh.position.x = def.dist;
        mesh.userData.def = def;
        if (def.ring) {
          const ringTex = loader.load(`/textures/${def.ring}`, undefined, undefined, () => {});
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(def.size * 1.4, def.size * 2.3, 64),
            new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, opacity: 0.9 }),
          );
          ring.rotation.x = Math.PI / 2 - 0.35;
          mesh.add(ring);
        }
        mesh.add(makeLabel(def.name));
        group.add(mesh);
        scene.add(group);
        bodiesRef.current.push({ def, mesh, group });

        // moons orbit their parent planet, not the Sun
        if (def.isMoonOf) {
          const parent = bodiesRef.current.find((b) => b.def.name === def.isMoonOf);
          if (parent) { scene.remove(group); parent.group.add(group); }
        }
        if (!def.isMoonOf) {
          const pts = new THREE.EllipseCurve(0, 0, def.dist, def.dist, 0, Math.PI * 2).getPoints(128)
            .map((p) => new THREE.Vector3(p.x, 0, p.y));
          scene.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x2a3450, transparent: true, opacity: 0.6 }),
          ));
        }
      }

      // asteroid belt sparkle
      const beltCount = 700;
      const beltPos = new Float32Array(beltCount * 3);
      for (let i = 0; i < beltCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = 56 + Math.random() * 16;
        beltPos[i * 3] = Math.cos(a) * r;
        beltPos[i * 3 + 1] = (Math.random() - 0.5) * 2.5;
        beltPos[i * 3 + 2] = Math.sin(a) * r;
      }
      const beltGeo = new THREE.BufferGeometry();
      beltGeo.setAttribute("position", new THREE.BufferAttribute(beltPos, 3));
      scene.add(new THREE.Points(beltGeo, new THREE.PointsMaterial({ color: 0x6f6659, size: 0.6 })));

      // interplanetary transfer path (Mission Viz-inspired): Earth -> selected target
      const transferGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const transferLine = new THREE.Line(
        transferGeo,
        new THREE.LineDashedMaterial({ color: 0x38d996, dashSize: 7, gapSize: 5, transparent: true, opacity: 0.95 }),
      );
      transferLine.visible = false;
      scene.add(transferLine);

      // click select (ignore drags)
      const ray = new THREE.Raycaster();
      const ndc = new THREE.Vector2();
      let downX = 0, downY = 0;
      const onDown = (e: PointerEvent) => { downX = e.clientX; downY = e.clientY; flyRef.current = false; };
      const onUp = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;
        const rect = renderer.domElement.getBoundingClientRect();
        ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hits = ray.intersectObjects(bodiesRef.current.map((b) => b.mesh), false);
        if (hits.length > 0) {
          const def = (hits[0].object.userData.def as BodyDef);
          selectRef.current(def);
        }
      };
      renderer.domElement.addEventListener("pointerdown", onDown);
      renderer.domElement.addEventListener("pointerup", onUp);

      // animation
      let raf = 0;
      const clock = new THREE.Clock();
      const animate = () => {
        raf = requestAnimationFrame(animate);
        const dt = clock.getDelta();
        for (const { def, mesh, group } of bodiesRef.current) {
          group.rotation.y += orbitSpeed(def.orbitDays) * dt;
          mesh.rotation.y += dt * 0.15;
        }
        // focus camera target on selection + cinematic fly-in
        const sel = selectedRef.current;
        const entry = sel ? bodiesRef.current.find((b) => b.def.name === sel.name) : undefined;
        if (sel && entry) {
          const wp = new THREE.Vector3();
          entry.mesh.getWorldPosition(wp);
          controls.target.lerp(wp, 0.08);
          controls.minDistance = Math.max(2.2, entry.def.size * 1.4);
          if (flyRef.current) {
            // glide to a close orbit: distance scaled to the body's size
            const dist = Math.max(7, entry.def.size * 4.2);
            const dir = camera.position.clone().sub(wp);
            if (dir.length() < 0.001) dir.set(0, 0.4, 1);
            dir.normalize();
            const desired = wp.clone().addScaledVector(dir, dist);
            camera.position.lerp(desired, 0.055);
            if (camera.position.distanceTo(desired) < 0.4) flyRef.current = false;
          }
        } else {
          controls.minDistance = 6;
        }
        controls.enabled = !flyRef.current;
        // transfer path: Earth -> selected target (updated every frame)
        if (transferRef.current && sel) {
          const earth = bodiesRef.current.find((b) => b.def.name === "Earth");
          const target = bodiesRef.current.find((b) => b.def.name === sel.name);
          if (earth && target && target.def.name !== "Earth") {
            const p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
            earth.mesh.getWorldPosition(p1);
            target.mesh.getWorldPosition(p2);
            transferLine.geometry.setFromPoints([p1, p2]);
            transferLine.computeLineDistances();
            transferLine.visible = true;
          } else {
            transferLine.visible = false;
          }
        } else {
          transferLine.visible = false;
        }
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const onResize = () => {
        if (!m.clientWidth || !m.clientHeight) return;
        camera.aspect = m.clientWidth / m.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(m.clientWidth, m.clientHeight);
      };
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        renderer.domElement.removeEventListener("pointerdown", onDown);
        renderer.domElement.removeEventListener("pointerup", onUp);
        controls.dispose();
        renderer.dispose();
        if (renderer.domElement.parentElement === m) m.removeChild(renderer.domElement);
      };
    }

    return () => { cleanup?.(); };
  }, []);

  /* quality toggle reaches the renderer via a ref-side-channel */
  const toggleUltra = () => {
    const next = !ultra;
    setUltra(next);
    (mountRef.current as unknown as { __setUltra?: (v: boolean) => void } | null)?.__setUltra?.(next);
  };

  const toggleTransfer = () => {
    const next = !showTransfer;
    setShowTransfer(next);
    transferRef.current.current = next;
  };

  const missions = selected
    ? MISSIONS.filter((m) => m.target === selected.target)
    : MISSIONS;

  return (
    <div className="map-wrap">
      <div ref={mountRef} className="map-canvas" />

      <div className="hud hud-tl">
        <h1>ORBITFORGE</h1>
        <p>Open solar system · drag to fly · scroll to zoom · click a planet to target it</p>
      </div>

      <div className="hud hud-tr">
        {onLab && <button className="ghost" onClick={onLab}>🎓 Rocket Builder</button>}
        <button className={`ghost ${showTransfer ? "toggled" : ""}`} onClick={toggleTransfer}>🛰 Transfer path</button>
        <button className="ghost" onClick={() => setShowRes(true)}>📚 NASA resources</button>
        <button className="ghost" onClick={toggleUltra}>⚙ {ultra ? "Ultra (4K-class)" : "Performance"}</button>
        <button className="ghost" onClick={() => setShowLb((v) => !v)}>🏆 Records</button>
      </div>

      <div className="hud hud-left">
        <h3>Bodies</h3>
        {BODIES.filter((b) => b.target).map((b) => (
          <button key={b.name} className={`choice ${selected?.name === b.name ? "active" : ""}`}
            onClick={() => selectBody(b)}>
            <strong>{b.name}</strong>
            <span>{MISSIONS.filter((m) => m.target === b.target).length} mission{MISSIONS.filter((m) => m.target === b.target).length === 1 ? "" : "s"}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="hud hud-planet">
          <div className="planet-head">
            <div className="swatch" style={{ background: `#${selected.color.toString(16).padStart(6, "0")}` }} />
            <h3>{selected.name}</h3>
          </div>
          <table className="planet-table">
            <tbody>
              {(DETAILS[selected.name] ?? []).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{v}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="planet-fact">💡 {FACTS[selected.name]}</p>
          <p className="muted small">
            {MISSIONS.filter((m) => m.target === selected.target).length} mission{MISSIONS.filter((m) => m.target === selected.target).length === 1 ? "" : "s"} launch from here — pick one in the bar below
          </p>
        </div>
      )}

      <div className="hud hud-bottom">
        {hint && <p className="muted hint">🛰 Select a destination, then commit to a design</p>}
        {selected && (
          <div className="target-row">
            <p className="target-line">📍 <strong>{selected.name}</strong> — {FACTS[selected.name] ?? ""}</p>
            <button className="ghost tiny" onClick={() => selectBody(null)}>✕ release view</button>
          </div>
        )}
        <div className="mission-row">
          {onLab && (
            <button className="card mission-chip lab-chip" onClick={onLab}>
              <h4>🎓 Rocket Builder</h4>
              <div className="facts"><span>for kids</span><span>real NASA standards</span></div>
              <p className="real">learn: rocket equation · TWR · staging → build & launch!</p>
            </button>
          )}
          {missions.map((m) => (
            <button key={m.id} className="card mission-chip" onClick={() => onDesign(m.id)}>
              <h4>{m.name}</h4>
              <div className="facts">
                <span>Δv {m.deltaV} m/s</span>
                <span>${m.budgetCap}M cap</span>
                <span>{m.cruiseDays}d cruise</span>
              </div>
              <p className="real">analog: {m.realMission.name}</p>
            </button>
          ))}
        </div>
      </div>

      {liveCrew && (
        <div className="hud hud-crew">
          👨‍🚀 LIVE · {liveCrew.length} humans in space right now: {liveCrew.slice(0, 3).map((c) => c.name.split(" ")[1]).join(", ")}{liveCrew.length > 3 ? "…" : ""} <em className="muted">[open-notify live feed]</em>
        </div>
      )}

      {showLb && (
        <div className="hud hud-modal" onClick={() => setShowLb(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Leaderboard limit={10} title="All-Time Mission Records" />
          </div>
        </div>
      )}

      {showRes && (
        <div className="hud hud-modal" onClick={() => setShowRes(false)}>
          <div className="res-panel" onClick={(e) => e.stopPropagation()}>
            <h2>📚 Built with the challenge's NASA resources</h2>
            <p className="muted">From the Space Mission Design Game resources tab — each one is wired into gameplay:</p>
            <ul className="res-list">
              {CHALLENGE_RESOURCES.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer"><strong>{r.title}</strong></a>
                  <span className="muted">{r.usedFor}</span>
                </li>
              ))}
            </ul>
            <button className="big" onClick={() => setShowRes(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
