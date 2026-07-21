import {
  createInitialBoard,
  move,
  spawnTile,
  hasMoves,
  isWin,
  type Direction,
} from '../game/game';

// Maps board size to the tile value that constitutes a win.
// Targets: 3→512, 4→2048, 5→4096, 6→8129.
export function winTarget(size: number): number {
  switch (size) {
    case 3: return 512;
    case 4: return 2048;
    case 5: return 4096;
    case 6: return 8129;
    default: return 2048;
  }
}

function bestKey(size: number): string {
  return `2048-best-${size}`;
}

// Migrate the old single-best-score key into the new per-size schema on first load.
const LEGACY_BEST_KEY = '2048-best';
const legacyBest = localStorage.getItem(LEGACY_BEST_KEY);
if (legacyBest !== null && localStorage.getItem(bestKey(4)) === null) {
  localStorage.setItem(bestKey(4), legacyBest);
  localStorage.removeItem(LEGACY_BEST_KEY);
}

export function createGame(initialSize = 4) {
  let size = $state(initialSize);
  let board = $state(createInitialBoard(initialSize));
  let score = $state(0);
  let best = $state(Number(localStorage.getItem(bestKey(size))) || 0);
  let won = $state(false);
  let keepPlaying = $state(false);
  let over = $state(false);

  function syncDerived() {
    // Re-evaluate win/over conditions after every board mutation.
    if (isWin(board, winTarget(size))) won = true;
    if (!hasMoves(board)) over = true;
  }

  // Apply a player move; ignored when the game is already decided.
  function moveTile(direction: Direction) {
    if (over || (won && !keepPlaying)) return;
    const result = move(board, direction);
    if (!result.moved) return;
    board = result.board;
    score += result.scoreGained;
    if (score > best) {
      best = score;
      localStorage.setItem(bestKey(size), String(best));
    }
    spawnTile(board);
    syncDerived();
  }

  function reset() {
    board = createInitialBoard(size);
    score = 0;
    won = false;
    keepPlaying = false;
    over = false;
    syncDerived();
  }

  function changeSize(next: number) {
    if (next === size) return;
    size = next;
    best = Number(localStorage.getItem(bestKey(size))) || 0;
    reset();
  }

  function continuePlaying() {
    keepPlaying = true;
  }

  return {
    // Expose read-only state via getters so callers cannot accidentally reassign internals.
    get size() {
      return size;
    },
    get board() {
      return board;
    },
    get score() {
      return score;
    },
    get best() {
      return best;
    },
    get won() {
      return won;
    },
    get keepPlaying() {
      return keepPlaying;
    },
    get over() {
      return over;
    },
    moveTile,
    reset,
    changeSize,
    continuePlaying,
  };
}

export type Game = ReturnType<typeof createGame>;
