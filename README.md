# Piano Roll

Client-side MIDI note editor, built incrementally with React, TypeScript, Zustand,
Canvas 2D, use-gesture, and shadcn/ui with Radix primitives. Playback and command-based
undo/redo, MIDI import/export, and custom audio samples are implemented. Project
persistence is a later slice.

The workspace fills the browser viewport, with pitch-reference keys on the left,
tools and note insertion across the top, playback at the upper right, and a
blank panel reserved beside the grid. Canvas dimensions follow the available
panel size; pitch rows stay 20 CSS pixels high. Below 1024 pixels wide, the right
panel hides and playback moves below the tools to give the grid more room.
Unfinished save, transport, tempo, and Mix / FX controls are
represented by empty, static placeholders without labels or mock controls.
The left piano keys preview their pitch on pointer press, Enter, or Space, using
a short piano sound without inserting notes or changing selection or history.
One Tab stop enters the visible keys; Up/Down selects the next pitch and scrolls
at the visible edges. Home/End reaches the first/last visible key. Scrolling over
the keys moves the pitch rows and matching notes, with bounds at MIDI 0 and 127.
Wheel movement batches into animation frames and does not change notes or history.
Press feedback uses Motion's spring animation
to depress the key face, preserving its black or white finish. Reduced motion
keeps only a static inset shadow. Preview voices have their own sampler and share
the playback sampler's decoded buffers, so auditioning does not cut off playback
or download a second set of samples.

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
selection by a shared tick delta. Editing uses a 120-tick minimum duration;
imported MIDI retains shorter durations, which can be extended to that minimum.
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

Settings opens a panel from the left, with Import MIDI, Export MIDI, and instrument
sample controls. The panel
overlays the workspace without resizing the grid, traps keyboard focus, closes
with Escape or its close button, and returns focus to Settings. Motion for React
animates the panel; reduced motion skips the animation and follows live preference
changes. File buttons stay focusable while busy, prevent duplicate submissions,
and allow choosing the same file again. Errors have inline accessible messages.

Import MIDI replaces the composition in one reversible `IMPORT_NOTES` command.
Undo restores previous notes, order, and selection; redo restores the imported
IDs. All tracks merge into the editor's one instrument. The parser converts note
starts and endpoints from the file's PPQ to 480 PPQ without grid snapping and
retains pitch, velocity, overlaps, and short durations. The current playback tempo
and 4/4 grid stay in use; imported tempo maps, meters, programs, and controllers
are not applied. The timeline expands to the next supported length, up to 32 bars;
notes beyond that remain available in the note list, playback, and export. Import
selects and reveals the first note and announces the result. A valid empty MIDI
clears the notes reversibly. Unsupported format-2 and SMPTE files, malformed
events, files over 2 MB, and files with over 10,000 note-on events are rejected
before note data or playback changes. Bounded event validation precedes the
library parser; shared import/export note validation also prevents tick values
that overflow the MIDI writer's variable-length integers.

Settings uses MIDI and Instrument tabs in a fixed panel. Only the pending sample
list scrolls; its load/cancel actions remain visible. A GitHub icon in the lower
right links to the repository.

Import instrument folder replaces the entire playback and preview instrument.
The folder picker reads nested audio files locally and ignores metadata/hidden
files. Filenames such as `C4.wav`, `Ds4.mp3`, `Fs4.wav`, `Bb3.ogg`, and `MIDI60.wav`
set each sample's original pitch. Unknown or ambiguous names need a manual MIDI
pitch assignment before loading. The mapping list is keyboard operable; duplicate
roots must be reassigned or removed, so velocity layers cannot overwrite silently.
Roots span MIDI 0–127; the bank must collectively cover every editor pitch within
Tone's 95-semitone search. Missing pitches transpose the nearest sample.
Folders are limited to 128 audio samples, 200 MB encoded, and 256 MB decoded PCM.
Sequential decoding also waits for any canceled native decoder before reading
another file. The current instrument and playback stay active until every file
validates and decodes. Failure/cancellation retains that instrument. Successful
replacement disposes old voices and drops all their sample roots.

