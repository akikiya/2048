# 2048

A classic [2048](https://en.wikipedia.org/wiki/2048_(video_game)) game built with **Svelte 5**, **TypeScript**, and **Vite**.

Join the tiles to reach **2048**! Slide the tiles with arrow keys (or WASD), and tiles with the same number merge into one. Each move spawns a new tile (2 or 4). The game ends when the board fills with no possible merges.

## Features

- 4×4 board with smooth tile rendering
- Keyboard controls (Arrow keys / WASD) and touch swipe gestures
- Live score and best score (persisted in `localStorage`)
- Win overlay at 2048 with "Keep going" option
- Game-over detection when no moves remain
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

## Project structure

```
src/
  App.svelte     # game UI, input handling, score/state
  app.css        # global styles and tile palette
  lib/
    game.ts      # game logic (board, moves, merges, win/lose)
    game.test.ts # unit tests for game logic
```

## How to play

- **Move**: Arrow keys or `W` `A` `S` `D`. On touch devices, swipe in a direction.
- **Goal**: Combine tiles to reach 2048. Tiles merge when two of the same value collide.
- **New game**: Click the "New Game" button.

## Game logic

The rules engine in `src/lib/game.ts` is independent of the UI:

- `move(board, direction)` — slides and merges a row/column, returns the new board, score gained, and merged positions.
- `spawnTile(board)` — adds a random 2 (90%) or 4 (10%) to an empty cell.
- `hasMoves(board)` / `isWin(board)` — detect game-over and win states.

Run `pnpm test` to see the covered cases.

## License

MIT
