# Piano Roll

Client-side MIDI note editor, built incrementally with React, TypeScript, Zustand,
Canvas 2D, use-gesture, and shadcn/ui with Radix primitives. Playback and command-based
undo/redo are implemented; MIDI I/O and persistence are later milestones.

The workspace fills the browser viewport, with pitch-reference keys on the left,
tools and note insertion across the top, playback at the upper right, and a
blank panel reserved beside the grid. Canvas dimensions follow the available
panel size; pitch rows stay 20 CSS pixels high. Below 1024 pixels wide, the right
panel hides and playback moves below the tools to give the grid more room.
Unfinished MIDI, save, transport, tempo, and Mix / FX controls are
represented by empty, static placeholders without labels or mock controls.
The keys are visual pitch references;
they do not audition notes yet.

## Development

```sh
npm ci
npm run dev
```

Keyboard users can create a note with the New note pitch / Start tick form.
Click a note to select it; Ctrl/Cmd-click toggles selection, and Ctrl/Cmd-drag
empty grid replaces selection with overlapping notes. Shift-drag pans;
Ctrl-wheel zooms. Arrow keys move the selection and Delete removes it.
Space plays or pauses from the grid, selected-note overlay, or note list.
Enter toggles a focused note-list button's selection.
Ctrl/Cmd+C copies the selected notes within this tab. Ctrl/Cmd+V pastes
after the current selection, or after the last paste when nothing is selected.
The group starts at the next 120-tick grid boundary and keeps its internal
spacing, pitches, durations, and velocities. New notes become the selection;
if the whole group will not fit, the paste is rejected and announced.
Drag a note's visible right edge, or use Shift+Left/Right, to resize the
selection by a shared tick delta. Notes have a minimum duration of 120 ticks.
Notes extending past a shortened timeline may be shortened but cannot be
extended further; resizing does not force them inside the timeline.
Movement reveals the selection without changing the stored MIDI coordinates.

Ctrl/Cmd+Z undoes the last note edit; Ctrl/Cmd+Shift+Z redoes it. Toolbar Undo and
Redo use the same actions. Each insertion, group move, resize, deletion, or paste
creates one reversible command. Drag previews stay outside history and commit once
on release. Two Zustand stacks retain affected-note data and before/after selection
IDs, rather than full project snapshots. Undo/redo restores that selection, keeps
note IDs and drawing order, reveals the restored selection, and announces the result.
Selection-only changes and no-op edits preserve history; new edits clear redo.
Shortcuts respect editable controls, menus, key-repeat guards, and active gestures.
If a focused note disappears, focus returns to the editor. History stays in memory
for this tab and is not saved across reloads.

Shared controls live in `src/shared/components/ui/`; `components.json` directs
the shadcn CLI to that folder. Sonner notifications use one app-level Toaster.
The minimal brutalist theme uses square controls, locally bundled Barlow type,
black/graphite surfaces, peach primary actions, and pink focus indicators.
The [studio palette](docs/palette.md) documents colors and measured contrast.
CSS tokens live in `src/styles/index.css`; canvas colors live
in `rendering/colors.ts`. Unselected notes have a thin inset border to separate
adjacent notes; selected notes have a thicker outline. Black-key grid rows use
a slightly lighter graphite background aligned with the pitch-reference keys.
`usePlaybackControls` shares readiness notifications and the audio-start action
between the playback button and the editor's Space shortcut.
`usePianoSampler` creates a `Tone.Sampler` in an effect, keeps it in a ref, and
disposes it on cleanup. Thirty Salamander Grand Piano MP3 samples are bundled
in `public/audio/piano/` (about 2 MB), with attribution and the original README.
They load in the background from the app's own origin. Play shows a loading toast
until loading completes, then "Piano ready" appears. Loading failures give an
error toast. Play unlocks Tone's audio context and schedules the current grid
notes through `usePlayback` using Tone's Transport. The button switches its icon and accessible label
between Play and Pause. Pausing releases active sampler voices; resuming keeps
the same transport position and scheduled events, and reattacks notes still held
at that position. Their original note-off events end the remaining duration.
Overlapping notes of the same pitch release together at their latest endpoint;
back-to-back notes release before the next attack. Playback finishes at the last
note's endpoint, resets the button to Play, and clears its old events. Pressing
Play again rebuilds the schedule from the current notes and starts at tick zero.
An empty project stays ready to play. Unmount stops playback, clears the editor's
event IDs and pending completion callback, and disposes the sampler.

A separate canvas draws the playhead line and ruler marker from the immediate
audio clock, without per-frame React updates or full-grid redraws. The viewport
automatically follows at the edge of a zoomed-in grid; pause holds the audible
position, and completion returns the runner and view to zero. Zooming and panning
also redraw the frozen runner. A live `Tone.Waveform` taps the sampler output
beside Play, includes its release tail, and stops polling when idle. Reduced motion
disables waveform animation while preserving the essential playback indicator.
Screen readers receive playback-state announcements instead of frame updates.

## Verification

```sh
npm run test:run
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

Unit tests cover pure math, store actions, rendering contracts, and accessibility
handlers. Browser tests use real pointer capture, generated clicks, wheel events,
Radix menus, and keyboard focus. A 1000-note Canvas timing case records diagnostic
mean/p95 times in test artifacts; it is not a claim of 60fps on every machine.

Husky runs lint-staged lint/format checks and a project-wide TypeScript check on
commit. `npm ci` activates hooks through `prepare`; when scripts are deliberately
disabled, run `npm run prepare` separately. Hooks never stage the entire repository.

## Ownership

- `components/`: grouped into `editor/`, `toolbar/`, `grid/`, `notes/`, and
  `playback/`. `PianoRollEditor` composes the header, main workspace, and footer.
  The header separates tools from playback; the main workspace contains keys,
  ruler, the editing surface, and the reserved sidebar. The surface composes the
  grid and playhead canvases, selected-note overlay, context menu, accessible list,
  instructions, and announcements.
- `hooks/`: `editor/` owns composition, viewport, grid rendering, and zoom/pan;
  `notes/` owns actions, announcements, gestures, clipboard, and keyboard commands;
  `playback/` owns the sampler, controls, scheduling, completion, and visual loops.
- `audio/`: piano sample mapping, playback types, and note-event scheduling; audio files and credits are in
  `public/audio/piano/`.
- `rendering/`: drawing passes grouped into `grid/`, `notes/`, and `playback/`,
  with shared colors at the root.
- `utils/`: grouped into `coordinates/`, `notes/`, `time/`, and `viewport/`.
- `store/`: normalized note data, selection, and undo/redo stacks; `commands/`
  owns typed command payloads, creation, and pure forward/reverse application.

The note index is derived from the immutable notes record, not stored in Zustand.
Per-pitch start ordering and prefix maximum endpoints preserve long-note overlaps;
queries preserve insertion/drawing order. Drag previews and DOM-overlay positions
stay in refs/imperative drawing, not per-frame React state. Unchanged accessible
list rows retain their note references and are memoized.

Every application source file stays within 200 physical lines, and each React
component has its own file. Select and context-menu primitives retain their
existing import modules as barrels over individual component files. ESLint
enforces the line limit for TypeScript source; tests are exempt.

Timeline shortening preserves existing notes; deletion/truncation beyond its end
remains an explicit product decision rather than an implicit cleanup operation.

GitHub Actions runs lint, unit tests, the typechecked production build, and the
Chromium interaction suite on pushes and pull requests.
