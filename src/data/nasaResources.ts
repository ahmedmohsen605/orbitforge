/**
 * Official resource list from the challenge page:
 * https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/?tab=resources
 * Each entry records HOW this game uses the resource (judges-visible).
 */

export interface ChallengeResource {
  title: string;
  url: string;
  usedFor: string;
}

export const CHALLENGE_RESOURCES: ChallengeResource[] = [
  {
    title: "Design and Develop Science Missions (NASA guide)",
    url: "https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf",
    usedFor: "Science Traceability Matrix in the design console: objectives → instruments → measurements.",
  },
  {
    title: "GMAT — General Mission Analysis Tool",
    url: "https://software.nasa.gov/software/GSC-19468-1",
    usedFor: "Debrief exports a GMAT-ready mission script of your design (spacecraft, tank, engine, burns).",
  },
  {
    title: "Concept Maturity Levels (CMLs) — JPL",
    url: "https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299",
    usedFor: "The CML 1-4 badge: your concept matures from idea to demonstrated mission as you play.",
  },
  {
    title: "Mission Design Lab (MDL) — GSFC",
    url: "https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/",
    usedFor: "The design console workflow mirrors MDL's subsystem trade sessions (mass, power, data, cost).",
  },
  {
    title: "NASA Mission Viz",
    url: "https://nasa.github.io/mission-viz/",
    usedFor: "Inspiration for the 3D open-system visualization and transfer-path display.",
  },
  {
    title: "Webb: Build It Yourself learning game",
    url: "https://science.nasa.gov/mission/webb/game-build-it-yourself/",
    usedFor: "Model for the Rocket Builder academy: learn real hardware while playing.",
  },
  {
    title: "CubeSat 101 — NASA CSLI",
    url: "https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf",
    usedFor: "CubeSat-class hardware stats (mini instruments, UHF radio, body-panel solar, micro propulsion) and the Rideshare Pathfinder mission.",
  },
  {
    title: "Visualize a Space Mission in VR (2023 challenge)",
    url: "https://www.spaceappschallenge.org/2023/challenges/visualize-a-space-mission-using-virtual-reality/",
    usedFor: "Prior art for immersive mission visualization — our Ultra 4K-class 3D mode extends it to the browser.",
  },
  {
    title: "CSA Digital Games and Activities",
    url: "https://www.asc-csa.gc.ca/eng/youth-educators/digital-games-and-activities.asp",
    usedFor: "Gamification patterns for the kids' academy (step badges, ignite-and-see feedback).",
  },
];
