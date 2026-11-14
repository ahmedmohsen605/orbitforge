/**
 * Hardware catalogs — REAL parameters from NASA open data.
 *
 * Sources:
 *  - Launch vehicles: NASA LSDB / ELaNA small satellite manifests (code.nasa.gov),
 *    NASA-STD vehicle fact sheets (nasa.gov/factsheets), data.nasa.gov datasets
 *  - Instruments: NASA mission instrument pages (e.g. MAVEN IUVS, LRO LROC)
 *  - Power: NASA RTG fact sheets, Juno/Parker solar array data sheets
 *  - Comms: Deep Space Network services catalog (JPL DSN)
 *
 * Costs in FY$M order-of-magnitude, from NASA budget requests / CSIS reports.
 * Values are engineering-accurate approximations suitable for gameplay.
 */

export interface LaunchVehicle {
  id: string;
  name: string;
  cost: number; // $M
  massToLEO: number; // kg
  massToMars: number; // kg (C3 ~ 3-4 km2/s2 trajectory)
  reliability: number; // 0..1
  source: string;
}

export const LAUNCH_VEHICLES: LaunchVehicle[] = [
  { id: "falcon9", name: "Falcon 9", cost: 67, massToLEO: 22800, massToMars: 4020, reliability: 0.985, source: "NASA LSDB launch record" },
  { id: "atlas5", name: "Atlas V 401", cost: 110, massToLEO: 9800, massToMars: 3500, reliability: 0.99, source: "ULA/NASA MAVEN launch data" },
  { id: "sls", name: "SLS Block 1", cost: 2200, massToLEO: 95000, massToMars: 27000, reliability: 0.92, source: "NASA SLS fact sheet" },
  { id: "electron", name: "Electron", cost: 7, massToLEO: 300, massToMars: 0, reliability: 0.91, source: "ELaNA manifest" },
  { id: "vulcan", name: "Vulcan Centaur", cost: 110, massToLEO: 27000, massToMars: 5500, reliability: 0.95, source: "ULA certification data" },
];

export interface Instrument {
  id: string;
  name: string;
  kind: "imager" | "spectrometer" | "plasma" | "radar" | "lidar";
  mass: number; // kg
  power: number; // W orbit-average
  cost: number; // $M
  dataRate: number; // Mbps
  scienceValue: number; // points vs mission objective tags
  source: string;
}

export const INSTRUMENTS: Instrument[] = [
  { id: "hiros", name: "High-Res Imager", kind: "imager", mass: 58, power: 92, cost: 85, dataRate: 12, scienceValue: 3, source: "LROC-class (LRO)" },
  { id: "widecam", name: "Wide-Angle Context Cam", kind: "imager", mass: 12, power: 18, cost: 20, dataRate: 2, scienceValue: 1, source: "MER/MRO context cameras" },
  { id: "irspec", name: "IR Mapping Spectrometer", kind: "spectrometer", mass: 34, power: 45, cost: 60, dataRate: 6, scienceValue: 2, source: "CRISM-class (MRO)" },
  { id: "uvspec", name: "UV Spectrograph", kind: "spectrometer", mass: 9, power: 15, cost: 28, dataRate: 1, scienceValue: 2, source: "IUVS (MAVEN)" },
  { id: "plasmap", name: "Plasma & Fields Package", kind: "plasma", mass: 21, power: 32, cost: 40, dataRate: 0.4, scienceValue: 2, source: "MAVEN PFP" },
  { id: "sounder", name: "Sounding Radar", kind: "radar", mass: 25, power: 30, cost: 45, dataRate: 0.6, scienceValue: 2, source: "SHARAD-class" },
  { id: "topolidar", name: "Topographic Lidar", kind: "lidar", mass: 18, power: 24, cost: 38, dataRate: 1, scienceValue: 2, source: "MLA-class (MESSENGER)" },
  /* ---- CubeSat-class payloads (numbers from CubeSat 101, NASA CSLI) ---- */
  { id: "minicam", name: "Nano Earth Imager", kind: "imager", mass: 1.2, power: 4, cost: 1.5, dataRate: 0.2, scienceValue: 1, source: "CubeSat 101 — 1U-class imaging payloads" },
  { id: "minissp", name: "Mini Plasma Sensor", kind: "plasma", mass: 0.8, power: 2, cost: 1, dataRate: 0.05, scienceValue: 1, source: "CubeSat 101 — in-situ science cubesats" },
  { id: "minispec", name: "Mini IR Spectrometer", kind: "spectrometer", mass: 1.8, power: 5, cost: 2.2, dataRate: 0.1, scienceValue: 1, source: "CubeSat 101 — hyperspectral cubesats" },
];

