# 🛠️ ORBITFORGE

**Forge real space missions from NASA's open data.**

> *ORBITFORGE* — NASA Space Apps Challenge 2026, "Space Mission Design Game"
> An education-first browser game where kids (and future mission designers) explore a real 3D solar system, learn rocketry against real NASA engineering standards, and design, build, and fly complete space missions — with every number sourced and cited from NASA open data.

---

## 🎯 What it is

Designing a space mission means balancing competing demands — objectives, spacecraft design, instruments, launch vehicles, budget, power, communications, orbital constraints. For students, these trade-offs usually stay abstract. **ORBITFORGE makes them playable.**

The game has three connected pillars, built education-first:

### 🎓 LEARN — Rocket Builder Academy *(the kids' entry point)*
- A 5-step wizard: **payload → engines → propellant → standards → launch**
- Teaches the **real standards**: Tsiolkovsky rocket equation, thrust-to-weight ≥ 1.2, staging, mass fraction, vacuum vs. sea-level engines, solids vs. liquids — each with a kid-friendly Learn card citing NASA Glenn's *Beginner's Guide to Rockets*
- Real engines with cited specs (Merlin 1D ×9 like the actual Falcon 9, RS-25, Raptor, RL10, solid boosters)
- Live ascent simulation at time-warp: liftoff TWR readout, **stage separation**, exponential-atmosphere drag, then **full mission legs to the Moon or Mars** — Trans-Lunar Injection, orbit insertion, powered descent, touchdown
- Teaches the counter-intuitive truth: *Mars landings are cheaper than Moon landings because aerobraking does the braking*

### 🪐 EXPLORE — the Open Solar System
- Free-flight 3D map of 10 bodies with NASA-derived CC-BY textures (order, sizes and orbital periods are real)
- Click any planet → **cinematic fly-in**, close orbit, color swatch + full NASA fact-sheet dossier (diameter, distance, day/year, moons, temperature, gravity)
- The Moon orbits Earth; the asteroid belt glitters; a live dashed **transfer path** connects Earth to your selected target
- Live ticker of **humans in space right now** (open-notify feed)

### 🚀 PLAY — the Mission Design Console
- 5 mission profiles modeled on real ones: MAVEN-style Mars mapper, LRO-style lunar recon, OSIRIS-REx-style asteroid scout, Earth climate sentinel, and a beginner **CubeSat rideshare** mission
- Every choice from **source-cited catalogs**: launch vehicles, propulsion, power (solar/RTG), deep-space comms (X/Ka/optical), instruments, and **real NASA astronauts** as crew whose skills mitigate real anomaly types
- Live constraint gauges: Δv via Tsiolkovsky, mass vs. launcher, power, data-link duty cycle (recorder-buffered, like LRO/MRO), budget vs. the real analog mission's cost
- **Science Traceability Matrix** (NASA practice): objective → measurement → instrument, catching science gaps before "launch"
- **CML 1-4 badge** — your concept matures through JPL's Concept Maturity Levels as it proves out
- Turn-based cruise simulation where **real solar flares fetched live from NASA DONKI** hit your spacecraft for your actual mission dates — EVA-capable crew can repair mid-cruise
- Leaderboard of mission records, NASA APOD debrief imagery, and a **one-click GMAT script export** for NASA's real trajectory tool

### 🤖 NOVA — the in-game AI advisor
Ask anything, on any screen, in context: "what is delta-v?", "why is my power red?", "who is Sunita Williams?", "what NASA data do you use?" Built-in NASA knowledge engine works offline; plug in an optional LLM API key for full generative answers (auto-fallback keeps the game judging-proof).

---

## 📚 NASA open data & challenge resources

| Source | Used for |
|---|---|
| **api.nasa.gov → DONKI** | Real solar-flare events drive the cruise simulation |
| **api.nasa.gov → NeoWs** | Real near-Earth asteroids as selectable targets |
| **api.nasa.gov → APOD** | Debrief imagery |
| **data.nasa.gov / NASA fact sheets** | Vehicle, instrument, power, comms, propulsion specs (all cited in-game) |
| **code.nasa.gov → GMAT** | Mission script export in real GMAT syntax |
| **JPL CML framework** | Concept maturity badge system |
| **CubeSat 101 (NASA CSLI)** | CubeSat-class hardware stats & the rideshare mission |
| **NASA Glenn Beginner's Guide to Rockets** | Rocket Builder academy standards |
| **nasa.gov/astronauts** | Crew roster identities & records |
| **open-notify.org** | Live humans-in-space feed |
| **Solar System Scope textures (CC-BY, NASA-derived)** | Planet surfaces |

**All 9 official challenge-page resources are used** — the in-game "📚 NASA resources" panel maps each one to the exact feature it powers.

## 🎮 How to run

```bash
npm install
npm run dev        # http://localhost:5173
```

Optional keys (all free): `VITE_NASA_API_KEY` (api.nasa.gov — 30-second signup) for full-rate NASA data; `VITE_AI_API_KEY` (+ `VITE_AI_BASE_URL`, `VITE_AI_MODEL`) to switch NOVA to a real LLM. Without keys the game runs fully on built-in fallbacks — it never breaks offline.

## 🛠 Built with

React + TypeScript + Vite + Three.js. No game engine, no backend required — everything runs in the browser.

---

*Built for the NASA Space Apps Challenge 2026. All mission parameters are engineering-accurate approximations for gameplay, with sources cited on-screen. NASA imagery/data are public domain; textures CC-BY 4.0 Solar System Scope.*
