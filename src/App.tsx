import { useEffect, useMemo, useState } from "react";
import {
  MISSIONS, LAUNCH_VEHICLES, INSTRUMENTS, POWER_SYSTEMS, COMMS_SYSTEMS, PROPULSION,
} from "./data/catalogs";
import { fetchSolarFlares, fetchAsteroidTargets, fetchApod, type NasaEvent, type AsteroidTarget } from "./data/nasa";
import { computeBudget, runChecks, simulate, type DesignState, type SimResult } from "./game/engine";
import OrbitView from "./components/OrbitView";
import Leaderboard from "./components/Leaderboard";
import SolarSystemView from "./components/SolarSystemView";
import Assistant from "./components/Assistant";
import RocketLab from "./components/RocketLab";
import { CREW } from "./data/crew";
import { addScore } from "./game/scores";
import { setAssistantCtx } from "./game/assistant";
import { downloadGmatScript } from "./game/gmat";
import { SCIENCE_OBJECTIVES, MEASURES, type ScienceObjective } from "./data/catalogs";

type Phase = "brief" | "design" | "sim" | "debrief" | "lab";

const emptyDesign: DesignState = {
  missionId: "", vehicleId: "", instrumentIds: [], powerId: "", commsId: "", propulsionId: "", crewIds: [],
};

/** Baseline design pre-selected on mission pick, so the design console renders
 *  immediately and the player iterates from a working (budget) configuration. */
const defaultDesign: DesignState = {
  missionId: "",
  vehicleId: "falcon9",
  instrumentIds: [],
  powerId: "solarmed",
  commsId: "xband",
  propulsionId: "hydrazine",
  crewIds: [],
};

