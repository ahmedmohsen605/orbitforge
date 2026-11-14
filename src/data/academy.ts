/**
 * ROCKET LAB — kids' academy data.
 *
 * Engine specs are REAL public figures (NASA fact sheets, SpaceX/Blue Origin/
 * ULA published data). Educational framing follows NASA Glenn's
 * "Beginner's Guide to Rockets" (grc.nasa.gov/BGH/bgt.html) and NASA STEM
 * Engagement standards: Tsiolkovsky rocket equation, thrust-to-weight,
 * staging, mass fraction.
 *
 * Skill targets taught (real standards):
 *  - Liftoff thrust-to-weight >= 1.2 (a rocket with TWR < 1 sits on the pad;
 *    range-safety practice keeps margin above 1.0)
 *  - Delta-v to LEO ~ 9,300 m/s (orbital velocity 7,800 m/s + gravity,
 *    drag and steering losses ~1,500-2,000 m/s)
 *  - Staging: drop empty tanks because dead structure steals delta-v
 *  - Vacuum engines (high Isp, big nozzle) belong on upper stages
 */

export interface RocketEngine {
  id: string;
  name: string;
  thrustKN: number;   // sea-level thrust (kN)
  ispSL: number;      // seconds
  ispVac: number;     // seconds
  mass: number;       // kg per engine
  cycle: string;
  cost: number;       // $M gameplay
  stageHint: "first" | "upper" | "both";
  source: string;
}

export const ENGINES: RocketEngine[] = [
  { id: "merlin", name: "Merlin 1D", thrustKN: 850, ispSL: 282, ispVac: 311, mass: 470, cycle: "Gas generator", cost: 2, stageHint: "first", source: "SpaceX F9 booster engine (9 per core)" },
  { id: "rs25", name: "RS-25 (SLS core)", thrustKN: 1860, ispSL: 366, ispVac: 452, mass: 3527, cycle: "Staged combustion", cost: 50, stageHint: "first", source: "NASA SLS fact sheet" },
  { id: "raptor", name: "Raptor 2", thrustKN: 2300, ispSL: 327, ispVac: 350, mass: 160, cycle: "Full-flow staged", cost: 2, stageHint: "both", source: "SpaceX Starship data" },
  { id: "rl10", name: "RL10C-1", thrustKN: 110, ispSL: 100, ispVac: 450, mass: 168, cycle: "Expander", cost: 12, stageHint: "upper", source: "ULA Centaur upper stage" },
  { id: "solid", name: "Solid Booster (GEM-63XL class)", thrustKN: 2100, ispSL: 242, ispVac: 268, mass: 3200, cycle: "Solid — cannot shut down!", cost: 9, stageHint: "first", source: "ULA/NASA SRB heritage" },
];

export interface PayloadPreset {
  id: string;
  name: string;
  mass: number;
  blurb: string;
}

export const PAYLOADS: PayloadPreset[] = [
  { id: "cubesat", name: "CubeSat (kids your age build these!)", mass: 10, blurb: "10 kg student satellite — ELaNa program flies these on real rockets." },
  { id: "smallsat", name: "Small science satellite", mass: 300, blurb: "Like NASA's LEO science spacecraft of the 2000s." },
  { id: "lunar", name: "Lunar probe", mass: 2000, blurb: "CAPSTONE-class lunarCube explorer." },
  { id: "station", name: "Space station cargo", mass: 6000, blurb: "Cygnus/Dragon-class ISS resupply." },
];

/** Real delta-v budgets (m/s) broken into mission LEGS with losses included */
export const TARGETS = [
  {
    id: "leo", name: "Low Earth Orbit (LEO)", dv: 9300,
    blurb: "Orbit needs 7,800 m/s of speed plus ~1,500 m/s lost to gravity & air.",
    legs: [
      { name: "Ascent to LEO", dv: 9300, blurb: "7,800 m/s orbital speed + gravity & drag losses" },
    ],
  },
  {
    id: "moon", name: "🌙 Moon landing (Apollo-style)", dv: 15000,
    blurb: "The Moon has NO atmosphere — every bit of braking is rocket work!",
    legs: [
      { name: "Ascent to LEO", dv: 9300, blurb: "7,800 m/s orbital speed + losses" },
      { name: "Trans-Lunar Injection (TLI)", dv: 3200, blurb: "Escape Earth's gravity well toward the Moon" },
      { name: "Lunar Orbit Insertion (LOI)", dv: 900, blurb: "Slow down so the Moon catches you" },
      { name: "Powered descent & landing", dv: 1600, blurb: "Airless world: engines all the way down, like Apollo 11" },
    ],
  },
  {
    id: "mars", name: "🔴 Mars landing", dv: 13700,
    blurb: "Mars HAS thin air — aerobraking does most of the braking for free!",
    legs: [
      { name: "Ascent to LEO", dv: 9300, blurb: "7,800 m/s orbital speed + losses" },
      { name: "Trans-Mars Injection (TMI)", dv: 3600, blurb: "Hohmann cruise to Mars — a 6-month ride" },
      { name: "Aerobrake + powered landing", dv: 800, blurb: "The atmosphere does most of the work — sky-crane style!" },
    ],
  },
];

export const LESSONS: { title: string; kid: string; standard: string }[] = [
  {
    title: "The Rocket Equation",
    kid: "A rocket is basically a water balloon: throw stuff (hot gas) out the back and you get pushed forward. The lighter the rocket and the faster the exhaust, the more speed you gain.",
    standard: "Tsiolkovsky: Δv = Isp × g₀ × ln(m_start / m_end). Taught in NASA Glenn's Beginner's Guide to Rockets.",
  },
  {
    title: "Thrust-to-Weight (TWR)",
    kid: "Engines must push HARDER than gravity pulls. If thrust < weight the rocket just sits there. Real rockets lift off with at least 20% margin.",
    standard: "Liftoff TWR ≥ 1.2 — standard ascent-vehicle design practice (NASA ascent guidance & range safety).",
  },
  {
    title: "Why Rockets Have Stages",
    kid: "Empty fuel tanks are dead weight. Dropping them makes the remaining rocket lighter, so the same engine gives more speed. That's why every big rocket drops its booster.",
    standard: "Staging — mass-fraction optimization (NASA launch vehicle design).",
  },
  {
    title: "Vacuum Engines vs. Sea-Level Engines",
    kid: "Up high there is no air, so the exhaust bell can be huge — bigger bell = more push per kg of fuel. But a huge bell at liftoff would be squashed by air pressure. That's why upper-stage engines look like megaphones!",
    standard: "Nozzle expansion ratio & Isp_{SL} vs Isp_{vac} (NASA Glenn propulsion guides).",
  },
  {
    title: "Solid vs Liquid",
    kid: "Solid boosters are like giant fireworks: cheap, powerful, but you can NEVER turn them off. Liquid engines can throttle and shut down — that's what saves you if something goes wrong.",
    standard: "Throttleability & abort capability in crew-rated launch vehicles (NASA CCT-STD-5010 heritage).",
  },
];
