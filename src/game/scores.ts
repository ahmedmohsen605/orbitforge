/**
 * Mission record leaderboard — persisted in localStorage.
 * Ranked by science return, tie-broken by spacecraft health.
 */

export interface ScoreEntry {
  id: string;
  name: string;
  missionId: string;
  missionName: string;
  science: number;
  health: number;
  cost: number;
  grade: string;
  date: string;
}

const KEY = "orbitforge-scores-v1";

export function getScores(): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

export function addScore(
  e: Omit<ScoreEntry, "id" | "date">,
): { entry: ScoreEntry; rank: number } {
  const entry: ScoreEntry = {
    ...e,
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}`,
    date: new Date().toISOString(),
  };
  const all = [...getScores(), entry].sort(
    (a, b) => b.science - a.science || b.health - a.health,
  );
  localStorage.setItem(KEY, JSON.stringify(all));
  return { entry, rank: all.findIndex((x) => x.id === entry.id) + 1 };
}

export function clearScores(): void {
  localStorage.removeItem(KEY);
}
