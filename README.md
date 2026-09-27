# Piano Roll

An empty React + TypeScript + Vite starter for a client-side MIDI composer.
Read `AGENTS.md` for the architecture and learning constraints.

## Development

```sh
npm install
npm run dev
```

The page is intentionally blank. Start in `src/app/App.tsx`.
Tailwind is connected through its Vite plugin and `src/styles/index.css`.

## Checks

```sh
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Vitest is installed for coordinate-math tests. Add your first test under
`tests/unit/`, then run `npm run test:run` (or `npm test` for watch mode).
There are no tests yet; Vitest reports an error until you add one.

## First milestone

Start with the coordinate system: ticks represent musical time; pixels represent
the current view. Write `tickToPixel` under `src/features/piano-roll/utils/` and
test the origin, scale, and horizontal scroll offset. Keep units explicit.

Then create a canvas component under `src/features/piano-roll/components/`.
Keep drawing functions separate from React lifecycle code. Draw a small static
grid before adding zoom and pan. Account for `devicePixelRatio` so the canvas
stays sharp on high-density screens.

Canvas pixels have no built-in accessibility. Retain the planned DOM controls,
focusable note overlay, and accessible note list as interaction is introduced.
Keep high-frequency drawing out of React state and draw only the visible range.

Add `@use-gesture/react` when starting zoom/pan. Add Zustand for note state,
Tone.js for playback, `@tonejs/midi` for import/export, and Dexie for persistence
when you reach those milestones. UI and browser-testing libraries can follow
when there is UI to exercise.

Git hooks and CI are not configured in this starter. Once a writable Git
repository is available, wire the required lint-staged pre-commit checks and CI
type check from `AGENTS.md`.
