import {
  createInitialBoard,
  move,
  spawnTile,
  hasMoves,
  isWin,
  type Direction,
} from '../game/game';

const WIN_TARGET = 2048;

function bestKey(size: number): string {
  return `2048-best-${size}`;
}

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
    if (isWin(board, WIN_TARGET)) won = true;
    if (!hasMoves(board)) over = true;
  }

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
