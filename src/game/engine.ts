/**
 * Mission constraint engine + turn-based simulation.
 *
 * Engineering model (simplified but defensible):
 *  - dry mass  = propulsion dry + power + comms + instruments
 *  - wet mass  = dry + propellant
 *  - delta-v   = Isp * g0 * ln(wet / dry)          [Tsiolkovsky]
 *  - science   = sum of instrument values matching objective kinds,
 *                scaled down by data-rate bottleneck vs comms capacity
 *  - link      = required instrument data rate must fit comms pipe
 */
import {
  INSTRUMENTS, POWER_SYSTEMS, COMMS_SYSTEMS, PROPULSION, LAUNCH_VEHICLES,
  FALLBACK_EVENTS, MISSIONS, type Instrument,
} from "../data/catalogs";
import { CREW, CREW_SEAT_COST, CREW_SEAT_MASS, type Astronaut } from "../data/crew";
import type { NasaEvent } from "../data/nasa";

export interface DesignState {
  missionId: string;
  vehicleId: string;
  instrumentIds: string[];
  powerId: string;
  commsId: string;
  propulsionId: string;
  crewIds: string[];
}

export interface Budget {
  dryMass: number;
  wetMass: number;
  deltaV: number;
  requiredDeltaV: number;
  cost: number;
  budgetCap: number;
  power: number;
  powerDraw: number;
  dataRate: number;   // instruments produce
  commsRate: number;  // comms can downlink
  usefulLoadKg: number;
  launchReliability: number;
}

const G0 = 9.80665;

/** Onboard solid-state recorder duty-cycle allowance (like LRO/MRO):
 *  instruments may average up to this multiple of the downlink pipe;
 *  the payload simply runs duty-cycled and science returns proportional
 *  to the comms-limited fraction. Beyond this multiple the buffer can
 *  never drain — genuinely infeasible. */
const DATA_DUTY_CYCLE_LIMIT = 2.5;

export function computeBudget(d: DesignState): Budget {
  const veh = LAUNCH_VEHICLES.find((v) => v.id === d.vehicleId) ?? LAUNCH_VEHICLES[0];
  const power = POWER_SYSTEMS.find((p) => p.id === d.powerId) ?? POWER_SYSTEMS[0];
  const comms = COMMS_SYSTEMS.find((c) => c.id === d.commsId) ?? COMMS_SYSTEMS[0];
  const prop = PROPULSION.find((p) => p.id === d.propulsionId) ?? PROPULSION[0];
  const instruments = INSTRUMENTS.filter((i) => d.instrumentIds.includes(i.id));
  const crew = CREW.filter((c) => d.crewIds.includes(c.id));

  const dryMass = prop.mass + power.mass + comms.mass + instruments.reduce((s, i) => s + i.mass, 0)
    + crew.length * CREW_SEAT_MASS;
  const wetMass = dryMass + prop.propMass;
  const deltaV = prop.isp * G0 * Math.log(wetMass / dryMass);

  const cost = veh.cost + prop.cost + power.cost + comms.cost
    + instruments.reduce((s, i) => s + i.cost, 0)
    + crew.length * CREW_SEAT_COST;

  const powerDraw = comms.powerW + instruments.reduce((s, i) => s + i.power, 0);
  const dataRate = instruments.reduce((s, i) => s + i.dataRate, 0);

  return {
    dryMass, wetMass, deltaV,
    requiredDeltaV: 0, // filled by caller (objective)
    cost, budgetCap: 0,
    power: power.powerW, powerDraw,
    dataRate, commsRate: comms.dataRateMbps,
    usefulLoadKg: 0,
    launchReliability: veh.reliability,
  };
}

export interface Check {
  ok: boolean;
  label: string;
  detail: string;
  value: number;
  limit: number;
  unit: string;
  /** "under": value must stay <= limit (mass, cost, power).
   *  "over": value must reach >= limit (delta-v capability). */
  dir: "under" | "over";
}