function GameApp() {
  const [phase, setPhase] = useState<Phase>("brief");
  const [design, setDesign] = useState<DesignState>(emptyDesign);
  const [liveEvents, setLiveEvents] = useState<NasaEvent[]>([]);
  const [asteroids, setAsteroids] = useState<AsteroidTarget[]>([]);
  const [apod, setApod] = useState<{ title: string; url: string } | null>(null);
  const [sim, setSim] = useState<SimResult | null>(null);
  const [commanderName, setCommanderName] = useState("Commander");
  const [saved, setSaved] = useState<{ id: string; rank: number } | null>(null);
  const [nasaStatus, setNasaStatus] = useState<"connecting" | "live" | "offline">("connecting");

  const mission = MISSIONS.find((m) => m.id === design.missionId);
  const budget = useMemo(
    () => (design.vehicleId ? computeBudget(design) : null),
    [design],
  );
  const checks = useMemo(
    () => (budget && mission ? runChecks(design, { ...budget, requiredDeltaV: mission.deltaV, budgetCap: mission.budgetCap, usefulLoadKg: mission.usefulLoadKg }) : null),
    [budget, mission, design],
  );

  /* Concept Maturity Level (JPL CML framework): the concept matures as
     the design proves out — CML1 idea → CML2 partially feasible →
     CML3 standards pass → CML4 demonstrated (mission record logged). */
  const cml = useMemo(() => {
    if (saved && sim?.success) return 4;
    if (sim?.success) return 3;
    if (checks?.every((c) => c.ok)) return 3;
    if (checks && checks.filter((c) => c.ok).length >= Math.ceil(checks.length / 2)) return 2;
    return 1;
  }, [checks, sim, saved]);

  /* NOVA assistant gets live context on every screen */
  useEffect(() => {
    setAssistantCtx({
      screen: phase,
      missionName: mission?.name,
      failingChecks: checks?.filter((c) => !c.ok).map((c) => c.label),
      budgetSummary: budget ? `$${Math.round(budget.cost)}M of $${mission?.budgetCap}M cap, ${Math.round(budget.wetMass)} kg wet` : undefined,
      crew: CREW.filter((c) => design.crewIds.includes(c.id)).map((c) => c.name),
      details: phase === "design" && checks
        ? `${checks.filter((c) => c.ok).length}/${checks.length} standards green${budget ? ` · ${Math.round(budget.cost)}M of ${mission?.budgetCap}M` : ""}`
        : undefined,
    });
  }, [phase, mission, checks, budget, design]);

  /* Fetch real DONKI space-weather events for the cruise window + NeoWs targets */
  useEffect(() => {
    if (phase !== "design" || !mission) return;
    (async () => {
      setNasaStatus("connecting");
      const start = new Date().toISOString().slice(0, 10);
      const end = new Date(Date.now() + mission.cruiseDays * 86400_000).toISOString().slice(0, 10);
      const [flares, neos] = await Promise.all([fetchSolarFlares(start, end), fetchAsteroidTargets()]);
      setLiveEvents(flares);
      setAsteroids(neos);
      setNasaStatus(flares.length > 0 || neos.length > 3 ? "live" : "offline");
    })();
  }, [phase, mission]);

  useEffect(() => {
    if (phase !== "debrief") return;
    fetchApod().then(setApod);
  }, [phase]);

  /* --------------------------------- Phase: BRIEFING (open-world map) ------------------------------- */
  if (phase === "brief") {
    return (
      <SolarSystemView
        onDesign={(missionId) => {
          setDesign({ ...defaultDesign, missionId });
          setPhase("design");
        }}
        onLab={() => setPhase("lab")}
      />
    );
  }

  /* --------------------------------- Phase: ROCKET LAB --------------------------------------------- */
  if (phase === "lab") {
    return <RocketLab onExit={() => setPhase("brief")} />;
  }

  /* --------------------------------- Phase: DESIGN ---------------------------------- */
  if (phase === "design" && mission && checks) {
    const toggleInstrument = (id: string) => setDesign((d) => ({
      ...d,
      instrumentIds: d.instrumentIds.includes(id) ? d.instrumentIds.filter((x) => x !== id) : [...d.instrumentIds, id],
    }));

    return (
      <Shell status={nasaStatus} onBack={() => setPhase("brief")}>
        <h1 className="title">{mission.name}</h1>
        <p className="subtitle">{mission.brief}</p>
        {mission.target === "deep" && asteroids.length > 0 && (
          <p className="banner">🛰 Live NASA NeoWs targets this week: {asteroids.slice(0, 3).map((a) => a.name).join(", ")}</p>
        )}

        <div className="design">
          <div className="panel">
            <h3>Launch vehicle</h3>
            {LAUNCH_VEHICLES.map((v) => (
              <Choice key={v.id} active={design.vehicleId === v.id} onClick={() => setDesign((d) => ({ ...d, vehicleId: v.id }))}
                title={v.name} sub={`$${v.cost}M · LEO ${v.massToLEO.toLocaleString()}kg · Mars ${v.massToMars.toLocaleString()}kg · ${(v.reliability * 100).toFixed(1)}%`} />
            ))}
            <h3>Propulsion</h3>
            {PROPULSION.map((p) => (
              <Choice key={p.id} active={design.propulsionId === p.id} onClick={() => setDesign((d) => ({ ...d, propulsionId: p.id }))}
                title={p.name} sub={`$${p.cost}M · Isp ${p.isp}s · ${p.propMass}kg prop · ${p.mass}kg dry`} />
            ))}
          </div>

          <div className="panel">
            <h3>Power system</h3>
            {POWER_SYSTEMS.map((p) => (
              <Choice key={p.id} active={design.powerId === p.id} onClick={() => setDesign((d) => ({ ...d, powerId: p.id }))}
                title={p.name} sub={`$${p.cost}M · ${p.powerW}W · ${p.mass}kg · targets: ${p.worksAt.join(", ")}`} />
            ))}
            <h3>Communications</h3>
            {COMMS_SYSTEMS.map((c) => (
              <Choice key={c.id} active={design.commsId === c.id} onClick={() => setDesign((d) => ({ ...d, commsId: c.id }))}
                title={c.name} sub={`$${c.cost}M · ${c.dataRateMbps} Mbps to DSN · ${c.powerW}W draw`} />
            ))}
          </div>

          <div className="panel">
            <h3>Instruments (click to add/remove)</h3>
            {INSTRUMENTS.map((i) => (
              <Choice key={i.id} active={design.instrumentIds.includes(i.id)} onClick={() => toggleInstrument(i.id)}
                title={i.name} sub={`$${i.cost}M · ${i.mass}kg · ${i.power}W · ${i.dataRate}Mbps · science: ${mission.valuedKinds.includes(i.kind) ? "⭐ objective fit" : "side value"}`} />
            ))}
          </div>

          <div className="panel">
            <h3>Crew — real NASA astronauts (+105kg seat, +$8M life support each)</h3>
            {CREW.map((a) => (
              <Choice key={a.id} active={design.crewIds.includes(a.id)}
                onClick={() => setDesign((d) => ({ ...d, crewIds: d.crewIds.includes(a.id) ? d.crewIds.filter((x) => x !== a.id) : [...d.crewIds, a.id] }))}
                title={`${a.name} — ${a.role}`}
                sub={`eng ${a.skills.engineering} · sci ${a.skills.science} · ops ${a.skills.ops} · med ${a.skills.medicine} · EVA ${a.skills.eva} — ${a.bio}`} />
            ))}
          </div>
        </div>

        <OrbitView target={mission.target} className="viz" />

        <div className="cml-row">
          <span className={`cml-badge cml${cml}`} title="Concept Maturity Levels — JPL framework (dataverse.jpl.nasa.gov hdl:2014/44299)">
            CML {cml} / 4 — {["idea", "partially feasible", "standards pass (point design)", "demonstrated"][cml - 1]}
          </span>
        </div>

        <StmPanel missionId={mission.id} instrumentIds={design.instrumentIds} />

        <Gauges budget={budget!} checks={checks} />

        <div className="actions">
          <button className="big" disabled={!checks.every((c) => c.ok)}
            onClick={() => { setSim(null); setSaved(null); setPhase("sim"); }}>
            {checks.every((c) => c.ok) ? "▶ Commit design & simulate mission" : "⚠ Fix red checks first"}
          </button>
        </div>
      </Shell>
    );
  }

  /* --------------------------------- Phase: SIM ------------------------------------- */
  if (phase === "sim" && mission && budget && checks) {
    const run = () => {
      const result = simulate(design, budget, liveEvents);
      setSim(result);
      setSaved(null);
      setPhase("debrief");
    };
    return (
      <Shell status={nasaStatus} onBack={() => setPhase("design")}>
        <h1 className="title">Launch commit</h1>
        <p className="subtitle">
          {liveEvents.length > 0
            ? `☀ ${liveEvents.length} real solar flares (NASA DONKI) will occur during your cruise window — including ${liveEvents.filter((e) => e.severity >= 0.55).length} severe.`
            : "NASA DONKI unavailable — falling back to historical anomaly profiles."}
        </p>
        <div className="actions">
          <button className="big" onClick={run}>🚀 T-minus 0 — launch</button>
        </div>
      </Shell>
    );
  }

  /* --------------------------------- Phase: DEBRIEF --------------------------------- */
  if (phase === "debrief" && sim && mission) {
    return (
      <Shell status={nasaStatus} onBack={() => setPhase("design")}>
        <h1 className="title">{sim.grade}</h1>
        <div className="cml-row">
          <span className={`cml-badge cml${cml}`} title="Concept Maturity Levels — JPL framework">
            CML {cml} / 4 — {["idea", "partially feasible", "standards pass (point design)", "demonstrated"][cml - 1]}
          </span>
        </div>
        <OrbitView target={mission.target} health={sim.finalHealth} className="viz" />
        <div className="timeline">
          {sim.steps.map((s, i) => (
            <div key={i} className={`step ${s.healthDelta <= -0.5 ? "bad" : s.healthDelta < 0 ? "warn" : "good"}`}>
              <div className="step-head">Day {s.day} · {s.phase}</div>
              {s.event && <div className="event">☀ {s.event.title} {s.event.source === "DONKI" ? <em className="live">[NASA DONKI live data]</em> : <em className="muted">[historical profile]</em>}</div>}
              <div className="consequence">{s.consequence}</div>
              {s.healthDelta !== 0 && <div className="delta">health {s.healthDelta > 0 ? "+" : ""}{Math.round(s.healthDelta * 100)}%</div>}
            </div>
          ))}
        </div>
        <div className="facts">
          <span>Science {sim.scienceScore} pts</span>
          <span>Health {Math.round(sim.finalHealth * 100)}%</span>
          <span>Cost ${Math.round(budget!.cost)}M / cap ${mission.budgetCap}M</span>
        </div>

        <div className="save-row">
          {saved ? (
            <p className="banner">🎖 Mission record logged — rank #{saved.rank} on the leaderboard!</p>
          ) : (
            <>
              <input
                className="name-input"
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                maxLength={24}
                placeholder="Commander name"
              />
              <button className="big"
                onClick={() => {
                  const { entry, rank } = addScore({
                    name: commanderName.trim() || "Anonymous",
                    missionId: mission.id,
                    missionName: mission.name,
                    science: sim.scienceScore,
                    health: sim.finalHealth,
                    cost: budget!.cost,
                    grade: sim.grade,
                  });
                  setSaved({ id: entry.id, rank });
                }}>
                🏅 Log mission record
              </button>
            </>
          )}
        </div>
        <Leaderboard missionId={mission.id} highlightId={saved?.id} title={`${mission.name} — Records`} />

        <p className="real">Compare with the real {mission.realMission.name}: {mission.realMission.link}</p>
        {apod && (
          <figure>
            <img src={apod.url} alt={apod.title} style={{ maxWidth: "100%", borderRadius: 8 }} />
            <figcaption className="muted">NASA APOD: {apod.title}</figcaption>
          </figure>
        )}
        <div className="actions">
          <button className="big" onClick={() => downloadGmatScript(design)}>⬇ Export GMAT script (NASA tool)</button>
          <button className="big" onClick={() => setPhase("design")}>↩ Iterate on design</button>
          <button className="big ghost" onClick={() => { setDesign({ ...defaultDesign }); setPhase("brief"); }}>New mission</button>
        </div>
      </Shell>
    );
  }

  return <Shell status={nasaStatus}><p>Loading…</p></Shell>;
}