export interface PowerSystem {
  id: string;
  name: string;
  mass: number; // kg
  powerW: number; // usable EOL watts
  cost: number; // $M
  worksAt: ("earth" | "mars" | "deep" | "lunar")[];
  source: string;
}

export const POWER_SYSTEMS: PowerSystem[] = [
  { id: "solarmed", name: "Medium Solar Array + Li-ion", mass: 55, powerW: 850, cost: 30, worksAt: ["earth", "lunar", "mars"], source: "MAVEN 2x solar arrays" },
  { id: "solarhuge", name: "Large Flexible Array", mass: 120, powerW: 2400, cost: 75, worksAt: ["earth", "lunar", "mars"], source: "Juno-class arrays" },
  { id: "mmrtg", name: "Multi-Mission RTG", mass: 45, powerW: 110, cost: 95, worksAt: ["earth", "mars", "deep", "lunar"], source: "NASA MMRTG fact sheet (Curiosity/Perseverance)" },
  /* CubeSat 101: 1U/2U body-mounted cells deliver ~2-5 W per face */
  { id: "cubepanel", name: "CubeSat Body-Panel Solar", mass: 3, powerW: 12, cost: 0.8, worksAt: ["earth"], source: "CubeSat 101 (NASA CSLI) — body-mounted arrays" },
];

export interface CommsSystem {
  id: string;
  name: string;
  mass: number; // kg
  powerW: number; // transmit power draw
  dataRateMbps: number; // to DSN at target distance
  cost: number; // $M
  source: string;
}

export const COMMS_SYSTEMS: CommsSystem[] = [
  { id: "xband", name: "X-Band Transponder", mass: 8, powerW: 40, dataRateMbps: 0.5, cost: 12, source: "JPL DSN X-band service" },
  { id: "kaband", name: "Ka-Band High-Rate", mass: 14, powerW: 85, dataRateMbps: 4, cost: 32, source: "DSN Ka-band (MRO 6 Mbps record)" },
  { id: "lascom", name: "Deep-Space Optical Comm", mass: 11, powerW: 60, dataRateMbps: 26, cost: 55, source: "DSOC demo (Psyche mission)" },
  /* CubeSat 101: UHF amateur-band downlink, a few kbps */
  { id: "uhf", name: "UHF CubeSat Radio", mass: 1, powerW: 8, dataRateMbps: 0.2, cost: 0.5, source: "CubeSat 101 (NASA CSLI) — UHF amateur band" },
];

export interface PropulsionSystem {
  id: string;
  name: string;
  mass: number; // dry mass kg
  isp: number; // seconds
  propMass: number; // kg propellant loaded (fixed tank)
  cost: number; // $M
  source: string;
}

export const PROPULSION: PropulsionSystem[] = [
  { id: "hydrazine", name: "Mono-prop Hydrazine", mass: 40, isp: 220, propMass: 260, cost: 18, source: "MRO-class thrusters" },
  { id: "biprop", name: "Bi-propellant (NTO/MMH)", mass: 65, isp: 320, propMass: 420, cost: 35, source: "MAVEN propulsion" },
  { id: "ion", name: "Hall-Effect Ion Drive", mass: 30, isp: 1800, propMass: 80, cost: 48, source: "DSN-tested HERMeS/PSU thrusters" },
  /* CubeSat 101: micro electric propulsion units are a few grams/s of thrust */
  { id: "micro", name: "Micro Electric Thruster", mass: 2, isp: 1000, propMass: 0.5, cost: 1.5, source: "CubeSat 101 (NASA CSLI) — micro-propulsion" },
];

/* ------------------------- Mission objectives ------------------------ */

export interface MissionObjective {
  id: string;
  name: string;
  target: "mars" | "lunar" | "earth" | "deep";
  deltaV: number; // m/s for orbit insertion + operations
  cruiseDays: number;
  budgetCap: number; // $M total
  usefulLoadKg: number; // instruments + comms + power must fit in this
  valuedKinds: Instrument["kind"][];
  brief: string;
  realMission: { name: string; cost: string; link: string };
}

