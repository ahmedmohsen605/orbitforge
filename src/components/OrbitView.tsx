import { useEffect, useRef } from "react";
import * as THREE from "three";

const PLANET_COLORS: Record<string, number> = {
  mars: 0xc1440e,
  lunar: 0x9aa0a6,
  earth: 0x2a6fdb,
  deep: 0x8d7355,
};

const PLANET_SIZE: Record<string, number> = { mars: 8, lunar: 7, earth: 9, deep: 3.5 };

/**
 * 3D orbit visualization: target body + dashed science orbit + animated
 * spacecraft with solar panels. Craft color reflects mission health.
 * Falls back to a static banner if WebGL is unavailable.
 */
export default function OrbitView({
  target,
  health = 1,
  speed = 1,
  className,
}: {
  target: string;
  health?: number;
  speed?: number;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cleanup: (() => void) | null = null;
    try {
      cleanup = initScene(mount);
    } catch (e) {
      console.warn("OrbitView: 3D unavailable, showing static fallback", e);
      mount.innerHTML =
        `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#4f8cff;font-size:15px">` +
        `🛰 ${target.toUpperCase()} science orbit</div>`;
    }

    function initScene(m: HTMLDivElement): () => void {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        45, m.clientWidth / Math.max(1, m.clientHeight), 0.1, 2000,
      );
      camera.position.set(0, 42, 95);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      renderer.setSize(m.clientWidth, m.clientHeight);
      m.appendChild(renderer.domElement);

      // --- starfield ---
      const starCount = 900;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount * 3; i++) positions[i] = (Math.random() - 0.5) * 600;
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xbfd0ff, size: 0.9, sizeAttenuation: true }),
      );
      scene.add(stars);

      // --- lighting ---
      scene.add(new THREE.AmbientLight(0xffffff, 0.3));
      const sun = new THREE.PointLight(0xfff2d0, 2500);
      sun.position.set(-120, 30, 60);
      scene.add(sun);

      // --- target body ---
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(PLANET_SIZE[target] ?? 8, 48, 48),
        new THREE.MeshStandardMaterial({
          color: PLANET_COLORS[target] ?? 0x888888,
          roughness: 0.85,
          metalness: 0.05,
        }),
      );
      planet.rotation.z = 0.2;
      scene.add(planet);

      // thin atmosphere halo for earth / mars
      if (target === "earth" || target === "mars") {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry((PLANET_SIZE[target] ?? 8) * 1.06, 48, 48),
          new THREE.MeshBasicMaterial({
            color: target === "earth" ? 0x66aaff : 0xff9a66,
            transparent: true,
            opacity: 0.12,
            side: THREE.BackSide,
          }),
        );
        scene.add(halo);
      }

      // --- asteroid rock for deep-space target ---
      if (target === "deep") {
        const rock = new THREE.Mesh(
          new THREE.IcosahedronGeometry(1.4, 0),
          new THREE.MeshStandardMaterial({ color: 0x8d7355, roughness: 1, flatShading: true }),
        );
        rock.position.set(10, 2, 6);
        scene.add(rock);
      }

      // --- dashed science orbit ---
      const orbitRadius = (PLANET_SIZE[target] ?? 8) * 2.1;
      const curve = new THREE.EllipseCurve(0, 0, orbitRadius, orbitRadius * 0.97, 0, Math.PI * 2);
      const orbitPts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y));
      const orbitLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(orbitPts),
        new THREE.LineDashedMaterial({ color: 0x4f8cff, dashSize: 2.2, gapSize: 1.6, transparent: true, opacity: 0.7 }),
      );
      orbitLine.computeLineDistances();
      const tilt = new THREE.Group();
      tilt.rotation.x = 0.28;
      tilt.add(orbitLine);
      scene.add(tilt);

      // --- spacecraft: body + solar panels ---
      const craftColor = health > 0.66 ? 0x38d996 : health > 0.33 ? 0xffb020 : 0xff5d5d;
      const craft = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.9, 2.8, 12),
        new THREE.MeshStandardMaterial({ color: craftColor, metalness: 0.4, roughness: 0.3 }),
      );
      body.rotation.x = Math.PI / 2; // nose forward
      craft.add(body);
      const panelGeo = new THREE.BoxGeometry(4.5, 0.08, 1.3);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1c2f6e, metalness: 0.6, roughness: 0.2, emissive: 0x0a1440,
      });
      const p1 = new THREE.Mesh(panelGeo, panelMat); p1.position.x = 3.4;
      const p2 = new THREE.Mesh(panelGeo, panelMat); p2.position.x = -3.4;
      craft.add(p1, p2);
      tilt.add(craft);

      // --- sun visual ---
      const sunMesh = new THREE.Mesh(
        new THREE.SphereGeometry(4, 24, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd27d }),
      );
      sunMesh.position.copy(sun.position);
      scene.add(sunMesh);

      // --- animation loop ---
      let angle = 0;
      let raf = 0;
      const animate = () => {
        raf = requestAnimationFrame(animate);
        angle += 0.008 * speed;
        craft.position.set(
          Math.cos(angle) * orbitRadius,
          Math.sin(angle * 2) * 0.35,
          Math.sin(angle) * orbitRadius * 0.97,
        );
        craft.lookAt(0, 0, 0);
        planet.rotation.y += 0.0016;
        stars.rotation.y += 0.00018;
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
        renderer.dispose();
        if (renderer.domElement.parentElement === m) m.removeChild(renderer.domElement);
      };
    }

    return () => { cleanup?.(); };
  }, [target, health, speed]);

  return <div ref={mountRef} className={className} style={{ width: "100%", height: 280 }} />;
}
