/**
 * NOVA — NASA Open-data Virtual Advisor.
 * An in-game assistant that answers questions IN THE CONTEXT of whatever
 * the player is doing (map, design console, sim, debrief, rocket lab).
 *
 * Two modes:
 *  1. Built-in knowledge engine (always works, zero setup): curated
 *     NASA-sourced answer cards + awareness of live game state.
 *  2. LLM bridge (optional): if VITE_AI_API_KEY (+ optional
 *     VITE_AI_BASE_URL / VITE_AI_MODEL) is set, questions go to a real
 *     LLM with the full game context as its system prompt; falls back
 *     to the knowledge engine on any error.
 */

/* ------------------------- live game context ------------------------- */

export interface AssistantCtx {
  screen: string;
  missionName?: string;
  failingChecks?: string[];
  budgetSummary?: string;
  crew?: string[];
  details?: string;
}

let ctx: AssistantCtx = { screen: "brief" };
export function setAssistantCtx(next: AssistantCtx): void { ctx = next; }
export function getAssistantCtx(): AssistantCtx { return ctx; }

/* --------------------------- knowledge cards --------------------------- */

interface Card { keys: RegExp; title: string; body: string; source: string; }

const CARDS: Card[] = [
  { keys: /delta.?v|delta-v|tsiolkovsky|rocket equation/i, title: "Delta-v (Δv) — your speed budget",
    body: "Δv is how much speed change your spacecraft can produce. It comes from the Tsiolkovsky equation: Δv = Isp × g₀ × ln(m_start/m_end). More propellant or higher Isp (more efficient engine) = more Δv. In this game your Δv must reach the mission's insertion requirement (shown on the gauge).",
    source: "NASA Glenn Beginner's Guide to Rockets (grc.nasa.gov)" },
  { keys: /twr|thrust.?to.?weight|lift ?off|pad/i, title: "Thrust-to-Weight Ratio",
    body: "TWR = thrust ÷ weight. If it's below 1.0 the rocket cannot leave the pad. Real launchers lift off at TWR ≥ 1.2 for margin. In Rocket Lab the standards check enforces this exact rule.",
    source: "NASA ascent-vehicle design practice" },
  { keys: /staging|stage|drop.*tank|why.*stage/i, title: "Why rockets have stages",
    body: "Empty tanks are dead weight. Dropping a spent stage makes the rocket lighter, so the remaining engine produces more Δv from the same propellant. Every large rocket — Saturn V, Falcon 9, SLS — stages for exactly this reason.",
    source: "NASA launch vehicle design" },
  { keys: /isp|specific impulse|efficien/i, title: "Isp — engine efficiency",
    body: "Isp measures how long 1 kg of propellant can produce thrust — effectively 'miles per gallon' for rockets. Chemical engines: 250-450 s. Ion drives: 1800+ s but tiny thrust. In the design console, ion propulsion gives huge Δv with little propellant.",
    source: "NASA propulsion fact sheets" },
  { keys: /rtg|power|solar|battery/i, title: "Power: solar vs RTG",
    body: "Solar arrays get weak as you go out (inverse-square law) — Jupiter gets ~4% of Earth's sunlight. RTGs (nuclear) work anywhere, for decades, but only make ~110 W and cost more. The game blocks a power source that can't work at your target — that's a real constraint (Juno needed huge arrays; Curiosity uses MMRTG).",
    source: "NASA MMRTG fact sheet, Juno mission page" },
  { keys: /comms|downlink|data rate|band|dsn|deep space network/i, title: "Deep Space Communications",
    body: "X-band is the workhorse (low rate, reliable). Ka-band quadruples the rate (MRO set records with it). Optical comm (lasers, like DSOC on Psyche) is 50× faster but new. Your instruments generate data faster than the pipe can carry it → onboard recorder duty-cycles them, cutting science return proportionally.",
    source: "JPL Deep Space Network services catalog" },
  { keys: /donki|solar flare|space weather|radiation|flare/i, title: "Space weather in the sim",
    body: "Your cruise simulation fetches REAL solar flares from NASA's DONKI API for your exact mission dates. Strong X-class flares degrade your systems — the same space weather that real flight teams monitor. Medics on your crew (medicine skill) reduce radiation damage.",
    source: "api.nasa.gov → DONKI" },
  { keys: /neow|asteroid|target|ceres/i, title: "Asteroid targets",
    body: "The Asteroid Scout mission pulls real near-Earth objects from NASA's NeoWs API — the asteroids it offers actually exist and are actually passing Earth this week. Ceres in the open map is the largest object in the asteroid belt.",
    source: "api.nasa.gov → NeoWs" },
  { keys: /launch vehicle|falcon|atlas|vulcan|sls|rocket.*pick|which.*vehicle/i, title: "Choosing a launch vehicle",
    body: "Compare (1) mass-to-orbit: your wet mass must fit, (2) cost: Falcon 9 $67M is the cheapest big ride; SLS $2.2B throws 27t to Mars; Electron $7M only 300kg to LEO, (3) reliability %. Match the cheapest vehicle that fits your mass with margin.",
    source: "NASA LSDB / ELaNa manifests, vehicle fact sheets" },
  { keys: /instrument|payload|camera|spectrometer|science.*pick/i, title: "Picking instruments",
    body: "Match instruments to the mission objective (⭐ cards). Check four budgets: mass, power, data rate, cost. The imager eats data (12 Mbps!), plasma packages are light but specialist. A good design is 2-3 instruments with one star performer.",
    source: "Real instrument specs: LROC, CRISM, IUVS, SHARAD heritage" },
  { keys: /crew|astronaut|sunita|whitson|wilmore|koch|kelly|glover|meir|lindgren|eva/i, title: "Your crew",
    body: "Real NASA astronauts are crewable: Whitson (ops/EVA legend), Sunita Williams (EVA 10 — does spacewalk repairs), Koch (science 9), Wilmore (test pilot, engineering 9), Meir/Lindgren (medicine 9 — radiation countermeasures). Each seat costs 105 kg mass + $8M life support. Their skills directly mitigate cruise anomalies.",
    source: "nasa.gov/astronauts; skills are gameplay values" },
  { keys: /data|api|nasa.*open|where.*from|source|credib/i, title: "What NASA data powers this game",
    body: "api.nasa.gov: DONKI (space weather), NeoWs (asteroids), APOD (imagery). data.nasa.gov + code.nasa.gov: vehicle/instrument specs (fact sheets, LSDB, DSN catalog). open-notify: live humans-in-space feed. Textures: CC-BY NASA-derived (Solar System Scope). Everything is cited on the cards where it's used.",
    source: "code.nasa.gov · api.nasa.gov · data.nasa.gov" },
  { keys: /budget|cost|money|cheap/i, title: "Money management",
    body: "Your budget cap is modeled on the real analog mission (e.g., MAVEN $672M → cap $580M). Big-ticket items: launch vehicle, then power/RTG, then instruments. Cheapest viable design wins on cost, but under-instrumented designs return little science — balance!",
    source: "NASA budget requests, mission cost books" },
  { keys: /orbit|leo|kepler|altitude|how.*fast/i, title: "Orbits",
    body: "LEO orbit needs ~7,800 m/s of horizontal speed at ~200+ km altitude. Add ~1,500-2,000 m/s of gravity/drag/steering losses → rockets need ~9,300 m/s total. Higher orbits need less speed to maintain but more Δv to reach.",
    source: "NASA Glenn Beginner's Guide to Rockets" },
  { keys: /help|stuck|fail|fix|red|why.*not|problem/i, title: "Live debugging help",
    body: buildLiveHelp(),
    source: "live game state" },
  { keys: /cml|concept maturity|traceability|matrix|objective/i, title: "Concept Maturity & Science Traceability",
    body: "Real NASA missions mature through Concept Maturity Levels (CMLs) — in this game your badge climbs CML1 (idea) → CML4 (demonstrated mission record) as you prove out your design. The Science Traceability Matrix checks every science objective has an instrument that can actually measure it — the exact gap-catching review NASA concept teams run.",
    source: "JPL CML framework (dataverse.jpl.nasa.gov hdl:2014/44299); NASA 'Design and Develop Science Missions'" },
  { keys: /gmat|export|script|trajectory tool/i, title: "GMAT export",
    body: "On the debrief screen, 'Export GMAT script' downloads a real GMAT .script file with your spacecraft's dry mass, tank, engine Isp and burn sequence — openable in NASA's open-source General Mission Analysis Tool, the same trajectory software real mission designers use.",
    source: "software.nasa.gov/software/GSC-19468-1" },
  { keys: /cubesat|smallsat|rideshare|1u|2u|mini/i, title: "CubeSats — real small-spacecraft engineering",
    body: "The Rideshare Pathfinder mission uses real CubeSat 101 numbers: body-panel solar (~12 W), UHF amateur-band radio, micro electric thrusters, and 1-2 kg instruments. Only mini hardware fits in the 8 kg allocation — that's the real CubeSat design constraint!",
    source: "CubeSat 101 (NASA CSLI) PDF" },
];

