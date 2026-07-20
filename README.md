# 2048

A classic [2048](https://en.wikipedia.org/wiki/2048_(video_game)) game built with **Svelte 5**, **TypeScript**, and **Vite**.

Join the tiles to reach **2048**! Slide the tiles with arrow keys (or WASD), and tiles with the same number merge into one. Each move spawns a new tile (2 or 4). The game ends when the board fills with no possible merges.

## Features

- Boards from 3×3 to 6×6 — pick a size and the board, scoring, and AI solver all adapt
- Keyboard controls (Arrow keys / WASD) and touch swipe gestures
- Live score and best score (persisted per board size in `localStorage`)
- Win overlay at 2048 with a "Keep going" option
- Game-over detection when no moves remain
- **AI auto-play** — an Expectimax solver plays the game for you, running off the main thread in a Web Worker so the UI stays responsive
- Adjustable **search depth** (1–6) and **move speed** (0–500 ms) for the AI
- Pure, framework-agnostic game logic with unit tests

## Getting started

This project uses [pnpm](https://pnpm.io/).

```bash
pnpm install
pnpm dev      # start the dev server (Vite)
```

Other scripts:

```bash
pnpm build    # production build
pnpm preview  # preview the production build
pnpm check    # type-check with svelte-check + tsc
pnpm test     # run unit tests with vitest
```

> Requires Node.js (the toolchain targets modern ES2023 modules). If you prefer npm, swap `pnpm` for `npm run` / `npx`.

## How to play

- **Move**: Arrow keys or `W` `A` `S` `D`. On touch devices, swipe in a direction.
- **Goal**: Combine tiles to reach 2048. Tiles merge when two of the same value collide.
- **New game**: Click the "New Game" button.
- **Board size**: Use the size picker (3×3 to 6×6). Changing size starts a fresh game and rescales the AI heuristic automatically.
- **AI auto-play**: Click "Run AI" to let the solver play. While it runs, the settings panel is locked; click "Stop AI" to take back control.
  - **Speed**: delay between AI moves (0–500 ms). Lower is faster.
  - **Depth**: Expectimax search depth (1–6). Higher explores further for stronger play at the cost of more compute.

## AI solver

The AI uses **Expectimax search** with a heuristic evaluation (empty-cell count, weighted positional score, smoothness, monotonicity, mergeable pairs, and a corner bonus for the max tile). It runs in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) (`src/game/ai/ai.worker.ts`) so heavy computation never blocks rendering. The main thread talks to it through `src/game/ai/aiClient.ts`, which lazily spawns the worker, matches responses by request id, and falls back to a synchronous call when `Worker` is unavailable (e.g. Node/SSR/tests).

Search results are memoized via a transposition cache to avoid recomputing identical board states.

> **Performance tip**: raising `Depth` makes the AI noticeably stronger but slower. Because the solver runs in a Worker, even deep searches keep the board smooth — just increase the `Speed` if you want time to watch each move.

## Project structure

The codebase is split into three concerns: **UI components**, **reactive state/composables**, and **pure game logic**.

```
src/
  App.svelte              # thin composition root: wires state + input to components
  main.ts                 # Svelte mount entry
  app.css                 # global tokens (colors), body/layout, shared control styles

  components/             # presentational Svelte components (each owns its scoped styles)
    GithubCorner.svelte   # fixed GitHub link ribbon
    Scores.svelte         # Score / Best score boxes
    SizePicker.svelte     # board-size selector
    Controls (inline)     # New Game / Run AI buttons
    AISettings.svelte     # speed & depth sliders
    Board.svelte          # grid background, tiles, win/lose overlay, touch gestures
    Tile.svelte           # a single tile (value, position, palette class)

  composables/            # Svelte 5 rune-based state & logic (no UI)
    game.svelte.ts        # createGame(): board/score/best/won/over state + moveTile/reset/...
    useAI.svelte.ts       # useAI(game): AI run loop, timer, seq cancellation
    useKeyboard.svelte.ts # useKeyboard(onMove): key map + keydown handler

  game/                   # framework-agnostic game logic
    game.ts               # board, moves, merges, win/lose detection
    game.test.ts          # unit tests for game logic
    ai/
      ai.ts               # Expectimax solver + heuristic evaluation
      ai.worker.ts        # Web Worker wrapper around the solver
      aiClient.ts         # main-thread client (spawns worker, handles messages)
```

## Game logic

The rules engine in `src/game/game.ts` is independent of the UI:

- `move(board, direction)` — slides and merges a row/column, returns the new board, score gained, and merged positions.
- `spawnTile(board)` — adds a random 2 (90%) or 4 (10%) to an empty cell.
- `hasMoves(board)` / `isWin(board)` — detect game-over and win states.

Run `pnpm test` to see the covered cases.

## Architecture notes

- **State lives in composables, not the view.** `App.svelte` is a composition root: it creates `createGame(4)`, `useAI(game)`, and `useKeyboard(...)` and passes state/callbacks down to components. Components stay presentational and never own game state.
- **Svelte 5 runes.** Components use `$props()` and callbacks; the game store uses `$state` inside a `.svelte.ts` module so reactivity flows across files.
- **Scoped styles.** Each component ships its own `<style>` block; `app.css` only holds design tokens (CSS variables) and a few truly global rules.

## License

MIT
