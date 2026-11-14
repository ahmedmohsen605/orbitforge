import { useEffect, useMemo, useRef, useState } from "react";
import { ENGINES, PAYLOADS, TARGETS, LESSONS, type RocketEngine } from "../data/academy";

const G0 = 9.80665;

interface StageDef { engineId: string; engineCount: number; propMass: number; }
interface Leg { name: string; dv: number; blurb: string; }

/**
 * Kids' rocket builder. Step wizard: payload -> engines -> propellant ->
 * standards check -> launch. Mission profiles: LEO, Moon landing, Mars
 * landing (with a real lander stage and leg-by-leg delta-v accounting).
 * Ascent physics run at TIMEWARP so staging is visible in seconds.
 */
export default function RocketLab({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState(0);
  const [payloadId, setPayloadId] = useState("cubesat");
  const [targetId, setTargetId] = useState("leo");
  const [s1, setS1] = useState<StageDef>({ engineId: "merlin", engineCount: 9, propMass: 400000 });
  const [s2, setS2] = useState<StageDef>({ engineId: "rl10", engineCount: 1, propMass: 20000 });
  const [s3, setS3] = useState<StageDef>({ engineId: "rl10", engineCount: 1, propMass: 12000 });

  const payload = PAYLOADS.find((p) => p.id === payloadId)!;
  const target = TARGETS.find((t) => t.id === targetId)!;
  const deepLegs = target.legs.slice(1);
  const e1 = ENGINES.find((e) => e.id === s1.engineId)!;
  const e2 = ENGINES.find((e) => e.id === s2.engineId)!;
  const e3 = ENGINES.find((e) => e.id === s3.engineId)!;

  const stageCalc = (st: StageDef, eng: RocketEngine, upperMass: number) => {
    const engineMass = eng.mass * st.engineCount;
    const structure = st.propMass * 0.07; // tankage ~7% of propellant (real mass fraction)
    const dry = engineMass + structure + upperMass;
    return { dry, wet: dry + st.propMass, thrustKN: eng.thrustKN * st.engineCount, isp: eng.ispVac };
  };
  const s3c = useMemo(() => stageCalc(s3, e3, payload.mass), [s3, e3, payload]);
  const s2c = useMemo(() => stageCalc(s2, e2, deepLegs.length ? s3c.wet : payload.mass), [s2, e2, s3c, deepLegs, payload]);
  const s1c = useMemo(() => stageCalc(s1, e1, s2c.wet), [s1, e1, s2c]);

  const dv1 = e1.ispVac * G0 * Math.log(s1c.wet / s1c.dry);
  const dv2 = e2.ispVac * G0 * Math.log(s2c.wet / s2c.dry);
  const dv3 = e3.ispVac * G0 * Math.log(s3c.wet / s3c.dry);
  const twr = (s1c.thrustKN * 1000) / (s1c.wet * G0);
  const ascentNeed = target.legs[0].dv;
  const deepNeed = deepLegs.reduce((s, l) => s + l.dv, 0);

  const checks = [
    { label: "Liftoff thrust-to-weight", value: twr, limit: 1.2, dir: "over" as const, unit: "",
      ok: twr >= 1.2, detail: `Thrust ${(s1c.thrustKN / 1000).toFixed(1)} MN vs weight ${(s1c.wet * G0 / 1000).toFixed(1)} MN — real rockets lift off at TWR ≥ 1.2` },
    { label: "Ascent Δv (stages 1+2)", value: Math.round(dv1 + dv2), limit: ascentNeed, dir: "over" as const, unit: "m/s",
      ok: dv1 + dv2 >= ascentNeed, detail: `Stage 1 ${Math.round(dv1)} + Stage 2 ${Math.round(dv2)} vs ${ascentNeed} needed (incl. real losses)` },
    ...(deepLegs.length ? [{
      label: "Lander Δv (stage 3 legs)", value: Math.round(dv3), limit: deepNeed, dir: "over" as const, unit: "m/s",
      ok: dv3 >= deepNeed,
      detail: `Deep-space legs: ${deepLegs.map((l) => `${l.name} ${l.dv}`).join(" + ")} = ${deepNeed} m/s. Lander delivers ${Math.round(dv3)}.`,
    }] : []),
    { label: "Stage mass fraction", value: Math.round(s1c.wet / s1c.dry), limit: 13, dir: "under" as const, unit: "×",
      ok: s1c.wet / s1c.dry <= 13, detail: `Wet/dry ratio ${(s1c.wet / s1c.dry).toFixed(1)} — real boosters hit 8-13×` },
  ];

  return (
    <div className="app">
      <header>
        <button className="ghost" onClick={onExit}>← back to solar system</button>
        <span className="status live">🎓 ROCKET BUILDER — build a real rocket, land on real worlds</span>
      </header>

      <div className="lab-steps">
        {["1 · Payload", "2 · Engines", "3 · Propellant", "4 · Standards", "5 · Launch!"].map((t, i) => (
          <button key={t} className={`stepchip ${i === step ? "active" : i < step ? "done" : ""}`} onClick={() => setStep(i)}>{t}</button>
        ))}
      </div>

      <Lesson i={Math.min(step, LESSONS.length - 1)} />

      {step === 0 && (
        <div className="grid">
          {PAYLOADS.map((p) => (
            <button key={p.id} className={`card ${payloadId === p.id ? "picked" : ""}`} onClick={() => setPayloadId(p.id)}>
              <h2>{p.name}</h2><p className="muted">{p.blurb}</p><p className="real">mass: {p.mass.toLocaleString()} kg</p>
            </button>
          ))}
          <button className="card picked" onClick={() => {
            const order = ["leo", "moon", "mars"];
            setTargetId(order[(order.indexOf(targetId) + 1) % 3]);
          }}>
            <h2>{target.name}</h2>
            <p className="muted">{target.blurb}</p>
            <p className="real">Δv budget: {target.dv.toLocaleString()} m/s across {target.legs.length} leg{target.legs.length > 1 ? "s" : ""} — click to change destination</p>
            {deepLegs.length > 0 && <p className="muted">Legs: {target.legs.slice(1).map((l) => `${l.name} (${l.dv})`).join(" → ")}</p>}
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="design">
          <div className="panel"><h3>Stage 1 booster engines</h3>
            {ENGINES.filter((e) => e.stageHint !== "upper").map((e) => (
              <Choice key={e.id} active={s1.engineId === e.id} onClick={() => setS1((x) => ({ ...x, engineId: e.id, engineCount: e.id === "merlin" ? 9 : 1 }))}
                title={`${e.name}${s1.engineId === e.id ? ` ×${s1.engineCount}` : ""}`}
                sub={`${e.thrustKN} kN thrust · Isp ${e.ispSL}/${e.ispVac}s · ${e.mass} kg · ${e.cycle} · ${e.source}`} />
            ))}
            <p className="muted">Merlin flies in a cluster of 9 — real F9 does exactly that.</p>
          </div>
          <div className="panel"><h3>Stage 2 upper engine</h3>
            {ENGINES.map((e) => (
              <Choice key={e.id} active={s2.engineId === e.id} onClick={() => setS2((x) => ({ ...x, engineId: e.id, engineCount: 1 }))}
                title={e.name} sub={`Isp vac ${e.ispVac}s · ${e.mass} kg · ${e.cycle} · ${e.source}`} />
            ))}
          </div>
          {deepLegs.length > 0 && (
            <div className="panel"><h3>Stage 3 — lander (used for {deepLegs.map((l) => l.name).join(", ")})</h3>
              {ENGINES.filter((e) => e.stageHint !== "first").map((e) => (
                <Choice key={e.id} active={s3.engineId === e.id} onClick={() => setS3((x) => ({ ...x, engineId: e.id, engineCount: 1 }))}
                  title={e.name} sub={`Isp vac ${e.ispVac}s · ${e.mass} kg · ${e.cycle} · ${e.source}`} />
              ))}
              <p className="muted">💡 {target.id === "mars" ? "Mars: aerobraking does the heavy braking — your lander only needs the TMI push!" : "Moon: no air, so the lander must provide TLI + LOI + descent ALL by engines."}</p>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="panel">
          <h3>Stage 1 propellant</h3>
          <input type="range" min={50000} max={1000000} step={10000} value={s1.propMass}
            onChange={(e) => setS1((x) => ({ ...x, propMass: +e.target.value }))} style={{ width: "100%" }} />
          <p>{(s1.propMass / 1000).toFixed(0)} tonnes of propellant ({e1.cycle}) — Falcon 9 stage 1 carries ~400 t</p>
          <h3>Stage 2 propellant</h3>
          <input type="range" min={2000} max={120000} step={1000} value={s2.propMass}
            onChange={(e) => setS2((x) => ({ ...x, propMass: +e.target.value }))} style={{ width: "100%" }} />
          <p>{(s2.propMass / 1000).toFixed(0)} tonnes — Centaur carries ~20 t</p>
          {deepLegs.length > 0 && (
            <>
              <h3>Stage 3 (lander) propellant</h3>
              <input type="range" min={1000} max={40000} step={500} value={s3.propMass}
                onChange={(e) => setS3((x) => ({ ...x, propMass: +e.target.value }))} style={{ width: "100%" }} />
              <p>{(s3.propMass / 1000).toFixed(1)} tonnes for the deep-space legs (need {deepNeed.toLocaleString()} m/s total)</p>
            </>
          )}
          <p className="muted">More fuel = more speed… but heavier rocket! The equation decides who wins.</p>
        </div>
      )}

      {step === 3 && (
        <div className="gauges">
          {checks.map((c) => (
            <div key={c.label} className={`gauge ${c.ok ? "" : "fail"}`}>
              <div className="gauge-label"><strong>{c.ok ? "✅" : "❌"} {c.label}</strong>
                <span>{c.dir === "over" ? `${c.value.toLocaleString()} / needs ${c.limit.toLocaleString()} ${c.unit}` : `${c.value.toLocaleString()} / max ${c.limit.toLocaleString()} ${c.unit}`}</span></div>
              <div className="bar"><div className="fill" style={{ width: `${c.dir === "over" ? Math.min(100, c.limit / Math.max(0.001, c.value) * 100) : Math.min(100, c.value / Math.max(0.001, c.limit) * 100)}%` }} /></div>
              <p className="muted">{c.detail}</p>
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <AscentSim
          s1c={s1c} e1={e1} s2c={s2c} e2={e2}
          payloadMass={payload.mass}
          legs={target.legs}
          landerDv={dv3}
          targetName={target.name.replace(/^[^\w]+\s*/, "")}
          success={checks.every((c) => c.ok)}
        />
      )}

      <div className="actions">
        {step < 4 && <button className="big" onClick={() => setStep((s) => s + 1)}>Next step →</button>}
        {step === 3 && checks.every((c) => c.ok) && <p className="banner">🎉 All standards passed — you built a real rocket design!</p>}
        {step === 3 && !checks.every((c) => c.ok) && <p className="banner">🔧 Fix the ❌ checks — real engineers iterate too!</p>}
      </div>
    </div>
  );
}

function Choice({ active, title, sub, onClick }: { active: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button className={`choice ${active ? "active" : ""}`} onClick={onClick}>
      <strong>{title}</strong><span>{sub}</span>
    </button>
  );
}

function Lesson({ i }: { i: number }) {
  const l = LESSONS[i];
  return (
    <div className="panel lesson">
      <h3>📘 {l.title}</h3>
      <p>{l.kid}</p>
      <p className="real">Real standard: {l.standard}</p>
    </div>
  );
}

/* ------------------- multi-phase launch + mission legs sim ------------------- */

function AscentSim({ s1c, e1, s2c, e2, payloadMass, legs, landerDv, targetName, success }: {
  s1c: { wet: number; dry: number; thrustKN: number; isp: number };
  e1: RocketEngine;
  s2c: { wet: number; dry: number; thrustKN: number; isp: number };
  e2: RocketEngine;
  payloadMass: number;
  legs: Leg[];
  landerDv: number;
  targetName: string;
  success: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const cv = ref.current!;
    const g = cv.getContext("2d")!;
    const dt = 0.4;           // sim seconds per step
    const SUB = 2;            // steps per frame → TIMEWARP ≈ 80×
    const events: string[] = [];
    const push = (s: string) => { events.push(s); setLog([...events].reverse().slice(0, 7)); };

    // mutable sim state
    let phase: "ascent" | "legs" | "done" = "ascent";
    let stage = 1;
    let m = s1c.wet;
    let thrust = s1c.thrustKN * 1000;
    let isp = e1.ispSL;
    let v = 0, alt = 0, t = 0;
    let sepFlash = 0;
    let landerDvLeft = landerDv;
    let legIdx = 0, legTimer = 0, legProgress = 0, touchY = 0;
    let announcedLiftoff = false;
    let raf = 0;

    const finish = (msg: string) => { push(msg); phase = "done"; setRunning(false); };

    const loop = () => {
      raf = requestAnimationFrame(loop);

      /* ---------------- physics: ascent (stages 1 & 2) ---------------- */
      if (phase === "ascent") {
        for (let k = 0; k < SUB; k++) {
          const floor = stage === 1 ? s1c.dry : payloadMass + 1;
          if (m > floor) {
            const mdot = thrust / (isp * G0);
            const rho = Math.exp(-alt / 8500);           // exponential atmosphere
            const drag = alt < 90000 ? v * v * rho * 0.0000035 : 0;
            const a = thrust / m - G0 - drag;
            v = Math.max(0, v + a * dt);
            alt += v * dt;
            m = Math.max(floor, m - mdot * dt);
            t += dt;
          } else if (stage === 1) {
            push(`🔥 STAGE SEPARATION — booster dropped at t=${t.toFixed(0)}s, alt ${Math.round(alt / 1000)} km, ${Math.round(v)} m/s. Lighter rocket = more Δv!`);
            sepFlash = 1;
            stage = 2; m = s2c.wet; thrust = s2c.thrustKN * 1000; isp = e2.ispVac;
          } else {
            // stage 2 exhausted
            if (v >= 7600 && alt >= 180000) {
              push(`🏆 LEO ACHIEVED — t=${t.toFixed(0)}s, ${Math.round(alt / 1000)} km, ${Math.round(v)} m/s`);
              if (legs.length > 1) { phase = "legs"; push(`🛰 Next: ${legs[1].name} — need ${legs[1].dv.toLocaleString()} m/s from the lander stage`); }
              else finish(success ? "🎉 MISSION COMPLETE! Your rocket reached orbit." : "Mission reached orbit (with ⚠ standards violations).");
              break;
            } else {
              finish(`💥 Stage 2 burned out at ${Math.round(alt / 1000)} km, ${Math.round(v)} m/s — orbit needs 7,600 m/s. Add propellant or a better engine!`);
              break;
            }
          }
        }
        if (phase === "ascent" && !announcedLiftoff && v > 0.5) {
          announcedLiftoff = true;
          push(`🚀 LIFTOFF! TWR = ${((s1c.thrustKN * 1000) / (s1c.wet * G0)).toFixed(2)} (need ≥ 1.2)`);
        }
      }

      /* ---------------- scripted mission legs (deep space) ---------------- */
      if (phase === "legs") {
        legTimer += 0.032; // real seconds
        const leg = legs[legIdx + 1];
        if (leg && legTimer >= 2.4) {
          legTimer = 0; legIdx++;
          legProgress = legIdx / (legs.length - 1);
          if (landerDvLeft >= leg.dv) {
            landerDvLeft -= leg.dv;
            if (legIdx === legs.length - 1) {
              push(`✅ ${leg.name} — ${leg.dv.toLocaleString()} m/s burned (${leg.blurb})`);
              push(`🎉 TOUCHDOWN ON ${targetName.toUpperCase()}! Lander Δv remaining: ${Math.round(landerDvLeft)} m/s. ${targetName === "Mars" ? "The atmosphere did the heavy braking!" : "Engines all the way down!"}`);
              finish("🏆 FULL MISSION SUCCESS — orbit, transit, and landing!");
              return;
            } else {
              push(`✅ ${leg.name} complete — ${leg.dv.toLocaleString()} m/s. ${leg.blurb}`);
              push(`🛰 Next: ${legs[legIdx + 1]?.name} — need ${legs[legIdx + 1]?.dv.toLocaleString()} m/s`);
            }
          } else {
            push(`💥 Not enough Δv for ${leg.name}: needed ${leg.dv.toLocaleString()}, lander has ${Math.round(landerDvLeft)}. Add lander propellant!`);
            finish("MISSION FAILED at deep-space legs. Iterate!");
            return;
          }
        }
      }

      /* ---------------- draw ---------------- */
      const w = cv.width, h = cv.height;
      g.clearRect(0, 0, w, h);

      if (phase === "ascent" || (phase === "done" && legs.length === 1)) {
        const sky = Math.min(1, alt / 120000);
        const grad = g.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, `rgb(${8},${10 + sky * 4},${26 + sky * 14})`);
        grad.addColorStop(1, sky < 0.4 ? "#16223f" : "#0b0e1a");
        g.fillStyle = grad; g.fillRect(0, 0, w, h);
        if (sky > 0.5) { g.fillStyle = "#bfcfff"; for (let i = 0; i < 40; i++) g.fillRect((i * 97) % w, (i * 61) % (h * 0.6), 2, 2); }
        const groundY = h - Math.max(10, 40 - alt / 2000);
        if (alt < 120000) { g.fillStyle = "#22305a"; g.fillRect(0, groundY, w, h - groundY); }
        const ry = groundY - Math.min(h - 90, alt / 150) - 30;
        if (sepFlash > 0) sepFlash -= 0.04;
        g.save(); g.translate(w / 2, ry);
        // dropped booster tumbling away
        if (sepFlash > 0) {
          g.save(); g.translate(-34 * (1 - sepFlash), 60 * (1 - sepFlash)); g.rotate((1 - sepFlash) * 1.2);
          g.fillStyle = "#8b96b5"; g.fillRect(-6, -50, 12, 60); g.restore();
        }
        g.fillStyle = stage === 1 ? "#e8ecf8" : "#8b96b5";
        g.fillRect(-6, -40, 12, stage === 1 ? 44 : 24);
        g.beginPath(); g.moveTo(-6, -40); g.lineTo(0, -52); g.lineTo(6, -40); g.fill();
        if (thrust > 0 && m > (stage === 1 ? s1c.dry : payloadMass + 1)) {
          g.fillStyle = "#ffb020";
          g.beginPath(); g.moveTo(-5, stage === 1 ? 4 : 0); g.lineTo(0, (stage === 1 ? 4 : 0) + 18 + Math.random() * 10); g.lineTo(5, stage === 1 ? 4 : 0); g.fill();
        }
        g.restore();
        g.fillStyle = "#e8ecf8"; g.font = "13px monospace";
        g.fillText(`TIMEWARP ×80  t=${t.toFixed(0)}s  alt=${Math.round(alt / 1000)} km  v=${Math.round(v)} m/s  stage=${stage}${sepFlash > 0 ? "  ✨ SEPARATING" : ""}`, 12, 24);
      } else {
        // deep-space scene: stars + destination world growing
        g.fillStyle = "#0b0e1a"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#bfcfff"; for (let i = 0; i < 60; i++) g.fillRect((i * 97) % w, (i * 61) % h, 2, 2);
        const isMars = targetName === "Mars";
        const planetColor = isMars ? "#c1440e" : "#9aa0a6";
        const pr = phase === "legs" ? 46 + legProgress * 150 : 196;
        const px = w * 0.72, py = phase === "legs" ? h * 0.55 + legProgress * 30 : h * 0.85;
        g.fillStyle = planetColor;
        g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
        // craters / surface detail
        g.fillStyle = "rgba(0,0,0,0.15)";
        for (let i = 0; i < 7; i++) {
          const ca = i * 1.7, cr = pr * (0.25 + (i % 3) * 0.12);
          g.beginPath(); g.arc(px + Math.cos(ca) * pr * 0.5, py + Math.sin(ca) * pr * 0.5, cr * 0.25, 0, Math.PI * 2); g.fill();
        }
        // lander drifting toward planet / landing view on final leg
        const finalLeg = legIdx === legs.length - 2;
        const lx = finalLeg ? px : w * 0.35 - legProgress * 60;
        const ly = finalLeg ? py - pr - 40 - (touchY += phase === "legs" ? 1.4 : 0) : h * 0.4;
        g.save(); g.translate(lx, ly);
        g.fillStyle = "#e8ecf8"; g.fillRect(-10, -8, 20, 14);
        g.strokeStyle = "#e8ecf8"; g.beginPath(); g.moveTo(-8, 6); g.lineTo(-12, 14); g.moveTo(8, 6); g.lineTo(12, 14); g.stroke();
        if (phase === "legs" && legIdx > 0 && legIdx < legs.length - 2) {
          g.fillStyle = "#ffb020"; g.beginPath(); g.moveTo(-4, 8); g.lineTo(0, 8 + 14 + Math.random() * 8); g.lineTo(4, 8); g.fill();
        }
        g.restore();
        g.fillStyle = "#e8ecf8"; g.font = "13px monospace";
        g.fillText(`MISSION LEG ${Math.min(legIdx + 1, legs.length - 1)}/${legs.length - 1} · lander Δv left ${Math.round(Math.max(0, landerDvLeft))} m/s`, 12, 24);
        if (phase === "legs") g.fillText(`⏱ next leg event in ${(2.4 - legTimer).toFixed(1)}s`, 12, 44);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, s1c, s2c, e1, e2, payloadMass, legs, landerDv, targetName, success]);

  return (
    <div className="panel">
      <h3>🚀 Launch: {legs.length > 1 ? `${targetName} landing mission` : "ascent to orbit"}</h3>
      <canvas ref={ref} width={760} height={340} style={{ width: "100%", borderRadius: 8, border: "1px solid var(--line)" }} />
      <div className="actions">
        {!running && <button className="big" onClick={() => { setLog([]); setRunning(true); }}>🔥 Ignition!</button>}
        {running && <p className="banner">Flying… watch for STAGE SEPARATION{legs.length > 1 ? ", then the deep-space legs" : ""}</p>}
      </div>
      {log.map((l, i) => <p key={i} className="real">{l}</p>)}
      <p className="muted">Physics: real thrust & Isp, exponential atmosphere drag, staging, then scripted mission legs with real Δv costs (TLI 3,200 · LOI 900 · descent 1,600 — Mars saves ~2,600 m/s via aerobraking).</p>
    </div>
  );
}