export function runChecks(d: DesignState, budget: Budget): Check[] {
  const veh = LAUNCH_VEHICLES.find((v) => v.id === d.vehicleId) ?? LAUNCH_VEHICLES[0];
  const power = POWER_SYSTEMS.find((p) => p.id === d.powerId) ?? POWER_SYSTEMS[0];
  const mission = MISSIONS_BY_ID[d.missionId];
  if (!mission) return [];

  const launchCap = mission.target === "earth" ? veh.massToLEO : veh.massToMars;
  const instrMass = INSTRUMENTS.filter((i) => d.instrumentIds.includes(i.id))
    .reduce((s, i) => s + i.mass, 0);
  const dvMargin = Math.round(budget.deltaV - mission.deltaV);

  return [
    { label: "Launch capability", value: budget.wetMass, limit: launchCap, unit: "kg", dir: "under",
      ok: budget.wetMass <= launchCap,
      detail: `${veh.name} can throw ${launchCap.toLocaleString()} kg to this trajectory` },
    { label: "Delta-v (orbit insertion)", value: Math.round(budget.deltaV), limit: mission.deltaV, unit: "m/s", dir: "over",
      ok: budget.deltaV >= mission.deltaV,
      detail: `Tsiolkovsky Isp=${prop_of(d).isp}s → ${Math.round(budget.deltaV)} m/s vs ${mission.deltaV} required (${dvMargin >= 0 ? "+" : ""}${dvMargin} m/s margin)` },
    { label: "Budget", value: Math.round(budget.cost), limit: mission.budgetCap, unit: "$M", dir: "under",
      ok: budget.cost <= mission.budgetCap,
      detail: `Total $${Math.round(budget.cost)}M vs cap $${mission.budgetCap}M` },
    { label: "Power", value: budget.powerDraw, limit: budget.power, unit: "W", dir: "under",
      ok: budget.powerDraw <= budget.power,
      detail: `${budget.powerDraw} W draw vs ${budget.power} W available` },
    { label: "Data link & recorder", value: budget.dataRate, limit: budget.commsRate * DATA_DUTY_CYCLE_LIMIT, unit: "Mbps", dir: "under",
      ok: budget.dataRate <= budget.commsRate * DATA_DUTY_CYCLE_LIMIT,
      detail: budget.dataRate === 0
        ? "No instruments — nothing to downlink"
        : `${budget.dataRate.toFixed(1)} Mbps generated vs ${budget.commsRate} Mbps pipe (DSN pass) → ${Math.round((budget.dataRate / Math.max(0.1, budget.commsRate)) * 100)}% duty cycle, science returns ∝ ${Math.round(Math.min(1, budget.commsRate / budget.dataRate) * 100)}%` },
    { label: "Instrument mass allocation", value: instrMass, limit: mission.usefulLoadKg, unit: "kg", dir: "under",
      ok: instrMass <= mission.usefulLoadKg,
      detail: `${instrMass} kg of instruments vs ${mission.usefulLoadKg} kg allocation` },
    { label: "Power source works at target", value: power.worksAt.includes(mission.target) ? 1 : 0, limit: 1, unit: "", dir: "over",
      ok: power.worksAt.includes(mission.target),
      detail: power.worksAt.includes(mission.target) ? `${power.name} operates at ${mission.target}` : `${power.name} cannot operate at ${mission.target}` },
  ];
}

function prop_of(d: DesignState) { return PROPULSION.find((p) => p.id === d.propulsionId) ?? PROPULSION[0]; }

/* --------------------------- Simulation ------------------------------ */

export interface SimStep {
  phase: string;
  day: number;
  event?: NasaEvent & { __builtin?: boolean };
  consequence: string;
  healthDelta: number; // -1..0
  scienceGained: number;
}

export interface SimResult {
  steps: SimStep[];
  finalHealth: number;
  scienceScore: number;
  success: boolean;
  grade: string;
}

