# 2048

A classic [2048](https://en.wikipedia.org/wiki/2048_(video_game)) game built with **Svelte 5**, **TypeScript**, and **Vite**.

Join the tiles to reach **2048**! Slide the tiles with arrow keys (or WASD), and tiles with the same number merge into one. Each move spawns a new tile (2 or 4). The game ends when the board fills with no possible merges.

## Features

- 4×4 board with smooth tile rendering
- Keyboard controls (Arrow keys / WASD) and touch swipe gestures
- Live score and best score (persisted in `localStorage`)
- Win overlay at 2048 with "Keep going" option
- Game-over detection when no moves remain
- **AI auto-play** — an Expectimax solver plays the game for you, running off the main thread in a Web Worker so the UI stays responsive
- Adjustable **search depth** (1–6) and **move speed** (0–500 ms) for the AI
- Pure, framework-agnostic game logic with unit tests

## Getting started

```bash
pnpm install
pnpm dev      # start the dev server
```

Other scripts:

```bash
pnpm build    # production build
pnpm preview  # preview the production build
pnpm check    # type-check with svelte-check + tsc
pnpm test     # run unit tests with vitest
```

## How to play

- **Move**: Arrow keys or `W` `A` `S` `D`. On touch devices, swipe in a direction.
- **Goal**: Combine tiles to reach 2048. Tiles merge when two of the same value collide.
- **New game**: Click the "New Game" button.
- **AI auto-play**: Click "Run AI" to let the solver play. While running, the settings panel is locked; click "Stop AI" to take back control.
  - **Speed**: delay between AI moves (0–500 ms). Lower is faster.
  - **Depth**: Expectimax search depth (1–6). Higher explores further for stronger play at the cost of more compute.

## AI solver

The AI uses **Expectimax search** with a heuristic evaluation (empty-cell count, weighted positional score, smoothness, monotonicity, mergeable pairs, and a corner bonus for the max tile). It runs in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) (`src/lib/ai/ai.worker.ts`) so heavy computation never blocks rendering. The main thread talks to it through `src/lib/ai/aiClient.ts`, which lazily spawns the worker, matches responses by request id, and falls back to a synchronous call when `Worker` is unavailable (e.g. Node/SSR/tests).

Search results are memoized via a transposition cache to avoid recomputing identical board states.

> **Performance tip**: raising `Depth` makes the AI noticeably stronger but slower. Because the solver runs in a Worker, even deep searches keep the board smooth — just increase the `Speed` if you want time to watch each move.

## Project structure

```
src/
  App.svelte          # game UI, input handling, AI controls/state
  app.css             # global styles and tile palette
  lib/
    game.ts           # game logic (board, moves, merges, win/lose)
    game.test.ts      # unit tests for game logic
    ai/
      ai.ts           # Expectimax solver + heuristic evaluation
      ai.worker.ts    # Web Worker wrapper around the solver
      aiClient.ts     # main-thread client (spawns worker, handles messages)
```

## Game logic

The rules engine in `src/lib/game.ts` is independent of the UI:

- `move(board, direction)` — slides and merges a row/column, returns the new board, score gained, and merged positions.
- `spawnTile(board)` — adds a random 2 (90%) or 4 (10%) to an empty cell.
- `hasMoves(board)` / `isWin(board)` — detect game-over and win states.

Run `pnpm test` to see the covered cases.

## License

MIT
