# Piano Roll

Client-side MIDI note editor, built incrementally with React, TypeScript, Zustand,
Canvas 2D, use-gesture, and shadcn/ui with Radix primitives. Playback is the current
learning milestone; MIDI I/O and persistence are later milestones.

The workspace fills the browser viewport, with pitch-reference keys on the left,
tools and note insertion across the top, playback at the upper right, and a
blank panel reserved beside the grid. Canvas dimensions follow the available
panel size; pitch rows stay 20 CSS pixels high. Below 1024 pixels wide, the right
panel hides and playback moves below the tools to give the grid more room.
Unfinished history, MIDI, save, transport, tempo, and Mix / FX controls are
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
Drag a note's visible right edge, or use Shift+Left/Right, to resize the
selection by a shared tick delta. Notes have a minimum duration of 120 ticks.
Notes extending past a shortened timeline may be shortened but cannot be
extended further; resizing does not force them inside the timeline.
Movement reveals the selection without changing the stored MIDI coordinates.

Shared controls live in `src/shared/components/ui/`; `components.json` directs
the shadcn CLI to that folder. Sonner notifications use one app-level Toaster.
The minimal brutalist theme uses square controls, locally bundled Barlow type,
black/graphite surfaces, peach primary actions, and pink focus indicators.
The [studio palette](docs/palette.md) documents colors and measured contrast.
CSS tokens live in `src/styles/index.css`; canvas colors live
in `rendering/colors.ts`. Selected notes also have an inset outline so selection
does not rely on color alone.
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

- `components/`: editor shell, insertion form, accessible list and context menu.
- `hooks/`: gesture routing, note actions/announcements, keyboard commands,
  zoom/pan, canvas lifecycle/scheduling, sampler lifecycle/readiness, and playback
  scheduling, retriggers, and completion cleanup.
- `audio/`: the piano sample mapping; audio files and credits are in
  `public/audio/piano/`.
- `rendering/`: Canvas drawing passes, including ghosts and marquee ordering.
- `utils/`: coordinate conversion, snapping, viewport reveal and note queries.
- `store/`: normalized note data and atomic group edits.

The note index is derived from the immutable notes record, not stored in Zustand.
Per-pitch start ordering and prefix maximum endpoints preserve long-note overlaps;
queries preserve insertion/drawing order. Drag previews and DOM-overlay positions
stay in refs/imperative drawing, not per-frame React state. Unchanged accessible
list rows retain their note references and are memoized.

Timeline shortening preserves existing notes; deletion/truncation beyond its end
remains an explicit product decision rather than an implicit cleanup operation.

GitHub Actions runs lint, unit tests, the typechecked production build, and the
Chromium interaction suite on pushes and pull requests.