function buildLiveHelp(): string {
  const fail = ctx.failingChecks ?? [];
  if (fail.length === 0) {
    return `You're on ${ctx.screen} and every check is green. ${ctx.missionName ? `Design for ${ctx.missionName}: ` : ""}commit and launch! Tips: add a ⭐ instrument for more science, or crew for anomaly protection.`;
  }
  const fixes: Record<string, string> = {
    "Launch capability": "your spacecraft is too heavy — lighter propulsion (ion), fewer instruments, or a bigger vehicle (Atlas V/Vulcan/SLS).",
    "Delta-v (orbit insertion)": "not enough Δv — bi-propellant or ion drive, or drop heavy instruments.",
    "Budget": "over budget — cheaper vehicle (Falcon 9), smaller instruments, or fewer crew seats.",
    "Power": "power draw exceeds supply — bigger array (or RTG for deep space), or drop a power-hungry instrument.",
    "Data link & recorder": "payload generates too much data for your comms pipe — upgrade to Ka-band or optical, or pick lighter-data instruments.",
    "Instrument mass allocation": "too many instruments for the mission's payload allocation — drop the least valuable one.",
    "Power source works at target": "solar can't operate at this target — switch to an RTG.",
  };
  return `On ${ctx.screen}${ctx.missionName ? ` (${ctx.missionName})` : ""}, failing: ${fail.join(", ")}. Fixes → ` +
    fail.map((f) => `${f}: ${fixes[f] ?? "ask NOVA about it!"}`).join(" | ");
}