The optional Use a single sample section loads one pitched audio recording with a selectable root pitch.
Browser-supported formats such as WAV, MP3, OGG, and FLAC depend on the browser's
decoder. Files are limited to 20 MB, 30 seconds, and 128 MB of decoded audio.
Root assignments span MIDI 32–95, keeping every editor pitch within the installed
Tone sampler's 95-semitone search range. The recording plays once and transposes
by playback rate; it is not a looping instrument bank or a plugin loader.
The root is the recording's original pitch: a C4 sample rooted at C4 plays C5 at
twice the speed. Before importing a sample, the control sets the next import's
root when using the bundled piano or a multi-sample bank. With an active
single-sample instrument, it immediately retunes that sample.
Playback and piano-key preview samplers share the same decoded buffers with
independent voices. Root reassignment reuses that buffer. Restore piano returns
to the bundled instrument. Samples stay in memory for this tab and disappear
on reload. Decode failures retain the active instrument and playback. Successful
MIDI import, instrument replacement, and root reassignment stop playback and invalidate
pending audio-start requests before changing the composition or instrument.

The underlying APIs are [`new Midi(bytes)`, `header.ppq`, and track note ticks](https://github.com/Tonejs/Midi/blob/master/README.md),
[`Tone.getContext().decodeAudioData`](https://tonejs.github.io/docs/15.1.22/classes/Context.html#decodeAudioData),
[`Tone.Sampler` with MIDI root keys and decoded buffers](https://tonejs.github.io/docs/15.1.22/classes/Sampler.html),
and [folder inputs with `webkitdirectory` and `File.webkitRelativePath`](https://wicg.github.io/entries-api/#dom-htmlinputelement-webkitdirectory).
The import hooks own file reads and feedback; pure MIDI conversion, validation,
and reversible command application remain separate from the UI.

Export MIDI downloads `piano-roll.mid` entirely in the browser using `@tonejs/midi`.
It includes all stored notes, even notes outside a shortened timeline, with the
project's 480 PPQ and 4/4 timing and the current playback tempo. MIDI encoding loads
only when Export is pressed and does not change notes, selection, or history.
Conflicting same-pitch notes are separated into piano tracks to preserve each
note's timing and duration. Zero-velocity notes are omitted to preserve silence;
the export toast reports how many were omitted. Empty projects produce valid MIDI.
The keyboard-operable button keeps focus and announces success or failure through
Sonner. Temporary download URLs are revoked after the browser begins the download.

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
Overlapping audible notes of the same pitch release together at their latest endpoint;
silent notes do not add attacks, retrigger, or extend an audible note's release.
Back-to-back notes release before the next attack. Playback finishes at the last
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

- `components/`: grouped into `editor/`, `toolbar/`, `grid/`, `notes/`,
  `playback/`, and `midi/`. `PianoRollEditor` composes the header, main workspace, and footer.
  The header separates tools from playback; the main workspace contains keys,
  ruler, the editing surface, and the reserved sidebar. The surface composes the
  grid and playhead canvases, selected-note overlay, context menu, accessible list,
  instructions, and announcements. `EditorSettingsPanel` groups project file actions.
- `hooks/`: `editor/` owns composition, viewport, grid rendering, and zoom/pan;
  `notes/` owns actions, announcements, gestures, clipboard, and keyboard commands;
  `playback/` owns the sampler, controls, scheduling, completion, and visual loops;
  `midi/` owns import/export orchestration and notifications.
- `midi/`: bounded file/event validation, PPQ conversion, shared note validation,
  pure note grouping and serialization, and browser download handling.
- `audio/`: sample constraints, shared instrument status, playback session cleanup,
  piano sample mapping, playback types, and note-event scheduling; audio files and credits are in
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
