# Piano Roll

Client-side MIDI note editor, built incrementally with React, TypeScript, Zustand,
Canvas 2D, use-gesture, and Radix UI. Playback, MIDI I/O, and persistence are later milestones.

## Development

```sh
npm ci
npm run dev
```

Keyboard users can create a note with the New note pitch / Start tick form.
Click a note to select it; Ctrl/Cmd-click toggles selection, and Ctrl/Cmd-drag
empty grid replaces selection with overlapping notes. Shift-drag pans;
Ctrl-wheel zooms. Arrow keys move the selection and Delete removes it.
Movement reveals the selection without changing the stored MIDI coordinates.

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
  zoom/pan, and canvas lifecycle/scheduling.
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
