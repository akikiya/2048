import {
	createInitialBoard,
	move,
	spawnTile,
	hasMoves,
	isWin,
	type Direction,
} from '../game/game';

/**
 * Maps board size to the tile value that constitutes a win.
 *
 * Targets: 3→512, 4→2048, 5→4096, 6→8129.
 * We store the literal highest reachable tile for each N×N grid so that the win trigger
 * scales with board complexity — a 3×3 game should not require the same target as 6×6.
 *
 * @param size - Board side length.
 * @returns The tile value that triggers a win for this size.
 */
export function winTarget(size: number): number {
	switch (size) {
		case 3:
			return 512;
		case 4:
			return 2048;
		case 5:
			return 4096;
		case 6:
			return 8129;
		default:
			return 2048;
	}
}

/**
 * Build a per-size localStorage key for the best score.
 *
 * Per-size localStorage namespace prevents the 6×6 best score from overwriting the
 * 4×4 best when the user switches between board configurations mid-session.
 *
 * @param size - Board side length.
 * @returns A namespaced localStorage key string.
 */
function bestKey(size: number): string {
	return `2048-best-${size}`;
}

// Migrate the old single-best-score key into the new per-size schema on first load.
// This handles legacy data from before per-size storage was introduced.
const LEGACY_BEST_KEY = '2048-best';
const legacyBest = localStorage.getItem(LEGACY_BEST_KEY);
if (legacyBest !== null && localStorage.getItem(bestKey(4)) === null) {
	localStorage.setItem(bestKey(4), legacyBest);
	localStorage.removeItem(LEGACY_BEST_KEY);
}

/**
 * Create a fully encapsulated game session factory.
 *
 * State is bracketed inside a factory so each game session is fully encapsulated.
 * The returned object exposes read-only accessors so components cannot clobber internal
 * reactive values outside the allowed mutation paths (`moveTile` / `reset`).
 *
 * @param initialSize - Starting board side length (default 4).
 * @returns A `Game` object exposing reactive state and mutation methods.
 */
export function createGame(initialSize = 4) {
	let size = $state(initialSize);
	let board = $state(createInitialBoard(initialSize));
	let score = $state(0);
	let best = $state(Number(localStorage.getItem(bestKey(size))) || 0);
	let won = $state(false);
	let keepPlaying = $state(false);
	let over = $state(false);

	/**
	 * Re-evaluate win/over conditions after every board mutation.
	 */
	function syncDerived() {
		if (isWin(board, winTarget(size))) won = true;
		if (!hasMoves(board)) over = true;
	}

	/**
	 * Apply a player move; ignored when the game is already decided.
	 *
	 * @param direction - The direction to slide the tiles.
	 */
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

	/**
	 * Reset every mutable state slice to a fresh initial board.
	 *
	 * Keep the current size so that the user's board preference persists across
	 * "New Game" clicks.
	 */
	function reset() {
		board = createInitialBoard(size);
		score = 0;
		won = false;
		keepPlaying = false;
		over = false;
		syncDerived();
	}

	/**
	 * Switch to a different board size.
	 *
	 * Switching size forces a reset because the current board cannot be reshaped safely
	 * in-place. The best score per size is loaded from localStorage so the user's high
	 * score is always available for their active grid.
	 *
	 * @param next - The new board side length.
	 */
	function changeSize(next: number) {
		if (next === size) return;
		size = next;
		best = Number(localStorage.getItem(bestKey(size))) || 0;
		reset();
	}

	/**
	 * Unlock post-win movement so the AI or player can chase higher tiles without
	 * losing their 2048 achievement state.
	 */
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