export function simulate(d: DesignState, budget: Budget, liveEvents: NasaEvent[]): SimResult {
  const mission = MISSIONS_BY_ID[d.missionId];
  if (!mission) {
    return { steps: [], finalHealth: 0, scienceScore: 0, success: false, grade: "MISSION FAILURE" };
  }
  const checks = runChecks(d, budget);
  const passing = checks.filter((c) => c.ok).length;
  const failing = checks.length - passing;

  const events = liveEvents.length > 0 ? liveEvents : FALLBACK_EVENTS.map((f, i) => ({
    id: `fb${i}`, type: f.type, title: f.title, date: "", severity: f.severity, source: "BUILTIN" as const,
  }));

  const steps: SimStep[] = [];
  let health = 1 - failing * 0.08; // design margins cost health
  let science = 0;

  /* Crew modifiers — real NASA astronauts, skills mitigate anomalies */
  const crew = CREW.filter((c) => d.crewIds.includes(c.id));
  const skillMax = (k: keyof Astronaut["skills"]) => Math.max(0, ...crew.map((c) => c.skills[k]));
  const eventSkill = (type: string): number => {
    switch (type) {
      case "SOLAR_FLARE":
      case "RADIATION": return skillMax("medicine");
      case "MECHANICAL":
      case "THERMAL": return skillMax("engineering");
      case "DATA": return skillMax("ops");
      default: return 0;
    }
  };

  steps.push({ phase: "Launch", day: 0, consequence: `${LAUNCH_VEHICLES.find(v=>v.id===d.vehicleId)!.name} lifts off${crew.length ? ` with ${crew.length}-person crew (${crew.map((c) => c.name.split(" ")[1]).join(", ")})` : " (robotic)"} (reliability ${(budget.launchReliability*100).toFixed(1)}%)`, healthDelta: 0, scienceGained: 0 });
  health *= budget.launchReliability + 0.02;

  const cruise = Math.max(1, Math.round(mission.cruiseDays / 3));
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const day = Math.round((cruise * (i + 1)) / events.length);
    const hit = e.severity * (0.5 + Math.random() * 0.7);
    const commsPenalty = budget.commsRate < budget.dataRate ? 0.15 : 0;
    let hp = -(hit + commsPenalty) * 0.25;
    hp *= 1 - 0.035 * eventSkill(e.type);
    health += hp;
    let consequence = e.severity >= 0.55
      ? `Severe impact — systems degraded. ${budget.commsRate < budget.dataRate ? "Backlog floods the low-rate downlink." : "You ride it out."}`
      : `Radiation dose absorbed; minor degradation.`;
    if (crew.length > 0 && skillMax("eva") >= 8 && e.severity >= 0.55 && Math.random() < 0.4) {
      hp *= 0.5;
      health -= hp; // refund the repaired half
      consequence = `🧑‍🚀 EVA repair by ${crew.find((c) => c.skills.eva >= 8)!.name} recovered half the damage. ${consequence}`;
    } else if (crew.length > 0 && eventSkill(e.type) >= 8) {
      consequence = `🧑‍🚀 Crew expertise limited the damage. ${consequence}`;
    }
    steps.push({
      phase: "Cruise", day, event: e,
      consequence, healthDelta: hp, scienceGained: 0,
    });
  }

  const dvOk = budget.deltaV >= mission.deltaV;
  steps.push({
    phase: dvOk ? "Orbit insertion" : "Orbit insertion — FAILURE",
    day: cruise,
    consequence: dvOk
      ? `Burn of ${mission.deltaV} m/s captured the spacecraft.`
      : `Not enough delta-v: ${Math.round(budget.deltaV)} available, ${mission.deltaV} required. The spacecraft sails past its target.`,
    healthDelta: dvOk ? -0.03 : -1, scienceGained: 0,
  });
  if (!dvOk) health = 0;

  if (health > 0) {
    const valued = INSTRUMENTS.filter((i) => d.instrumentIds.includes(i.id))
      .reduce((s, i) => s + (mission.valuedKinds.includes(i.kind) ? i.scienceValue : i.scienceValue * 0.3), 0);
    const linkFactor = Math.min(1, budget.commsRate / Math.max(0.1, budget.dataRate));
    const powerFactor = Math.min(1, budget.power / Math.max(1, budget.powerDraw));
    const crewSciBonus = crew.length > 0 ? 1 + 0.03 * (skillMax("science") / 10) * Math.min(2, crew.length) : 1;
    science = Math.round(valued * linkFactor * powerFactor * health * crewSciBonus * 100);
    steps.push({
      phase: "Science operations", day: cruise + 1,
      consequence: `Science returned: ${science} points (link ${Math.round(linkFactor*100)}%, power ${Math.round(powerFactor*100)}%, health ${Math.round(health*100)}%${crew.length ? `, crew science ×${crewSciBonus.toFixed(2)}` : ""})`,
      healthDelta: 0, scienceGained: science,
    });
  }

  const success = health > 0 && science > 0;
  const grade = !success ? "MISSION FAILURE" : science >= 250 ? "A — Flagship science" : science >= 150 ? "B — Solid discovery mission" : science >= 75 ? "C — Modest results" : "D — Technically survived";

  return { steps, finalHealth: Math.max(0, health), scienceScore: science, success, grade };
}

export const MISSIONS_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m])) as Record<string, typeof MISSIONS[number]>;
export type { Instrument };