export const MISSIONS: MissionObjective[] = [
  {
    id: "marsorb",
    name: "Mars Climate Mapper",
    target: "mars",
    deltaV: 1450,
    cruiseDays: 300,
    budgetCap: 580,
    usefulLoadKg: 280,
    valuedKinds: ["spectrometer", "plasma", "imager"],
    brief: "Map Martian atmospheric loss like the real MAVEN mission. UV + plasma science favored.",
    realMission: { name: "MAVEN", cost: "$672M", link: "https://science.nasa.gov/mission/maven/" },
  },
  {
    id: "lunarrec",
    name: "Lunar Recon Orbiter 2.0",
    target: "lunar",
    deltaV: 900,
    cruiseDays: 5,
    budgetCap: 540,
    usefulLoadKg: 320,
    valuedKinds: ["imager", "lidar", "radar"],
    brief: "Image future landing sites and map ice deposits at the lunar south pole.",
    realMission: { name: "LRO", cost: "$583M", link: "https://science.nasa.gov/mission/lunar-reconnaissance-orbiter/" },
  },
  {
    id: "asteroid",
    name: "Near-Earth Asteroid Scout",
    target: "deep",
    deltaV: 2100,
    cruiseDays: 450,
    budgetCap: 700,
    usefulLoadKg: 180,
    valuedKinds: ["imager", "spectrometer", "lidar"],
    brief: "Rendezvous with a real near-Earth asteroid (fetched live from NASA NeoWs).",
    realMission: { name: "OSIRIS-REx", cost: "$1.16B", link: "https://science.nasa.gov/mission/osiris-rex/" },
  },
  {
    id: "earthsci",
    name: "Earth Climate Sentinel",
    target: "earth",
    deltaV: 120,
    cruiseDays: 2,
    budgetCap: 420,
    usefulLoadKg: 260,
    valuedKinds: ["imager", "spectrometer"],
    brief: "Measure sea-level and greenhouse gases from LEO. Cheapest mission, tightest mass.",
    realMission: { name: "Sentinel-6 / OCO-3", cost: "$177M", link: "https://science.nasa.gov/earth-science/" },
  },
  {
    id: "rideshare",
    name: "Rideshare Pathfinder SmallSat",
    target: "earth",
    deltaV: 120,
    cruiseDays: 90,
    budgetCap: 20,
    usefulLoadKg: 8,
    valuedKinds: ["imager", "plasma", "spectrometer"],
    brief: "Your first mission! A CubeSat-class spacecraft ridesharing to LEO — only mini hardware fits. Start here, then go interplanetary.",
    realMission: { name: "ELaNa / CSLI CubeSats", cost: "$1-5M typical", link: "https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf" },
  },
];

/** Built-in fallback events if DONKI is unreachable (mirrors real anomaly history). */
export const FALLBACK_EVENTS = [
  { type: "RADIATION", title: "Unmodeled solar energetic particle event", severity: 0.6 },
  { type: "MECHANICAL", title: "Reaction wheel friction spike", severity: 0.45 },
  { type: "THERMAL", title: "Radiator underperformance during eclipse", severity: 0.3 },
  { type: "DATA", title: "Solid-state recorder bit flips", severity: 0.25 },
];

/* ---------------------------------------------------------------------------
 * Science Traceability Matrix data (NASA "Design and Develop Science
 * Missions" practice: objective -> measurement -> instrument -> requirement)
 * ------------------------------------------------------------------------ */

/** What each instrument KIND physically measures. */
export const MEASURES: Record<Instrument["kind"], string> = {
  imager: "context & morphological imaging",
  spectrometer: "surface / atmospheric composition",
  plasma: "in-situ fields & particles",
  radar: "subsurface structure",
  lidar: "topography & altimetry",
};

export interface ScienceObjective { text: string; kinds: Instrument["kind"][]; }

export const SCIENCE_OBJECTIVES: Record<string, ScienceObjective[]> = {
  marsorb: [
    { text: "Quantify atmospheric escape to space", kinds: ["plasma", "spectrometer"] },
    { text: "Characterize upper-atmosphere composition", kinds: ["spectrometer"] },
    { text: "Geologic context for erosion features", kinds: ["imager"] },
  ],
  lunarrec: [
    { text: "Locate & map polar ice deposits", kinds: ["radar", "spectrometer"] },
    { text: "Topographic mapping of landing sites", kinds: ["lidar"] },
    { text: "High-resolution site imagery", kinds: ["imager"] },
  ],
  asteroid: [
    { text: "Characterize surface composition", kinds: ["spectrometer"] },
    { text: "Shape, spin state & topography", kinds: ["lidar", "imager"] },
    { text: "Regolith grain-size context", kinds: ["imager"] },
  ],
  earthsci: [
    { text: "Measure greenhouse-gas columns", kinds: ["spectrometer"] },
    { text: "Cloud & aerosol imaging", kinds: ["imager"] },
    { text: "Reference altimetry", kinds: ["lidar"] },
  ],
  rideshare: [
    { text: "LEO context imaging from a 2U platform", kinds: ["imager"] },
    { text: "In-situ plasma density sampling", kinds: ["plasma"] },
    { text: "Miniature spectral technology demo", kinds: ["spectrometer"] },
  ],
};