/* ----------------------------- answering ----------------------------- */

export function answer(query: string): string {
  const hits = CARDS.filter((c) => c.keys.test(query));
  if (hits.length === 0) {
    return `I'm NOVA — I know rockets, mission design, NASA data, and everything on your current screen (${ctx.screen}). Try: "what is delta-v", "help me fix my design", "which launch vehicle", "who is Sunita Williams", "what NASA data do you use".`;
  }
  const [best, ...rest] = hits;
  let out = `**${best.title}**\n${best.body}\n📚 ${best.source}`;
  if (ctx.details) out += `\n\n🔎 On your screen: ${ctx.details}`;
  if (rest.length) out += `\n\nRelated: ${rest.map((r) => r.title).join(" · ")}`;
  return out;
}

/* ------------------------- optional LLM bridge ------------------------- */

export async function askNOVA(query: string): Promise<string> {
  const key = import.meta.env.VITE_AI_API_KEY as string | undefined;
  if (!key) return answer(query);
  try {
    const base = (import.meta.env.VITE_AI_BASE_URL as string | undefined) ?? "https://api.openai.com/v1";
    const model = (import.meta.env.VITE_AI_MODEL as string | undefined) ?? "gpt-4o-mini";
    const sys = `You are NOVA, the friendly mission-design advisor inside the game "ORBITFORGE", a NASA Space Apps 2026 Challenge game with an education-first focus. Answer kids' questions about rockets, mission engineering and NASA open data, in the context of this live game state: ${JSON.stringify(ctx)}. Keep answers under 120 words, encourage trying things in the game, cite NASA sources when you know them.`;
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: "system", content: sys }, { role: "user", content: query }], max_tokens: 300 }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const j = await res.json() as { choices: { message: { content: string } }[] };
    return j.choices?.[0]?.message?.content ?? answer(query);
  } catch {
    return answer(query);
  }
}
