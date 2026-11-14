/**
 * Crew roster — REAL NASA astronauts, crewable in mission design.
 *
 * Identities and one-line bios from NASA astronaut pages (nasa.gov/astronauts).
 * Skill numbers (0-10) are GAMEPLAY BALANCE values inspired by each
 * astronaut's actual record (EVAs flown, days in space, background) —
 * not official ratings. Citations kept per-astronaut.
 */

export interface Astronaut {
  id: string;
  name: string;
  role: string;
  skills: {
    engineering: number; // fixes mechanical/thermal anomalies
    science: number;     // boosts science return
    ops: number;         // handles data/system faults
    medicine: number;    // radiation countermeasures, crew health
    eva: number;         // spacewalk repair chance
  };
  bio: string;
  source: string;
}

export const CREW: Astronaut[] = [
  {
    id: "whitson",
    name: "Peggy Whitson",
    role: "Commander",
    skills: { engineering: 7, science: 8, ops: 9, medicine: 8, eva: 9 },
    bio: "NASA record 665 days in space; first female ISS commander; 10 career EVAs.",
    source: "nasa.gov/astronauts — record spaceflight & EVA history",
  },
  {
    id: "williams-s",
    name: "Sunita Williams",
    role: "EVA Specialist",
    skills: { engineering: 8, science: 6, ops: 8, medicine: 7, eva: 10 },
    bio: "Among the most cumulative EVA time of any astronaut; marathon runner in orbit.",
    source: "nasa.gov/astronauts — EVA record",
  },
  {
    id: "koch",
    name: "Christina Koch",
    role: "Mission Specialist (Science)",
    skills: { engineering: 6, science: 9, ops: 7, medicine: 6, eva: 8 },
    bio: "Longest single spaceflight by a woman (328 days); physicist; Artemis II crew.",
    source: "nasa.gov/astronauts — record flight & Artemis assignment",
  },
  {
    id: "wilmore",
    name: "Barry \"Butch\" Wilmore",
    role: "Test Pilot",
    skills: { engineering: 9, science: 5, ops: 9, medicine: 5, eva: 8 },
    bio: "Naval test pilot; flew the first crewed Starliner mission.",
    source: "nasa.gov/astronauts — flight test background",
  },
  {
    id: "meir",
    name: "Jessica Meir",
    role: "Flight Surgeon",
    skills: { engineering: 5, science: 8, ops: 6, medicine: 9, eva: 7 },
    bio: "Marine biologist and physiologist; first all-woman spacewalk.",
    source: "nasa.gov/astronauts — physiology background",
  },
  {
    id: "lindgren",
    name: "Kjell Lindgren",
    role: "Crew Health Officer",
    skills: { engineering: 6, science: 7, ops: 7, medicine: 9, eva: 6 },
    bio: "Board-certified flight surgeon in emergency medicine; ISS Expedition 45.",
    source: "nasa.gov/astronauts — flight surgeon",
  },
  {
    id: "glover",
    name: "Victor Glover",
    role: "Pilot",
    skills: { engineering: 8, science: 6, ops: 9, medicine: 6, eva: 7 },
    bio: "F-18 test pilot; Crew-1 pilot; assigned to Artemis II lunar flyby.",
    source: "nasa.gov/astronauts — Artemis II assignment",
  },
  {
    id: "kelly",
    name: "Scott Kelly",
    role: "Flight Engineer",
    skills: { engineering: 8, science: 7, ops: 8, medicine: 7, eva: 7 },
    bio: "340-day Year in Space mission; twin-study subject for human research.",
    source: "nasa.gov/twins-study — long-duration record",
  },
];

/** Seat + suit + ECLSS share per crew member (kg), for the mass budget. */
export const CREW_SEAT_MASS = 105;
/** Life-support cost per seat ($M) for the budget. */
export const CREW_SEAT_COST = 8;

/**
 * LIVE DATA — humans in space right now (open-notify.org, free/no key,
 * data from NASA/ Roscosmos feeds). HTTP-only endpoint: works on
 * localhost, may be blocked by mixed-content rules when deployed to
 * HTTPS — the UI hides the ticker on failure.
 */
export async function fetchLiveISSCrew(): Promise<{ name: string; craft: string }[]> {
  try {
    const res = await fetch("http://api.open-notify.org/astros.json");
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { people: { name: string; craft: string }[] };
    return json.people.filter((p) => p.craft === "ISS");
  } catch {
    return [];
  }
}
