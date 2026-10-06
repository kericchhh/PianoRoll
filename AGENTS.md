# AGENTS.md — Piano Roll MIDI Composer

This file is the operating manual for any AI agent (Claude Code, Cursor, Copilot Workspace, etc.) assisting on this project. Read it fully before touching anything.

---

## 0. How You Are Allowed to Help (read this first)

This is the single most important section. Violating it defeats the purpose of the project.

- **Do not write complete components, files, or features end-to-end.** The human is building this themselves to learn it and to be able to defend every line in an interview.
- **Give snippets, not implementations.** A snippet is 5–25 lines that illustrates _one_ API call, _one_ algorithm shape, or _one_ pattern — never a finished, drop-in file.
- **Point to exact APIs/docs** (`AudioContext.createBufferSource`, `Tone.Transport.scheduleRepeat`, etc.) rather than wrapping them for the human.
- **If asked "how do I do X," answer with approach + a short illustrative snippet**, and explicitly say what's left for the human to wire up themselves.
- **Flag accessibility and performance implications** of any suggestion, even if not asked — they're first-class requirements here, not an afterthought pass.
- **Never fix bugs by rewriting the surrounding code.** Explain what's wrong and what the fix targets; let the human make the edit.
- It is fine to write throwaway code to help the human _debug or verify_ something (e.g., a one-off script to inspect a MIDI file's bytes) — that's tooling, not the product.

---

## 1. Project Overview

A browser-based piano-roll MIDI composer (like a mini Ableton/Logic note editor) — not a fixed-grid drum machine. Notes have pitch, start time, duration, and velocity on a scrollable/zoomable grid. Fully client-side: no backend, ever.

**Non-goals (do not suggest adding these):**

- No server, no auth, no database — IndexedDB is the only persistence layer.
- No DAW-scope creep (no mixing console, no plugin/VST hosting, no multi-track audio recording).
- No mobile-first redesign — desktop-first, responsive as a secondary concern, but keyboard/mouse precision is the primary interaction model.

---

## 2. Tech Stack (do not substitute without asking)

| Purpose                                                        | Library                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------ |
| Framework                                                      | React + TypeScript (strict mode), Vite                             |
| State + undo/redo                                              | Zustand (command pattern, not snapshot-based history)              |
| Audio engine / scheduling                                      | Tone.js                                                            |
| MIDI encode/decode                                             | `@tonejs/midi`                                                     |
| Drag/gesture handling                                          | `@use-gesture/react`                                               |
| Canvas rendering                                               | Hand-rolled Canvas 2D (no scene-graph library — this is the point) |
| Local persistence                                              | Dexie.js (IndexedDB wrapper)                                       |
| UI chrome animation (toolbar/panels only, never the note grid) | Framer Motion                                                      |
| Accessible primitives (menus, sliders, dialogs)                | shadcn/ui with Radix UI; Sonner for toasts                         |
| Icons                                                          | lucide-react                                                       |
| Styling                                                        | Tailwind CSS                                                       |
| Optional hardware input                                        | Web MIDI API (native, no library)                                  |
| Testing                                                        | Vitest, React Testing Library, Playwright (e2e)                    |
| Lint/format                                                    | ESLint, Prettier, `tsc --noEmit` in CI                             |

---

## 3. Architecture

### 3.1 Data layer

Notes are normalized entities keyed by id, **not** nested arrays-of-objects-in-objects:

```ts
interface Note {
    id: string;
    pitch: number; // MIDI 0–127
    startTick: number; // tempo-independent time unit
    durationTicks: number;
    velocity: number; // 0–127
    selected: boolean;
}
```

Time is stored in **ticks** (480 PPQ is a sane default), never seconds or pixels. Tempo changes must only affect the tick→second conversion function — never require touching note data.

### 3.2 Audio engine layer

The core system-design fact to internalize: `setTimeout`/`requestAnimationFrame` are not sample-accurate and drift, especially in background tabs. The correct pattern is a **look-ahead scheduler** — a ~25ms interval that looks ~100ms ahead and schedules audio events against `AudioContext.currentTime` (the authoritative clock), not JS wall-clock time. Tone.js's `Transport` implements this; use it rather than hand-rolling unless the human specifically wants to build it from raw Web Audio to demonstrate understanding.

Polyphony needs voice management — `Tone.PolySynth` or `Tone.Sampler`, not manual oscillator pooling, unless asked.

### 3.3 Rendering layer — the central architectural decision

- **Canvas**: cheap at scale (1000+ notes), but invisible to assistive tech by default.
- **DOM**: free accessibility and easy Framer Motion, but degrades past a few hundred notes.
- **Chosen approach: hybrid.** Canvas for the note grid itself. A thin DOM overlay for only the currently selected/dragged note (native pointer capture + focus ring). A visually-hidden list synced to the note array, wrapped in an `aria-live="polite"` region, for screen reader users.

Do not suggest an all-canvas or all-DOM rewrite without flagging that it reopens this trade-off.

### 3.4 Coordinate system

One pure function everything depends on:

```ts
pixelX = tickToPixel(tick, pixelsPerTick, scrollOffsetX);
```

Zoom mutates `pixelsPerTick`. Pan mutates `scrollOffsetX`. Pitch→row is a fixed-height inverted mapping (higher pitch = higher on screen). Snapping rounds a dragged note's raw tick to the nearest grid subdivision **before** it's committed to the store, not after.

### 3.5 Interaction layer

Draw, move, resize (drag right edge), marquee multi-select, delete, per-note velocity (secondary lane), zoom/pan — via `@use-gesture/react` for the pointer/touch/wheel abstraction. The music-specific math (snapping, tick conversion, hit-testing) is the human's to write.

### 3.6 Persistence + export

IndexedDB (via Dexie) for project save/load. `.mid` export/import via `@tonejs/midi`, serialized to a `Blob` and downloaded — no server round-trip.

---

## 4. Folder Structure

```
src/
  app/                    # app shell, top-level layout
  features/
    piano-roll/
      components/
        editor/            # shell, header/footer, announcements, sidebar
        toolbar/           # tools, timeline length, snap indicator
        grid/              # surface, canvas, keys, ruler
        notes/             # insertion, list, context menu, selected overlay
        playback/          # controls, status, waveform, playhead
      hooks/
        editor/            # composition, viewport, grid renderer, zoom/pan
        notes/             # actions, gestures, clipboard, keyboard
        playback/          # sampler, scheduling, controls, visual renderers
      store/               # Zustand store + command history
      audio/               # Tone.js setup, scheduler glue
      midi/                # import/export via @tonejs/midi
      rendering/
        grid/              # grid, pitch rows, timeline
        notes/             # notes and marquee
        playback/          # playhead and waveform
      utils/
        coordinates/       # pixel/tick/pitch conversion and event mapping
        notes/             # queries, group edits, playback note math
        time/              # snapping and tick/second conversion
        viewport/          # zoom/scroll bounds, reveal, playback following
      types.ts
  shared/
    components/            # generic accessible primitives
    hooks/
    utils/
  styles/
tests/
  unit/
  e2e/
```

---

## 5. State Management Conventions

- Undo/redo is a **command pattern** (each edit is a reversible command object with `do`/`undo`), not full-state snapshots — cheaper and easier to reason about at scale.
- Store actions are pure and typed; no `any`. Prefer a discriminated union for command types:

```ts
type Command =
    | { type: 'ADD_NOTE'; note: Note }
    | { type: 'MOVE_NOTE'; id: string; from: Partial<Note>; to: Partial<Note> }
    | { type: 'DELETE_NOTE'; note: Note };
```

- Derived data (e.g., "notes visible in the current viewport") is computed in a memoized selector, never stored redundantly in state.
- The playhead position during playback must **not** flow through React state on every tick — read it directly from `Tone.Transport` inside a `requestAnimationFrame` loop that draws straight to canvas, bypassing re-renders entirely. This is a common mistake to watch for.

---

## 6. Accessibility Requirements (non-negotiable, not a later pass)

- Full keyboard operability: arrow keys move the selected note, Shift+arrow resizes, Delete removes, Ctrl/Cmd+Z / Shift+Ctrl+Z undo/redo, Space toggles play/pause.
- Every note mutation (add/move/resize/delete) announces a concise message via the `aria-live` region.
- Visible, high-contrast focus indicators (WCAG AA minimum contrast) on the DOM-overlay note and all toolbar controls.
- Respect `prefers-reduced-motion` — disable non-essential Framer Motion transitions when set.
- Screen-reader users must be able to enumerate and edit notes via the hidden list, not just via the canvas.

---

## 7. Performance Budget

- Target: smooth interaction (60fps) with 1000+ notes on screen.
- Only render/hit-test notes within the visible tick range (windowing), not the whole project.
- No React re-renders driven by the playhead or by canvas pointer-move events — those stay in refs/canvas-land.
- Memoize expensive derived views (visible-note slice, velocity-lane data) with selectors keyed on the minimal relevant state.

---

## 8. Coding Standards

- TypeScript strict mode, no `any`, no implicit `unknown` leaks into consumers.
- Functional components + hooks only — no class components.
- Use four spaces for indentation. Prettier enforces `tabWidth: 4` and `useTabs: false`.
- Named exports for components (better refactor tooling / tree-shaking clarity) — default export only for pages/entry points.
- One responsibility per file; canvas drawing logic lives separately from React component lifecycle glue.
- Application files in `src/` must stay at or below 200 physical lines, including comments and blank lines. Each React component lives in its own file; related shared primitives may retain a barrel module for imports. This size limit does not apply to tests.
- Every non-trivial pure function (tick math, snapping, hit-testing, command reducers) gets a unit test — UI rendering itself doesn't need exhaustive tests, but logic does.
- Conventional Commits style messages (`feat:`, `fix:`, `refactor:`), one logical change per commit.
- Pre-commit: lint-staged running ESLint + Prettier + `tsc --noEmit`.

---

## 9. Build Milestones (use this to scope any given task)

1. Static grid render, zoom/pan
2. Note CRUD via the canvas + DOM-overlay hybrid
3. Playback: Tone.js Transport + look-ahead scheduler + non-React playhead
4. Undo/redo command stack
5. MIDI import/export
6. IndexedDB persistence (project save/load)
7. Accessibility pass (live region, full keyboard parity)
8. Polish: velocity lane, snap settings, theming

When given a task, identify which milestone it belongs to and don't pull in work from later milestones unless asked.

---

## 10. Anti-Patterns to Call Out, Not Silently Fix

- Driving the playhead or drag-preview through React state on every frame.
- Storing note position in pixels or seconds instead of ticks.
- All-canvas or all-DOM rendering without acknowledging the accessibility/perf trade-off it reopens.
- Snapshot-based undo/redo (deep-cloning full state per edit) instead of the command pattern.
- Adding a backend, auth, or server-synced state of any kind.

---

## 11. Open Questions Log

When a task surfaces a genuine unresolved design choice (e.g., exact PPQ resolution, whether to support multiple instrument tracks, sampler vs. synth default), add it here instead of deciding unilaterally, so the human can weigh in.

- Confirmed: the user selects the timeline length from 4, 8, 16, or 32 bars. Scroll and drawing bounds follow the selected length. Minimum zoom fits the selected timeline to the viewport; displayed grid subdivisions adapt to zoom while pitch-row height stays fixed. Still to decide: initial length, time signature and PPQ, and how shortening the timeline handles existing notes beyond the new endpoint.
- Confirmed: right-edge dragging and Shift+Left/Right resize the selected notes by a shared tick delta, with a 120-tick minimum duration. Notes already extending past a shortened timeline can be shortened without forced truncation, but cannot be extended further. The pointer target is the final 6 CSS pixels of the note, capped at half its width, and requires the actual endpoint to be visible. Pointer resizing snaps the dragged note's endpoint; previews stay in refs and the group commits once on release.
- Confirmed: Ctrl/Cmd+C copies selected notes into an editor-local clipboard within this tab. Ctrl/Cmd+V pastes after the current selected group or last paste, rounding the group origin forward to the next 120-tick grid boundary while preserving internal spacing, pitches, durations, and velocities. Pasted notes receive fresh IDs and replace the selection in one store update. A group that cannot fit is rejected in full and announced; copying nothing preserves the previous clipboard. Shortcuts respect editable controls, menus, and active gestures.
- Confirmed: unselected notes have a one-pixel inset border, capped for narrow notes at minimum zoom. Selected notes retain their thicker outline. Black-key grid rows have a slightly lighter graphite background, drawn before grid lines and notes and aligned with the pitch-reference keys.
- Confirmed: the editor fills the viewport, with pitch-reference keys on the left, tools across the top, playback at the upper right, and a blank reserved sidebar on the right. Canvas dimensions follow the panel while pitch rows stay fixed. Unfinished areas use empty, static skeletons without labels or mock controls; these placeholders do not authorize implementing their features. The sidebar hides below 1024 pixels wide to preserve grid space.
- Confirmed: UI styling follows a minimal brutalist direction with square edges, Barlow bundled locally, black/graphite surfaces, warm white text, peach actions, and pink notes/focus. See `docs/palette.md` for exact colors and contrast pairs.
- Confirmed: the initial playback instrument uses recorded piano samples with `Tone.Sampler`. The user chose bundled Salamander Grand Piano samples from the Tone.js sampler example, with attribution. `usePianoSampler` holds the sampler in a ref, owns effect setup/cleanup, and ignores callbacks after cleanup.
- Confirmed: piano samples load in the background. Play stays clickable; pressing it before readiness shows a loading toast without starting playback. Actual sample readiness shows a "Piano ready" toast, with no permanent status text. Audio context activation still happens from the user's Play action once samples are ready.
- Confirmed: shared controls use shadcn/ui with Radix primitives, including the custom Select for timeline length, and Sonner for toast notifications. App passes actual readiness and failure state to `usePlaybackControls`, which owns readiness toasts and audio-context activation and calls `usePlayback`'s toggle callback. Its returned action is shared by PlaybackControls and the editor's Space shortcut. PlaybackControls receives isPlaying/onPlay props; the playback hook owns Transport scheduling and cleanup. Note data stays in ticks. Space works from grid, selected-note overlay, and note-list focus, respects editable/menu/gesture guards, and ignores repeat and modified keys. Enter toggles a focused note-list button's selection.
- Confirmed: the default visual theme is near-black with peach and pink accents. Controls, toasts, canvas notes, and focus indicators follow this palette; color choices are delegated to the agent for this theme request.
- Confirmed: the user chose pause/resume. The playback button switches between Play and Pause icons and accessible labels. Pausing/resuming retains the existing scheduled note events and transport position; resuming must not schedule duplicate events.
- Confirmed: playback has a canvas playhead with a ruler marker and automatically follows when it reaches the visible grid edge. Its tick comes from the immediate audio clock, bypassing React state; completion returns the runner and view to zero. A live waveform beside Play taps the sampler output, respects reduced motion, and clears after the release tail. Playback-state announcements do not announce every frame.
- Confirmed: resume reattacks notes held at the paused position for their remaining time. Playback finishes at the latest note endpoint, returns the button to Play, and permits replay from tick zero. An empty project stays ready to play.
- Confirmed: overlapping notes of the same pitch share a release at their latest endpoint. Back-to-back notes release before the next attack. Schedule attacks and releases separately so Sampler.releaseAll can release held voices on pause.
- Implemented: playback captures the notes at a fresh start; resume retains that schedule and does not mix in edits made while paused. Completion waits for the audio clock to reach the endpoint; pause, replay, and unmount cancel or invalidate pending completion callbacks. A fresh start clears the editor's old event IDs. Unmount stops the transport and clears owned events; sampler disposal and callback identity guards prevent late callbacks from using a disposed sampler or an old playback session.