/* ------------------------------- Small components ------------------------------- */

function Shell({ children, status, onBack }: { children: React.ReactNode; status: string; onBack?: () => void }) {
  return (
    <div className="app">
      <header>
        {onBack && <button className="ghost" onClick={onBack}>← back</button>}
        <span className={`status ${status}`}>NASA API: {status === "live" ? "● LIVE" : status === "connecting" ? "…" : "○ offline (fallback data)"}</span>
      </header>
      <main>{children}</main>
    </div>
  );
}

function Choice({ active, title, sub, onClick }: { active: boolean; title: string; sub: string; onClick: () => void }) {
  return (
    <button className={`choice ${active ? "active" : ""}`} onClick={onClick}>
      <strong>{title}</strong>
      <span>{sub}</span>
    </button>
  );
}

function Gauge({ label, value, limit, ok, unit, dir }: {  label: string; value: number; limit: number; ok: boolean; unit: string; dir: "under" | "over";
}) {
  // "under": bar = how close value is to the cap (100% = at/over cap).
  // "over":  bar = how much of the capability the requirement consumes
  //          (100% = capability fully used or exceeded).
  const pct = dir === "under"
    ? Math.min(100, (value / Math.max(1, limit)) * 100)
    : Math.min(100, (limit / Math.max(1, value)) * 100);
  return (
    <div className={`gauge ${ok ? "" : "fail"}`}>
      <div className="gauge-label">
        <strong>{label}</strong>
        <span>{dir === "under"
          ? `${value.toLocaleString()} / ${limit.toLocaleString()} ${unit}`
          : `${limit.toLocaleString()} ${unit} required / ${value.toLocaleString()} available`}</span>
      </div>
      <div className="bar"><div className="fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function Gauges({ budget, checks }: { budget: NonNullable<ReturnType<typeof computeBudget>>; checks: NonNullable<ReturnType<typeof runChecks>> }) {
  return (
    <div className="gauges">
      {checks.map((c) => <Gauge key={c.label} {...c} />)}
      <p className="muted">Wet mass {Math.round(budget.wetMass)} kg (dry {Math.round(budget.dryMass)}) · Δv via Tsiolkovsky · onboard recorder duty-cycles payload (≤250% of pipe) · source-cited parameters</p>
    </div>
  );
}

/** App shell — NOVA assistant overlays every screen of the game. */
export default function App() {
  return (
    <>
      <GameApp />
      <Assistant />
    </>
  );
}

/** Science Traceability Matrix — NASA "Design and Develop Science
 *  Missions" practice (also the Mission Design Lab review format):
 *  science objective → measured by → instrument status. */
function StmPanel({ missionId, instrumentIds }: { missionId: string; instrumentIds: string[] }) {
  const objectives: ScienceObjective[] = SCIENCE_OBJECTIVES[missionId] ?? [];
  const selected = INSTRUMENTS.filter((i) => instrumentIds.includes(i.id));
  return (
    <div className="panel stm">
      <h3>🔬 Science Traceability Matrix <span className="muted">(objective → measurement → instrument)</span></h3>
      {objectives.length === 0 ? <p className="muted">No traceability defined for this mission.</p> : (
        <table>
          <thead><tr><th>Science objective</th><th>Measured by</th><th>Your instruments</th><th></th></tr></thead>
          <tbody>
            {objectives.map((o) => {
              const matched = selected.filter((i) => o.kinds.includes(i.kind));
              return (
                <tr key={o.text} className={matched.length ? "ok" : "missing"}>
                  <td>{o.text}</td>
                  <td className="muted">{o.kinds.map((k) => MEASURES[k]).join(" · ")}</td>
                  <td>{matched.length ? matched.map((m) => m.name).join(", ") : <em className="muted">none selected</em>}</td>
                  <td>{matched.length ? "✓" : "⚠"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="muted">Every ⚠ row is science your mission can't deliver — that's how real NASA concept reviews catch gaps before launch.</p>
    </div>
  );
}
