/**
 * NASA Open API client — api.nasa.gov
 * All endpoints documented at https://api.nasa.gov/
 *
 * DEMO_KEY works out of the box (rate-limited ~30 req/hr, 50/day).
 * Get a free key at https://api.nasa.gov/ and set VITE_NASA_API_KEY.
 *
 * Every call has an offline fallback so the game is always playable
 * at judging time even if the venue Wi-Fi dies.
 */

const KEY = (import.meta.env.VITE_NASA_API_KEY as string | undefined) ?? "DEMO_KEY";
const BASE = "https://api.nasa.gov";

export interface NasaEvent {
  id: string;
  type: string;
  title: string;
  date: string;
  severity: number; // 0..1 gameplay impact
  source: "DONKI" | "BUILTIN";
}

const cache = new Map<string, unknown>();

async function cachedJson<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NASA API ${res.status}`);
  const json = (await res.json()) as T;
  cache.set(url, json);
  return json;
}

/* ------------------------------------------------------------------ */
/* DONKI — space weather drives mission simulation events             */
/* ------------------------------------------------------------------ */

interface DonkiFlare {
  flrID: string;
  classType: string;
  peakTime: string;
  sourceLocation: string;
}

/** Map a GOES flare class (A/B/C/M/X + strength) to gameplay severity 0..1 */
function flareSeverity(cls: string): number {
  const m = /^([ABCMX])(\d+(\.\d+)?)?$/.exec(cls.trim().toUpperCase());
  if (!m) return 0.2;
  const base = { A: 0, B: 0.1, C: 0.25, M: 0.55, X: 0.9 }[m[1]] ?? 0.2;
  const num = m[2] ? parseFloat(m[2]) : 1;
  return Math.min(1, base + (base >= 0.55 ? num * 0.06 : num * 0.05));
}

/**
 * Fetch real solar flares within a date range (the player's cruise window).
 * https://api.nasa.gov > DONKI > SolarFlare
 */
export async function fetchSolarFlares(start: string, end: string): Promise<NasaEvent[]> {
  try {
    const flares = await cachedJson<DonkiFlare[]>(
      `${BASE}/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=${KEY}`,
    );
    return flares.map((f) => ({
      id: f.flrID,
      type: "SOLAR_FLARE",
      title: `${f.classType} solar flare${f.sourceLocation ? " from " + f.sourceLocation : ""}`,
      date: f.peakTime,
      severity: flareSeverity(f.classType),
      source: "DONKI",
    }));
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* NeoWs — real near-Earth asteroids as selectable mission targets     */
/* ------------------------------------------------------------------ */

interface NeoFeed {
  near_earth_objects: Record<
    string,
    {
      id: string;
      name: string;
      estimated_diameter: { kilometers: { estimated_diameter_max: number } };
      close_approach_data: { miss_distance: { kilometers: string }; relative_velocity: { kilometers_per_second: string } }[];
    }[]
  >;
}

export interface AsteroidTarget {
  id: string;
  name: string;
  diameterKm: number;
  missKm: number;
  velocityKmS: number;
}

/** Real asteroids flying past Earth this week — pick one to visit. */
export async function fetchAsteroidTargets(): Promise<AsteroidTarget[]> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const feed = await cachedJson<NeoFeed>(
      `${BASE}/neo/rest/v1/feed?start_date=${today}&api_key=${KEY}`,
    );
    const day = Object.values(feed.near_earth_objects)[0] ?? [];
    return day
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        name: a.name,
        diameterKm: a.estimated_diameter.kilometers.estimated_diameter_max,
        missKm: parseFloat(a.close_approach_data[0]?.miss_distance.kilometers ?? "0"),
        velocityKmS: parseFloat(a.close_approach_data[0]?.relative_velocity.kilometers_per_second ?? "0"),
      }));
  } catch {
    return [
      { id: "fb", name: "433 Eros", diameterKm: 16.8, missKm: 2.2e7, velocityKmS: 24.4 },
      { id: "ps", name: "99942 Apophis", diameterKm: 0.37, missKm: 3.9e7, velocityKmS: 4.6 },
      { id: "vs", name: "2029 VA", diameterKm: 0.02, missKm: 8.1e6, velocityKmS: 11.2 },
    ];
  }
}

/* ------------------------------------------------------------------ */
/* APOD — mission flavor imagery for the debrief screen                */
/* ------------------------------------------------------------------ */

interface Apod {
  title: string;
  url: string;
  explanation: string;
}

export async function fetchApod(date?: string): Promise<Apod | null> {
  try {
    return await cachedJson<Apod>(
      `${BASE}/planetary/apod${date ? `?date=${date}&` : "?"}api_key=${KEY}`,
    );
  } catch {
    return null;
  }
}
