/**
 * GMAT script generation.
 * Exports the player's design as a GMAT (General Mission Analysis Tool)
 * script skeleton — the actual open-source tool NASA uses:
 *   https://software.nasa.gov/software/GSC-19468-1
 * The script uses real GMAT object syntax (Spacecraft, Tank, Engine,
 * Propagator, Maneuver) with the player's numbers, so opening it in GMAT
 * is a valid starting point for real trajectory work.
 */
import type { DesignState } from "./engine";
import { computeBudget, MISSIONS_BY_ID } from "./engine";
import { LAUNCH_VEHICLES, PROPULSION } from "../data/catalogs";

export function buildGmatScript(d: DesignState): string {
  const budget = computeBudget(d);
  const mission = MISSIONS_BY_ID[d.missionId];
  const veh = LAUNCH_VEHICLES.find((v) => v.id === d.vehicleId) ?? LAUNCH_VEHICLES[0];
  const prop = PROPULSION.find((p) => p.id === d.propulsionId) ?? PROPULSION[0];
  const name = (mission?.name ?? "Mission").replace(/[^A-Za-z0-9 ]/g, "");
  const cruiseDays = Math.max(1, Math.round((mission?.cruiseDays ?? 300) / 3));

  return `% =====================================================================
% ORBITFORGE — generated mission script
% Challenge: NASA Space Apps 2026 "Space Mission Design Game"
% Design: ${name}
% Launch vehicle: ${veh.name} (wet mass ${Math.round(budget.wetMass)} kg)
%
% Open with GMAT (NASA GSFC, open source):
%   https://software.nasa.gov/software/GSC-19468-1
% This is a skeleton: bodies/epochs are simplified for gameplay numbers.
% =====================================================================

Create Spacecraft Scout;
GMAT Scout.DryMass = ${Math.round(budget.dryMass)};
GMAT Scout.SaturationVoltage = 0;

Create PropTank Fuel;
GMAT Fuel.FuelMass = ${Math.round(prop.propMass)};

Create PropEngine MainEngine;
GMAT MainEngine.Isp = ${prop.isp};
GMAT MainEngine.Deceleration = 0;

GMAT Scout.Tanks = {Fuel};
GMAT Scout.Engines = {MainEngine};

Create ForceModel FM;
GMAT FM.PrimaryBodies = {${mission?.target === "mars" ? "Mars" : mission?.target === "lunar" ? "Luna" : "Earth"}};
GMAT FM.PointMasses = {${mission?.target === "mars" ? "Mars, Sun" : "Sun"}};
GMAT FM.SRP = On;

Create Propagator Prop(FM);
GMAT Prop.MaxStep = 86400;

Create OrbitView ScoutView;
GMAT ScoutView.CoordinateSystem = EarthMJ2000Eq;
GMAT ScoutView.Add = {Scout};

BeginMissionSequence;

% Leg 1: launch + cruise (accounted in gameplay; represented here as coast)
Propagate Prop(Scout) {Scout.ElapsedDays = ${cruiseDays}};

% Leg 2: orbit insertion burn from the design's Tsiolkovsky budget
Maneuver MainEngine(Scout);

Propagate Prop(Scout) {Scout.ElapsedDays = 30};
`;
}

export function downloadGmatScript(d: DesignState): void {
  const blob = new Blob([buildGmatScript(d)], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "orbitforge-gmat.script";
  a.click();
  URL.revokeObjectURL(a.href);
}
