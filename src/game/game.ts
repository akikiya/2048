export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
	row: number;
	col: number;
}

export interface MoveResult {
	board: number[][];
	moved: boolean;
	scoreGained: number;
	merged: Position[];
}

const SIZE = 4;
const EMPTY = 0;

/**
 * Produce a fresh `size × size` grid filled with empty values.
 *
 * This is a pure utility; all callers are responsible for deep-copying if they intend to
 * mutate in place.
 *
 * @param size - Side length of the board (default 4).
 * @returns A 2-D array of zeros.
 */
export function createEmptyBoard(size: number = SIZE): number[][] {
	return Array.from({ length: size }, () => Array<number>(size).fill(EMPTY));
}

/**
 * Return a structurally new board by shallow-copying every row array.
 *
 * We avoid `structuredClone` here because it is slower for small 2-D arrays and does not
 * buy us any extra safety inside this module.
 *
 * @param board - The board to clone.
 * @returns A deep copy of the board.
 */
function cloneBoard(board: number[][]): number[][] {
	return board.map((row) => [...row]);
}

/**
 * Collect the positions of all empty cells on the board.
 *
 * Used by the AI to enumerate spawn options and by `spawnTile` to choose uniformly
 * at random among available squares.
 *
 * @param board - The board to scan.
 * @returns An array of `{ row, col }` positions where the cell value is `0`.
 */
export function getEmptyCells(board: number[][]): Position[] {
	const cells: Position[] = [];
	for (let row = 0; row < board.length; row++) {
		for (let col = 0; col < board[row].length; col++) {
			if (board[row][col] === EMPTY) {
				cells.push({ row, col });
			}
		}
	}
	return cells;
}

/**
 * Spawn a new tile in a random empty cell.
 *
 * 90% chance of spawning a `2`, 10% chance of a `4` — matches original 2048 odds.
 * Random uniform selection over the empty list means the low-tile bias applies to
 * position rather than value, preserving fair spawn distribution on asymmetric boards.
 *
 * @param board - The board to mutate in place.
 * @returns The spawn position, or `null` if the board is full.
 */
export function spawnTile(board: number[][]): Position | null {
	const empty = getEmptyCells(board);
	if (empty.length === 0) return null;
	const { row, col } = empty[Math.floor(Math.random() * empty.length)];
	board[row][col] = Math.random() < 0.9 ? 2 : 4;
	return { row, col };
}

/**
 * Create a new board with two randomly spawned tiles.
 *
 * @param size - Side length of the board (default 4).
 * @returns A 2-D board array with exactly two non-empty tiles.
 */
export function createInitialBoard(size: number = SIZE): number[][] {
	const board = createEmptyBoard(size);
	spawnTile(board);
	spawnTile(board);
	return board;
}

/**
 * Rotate the board 90° counter-clockwise.
 *
 * This normalization lets a single left-slide implementation be reused for all four input
 * directions, avoiding branching logic in `slideAndMergeRow`.
 *
 * @param board - The board to rotate.
 * @returns A new board rotated counter-clockwise.
 */
function rotateLeft(board: number[][]): number[][] {
	const n = board.length;
	const rotated: number[][] = createEmptyBoard(n);
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			rotated[n - 1 - col][row] = board[row][col];
		}
	}
	return rotated;
}

/**
 * Slide and merge a single row toward index 0 (left).
 *
 * Equal adjacent tiles merge once per move: `[2, 2, 2, 2]` → `[4, 4, 0, 0]`.
 * Tiles never skip over empty space after a merge; they stop at the first non-equal
 * neighbor or board edge.
 *
 * @param row - A single row of tile values.
 * @returns The slid row, the score gained from merges, and the output columns where merges occurred.
 */
function slideAndMergeRow(row: number[]): {
	row: number[];
	scoreGained: number;
	mergedCols: number[];
} {
	const size = row.length;
	const filtered = row.filter((v) => v !== EMPTY);
	const result: number[] = [];
	let scoreGained = 0;
	const mergedCols: number[] = [];
	let i = 0;
	let outCol = 0;
	while (i < filtered.length) {
		if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
			const merged = filtered[i] * 2;
			result.push(merged);
			scoreGained += merged;
			mergedCols.push(outCol);
			i += 2;
		} else {
			result.push(filtered[i]);
			i += 1;
		}
		outCol++;
	}
	while (result.length < size) result.push(EMPTY);
	return { row: result, scoreGained, mergedCols };
}

/**
 * Map a direction to the number of left rotations needed to normalize it.
 *
 * Left needs 0, up needs 1, right needs 2, down needs 3.
 *
 * @param direction - The input direction.
 * @returns The number of counter-clockwise 90° rotations to apply.
 */
function rotateCount(direction: Direction): number {
	switch (direction) {
		case 'left':
			return 0;
		case 'up':
			return 1;
		case 'right':
			return 2;
		case 'down':
			return 3;
	}
}

/**
 * Execute a move in the given direction and return the resulting board state.
 *
 * Any direction is translated into a left-slide by rotating the board, applying the slide,
 * then rotating back. This consolidates merge and slide logic into a single codepath and
 * guarantees identical scoring regardless of input orientation.
 *
 * @param board - The current board state.
 * @param direction - The direction to slide.
 * @returns The new board, whether it changed, the score gained, and merge positions for animation.
 */
export function move(board: number[][], direction: Direction): MoveResult {
	const n = board.length;
	const rotations = rotateCount(direction);

	let working = cloneBoard(board);
	for (let r = 0; r < rotations; r++) {
		working = rotateLeft(working);
	}

	let scoreGained = 0;
	const mergedWorking: Position[] = [];
	const newWorking: number[][] = createEmptyBoard(n);
	for (let row = 0; row < n; row++) {
		const { row: slid, scoreGained: gained, mergedCols } = slideAndMergeRow(
			working[row]
		);
		newWorking[row] = slid;
		scoreGained += gained;
		for (const col of mergedCols) {
			mergedWorking.push({ row, col });
		}
	}

	let newBoard = newWorking;
	for (let r = 0; r < (4 - rotations) % 4; r++) {
		newBoard = rotateLeft(newBoard);
	}

	const moved = !boardsEqual(board, newBoard);

	const totalRotations = (4 - rotations) % 4;
	const merged = mergedWorking.map((p) => {
		let { row, col } = p;
		for (let r = 0; r < totalRotations; r++) {
			const next = rotateLeftPosition(row, col, n);
			row = next.row;
			col = next.col;
		}
		return { row, col };
	});

	return { board: newBoard, moved, scoreGained, merged };
}

/**
 * Apply a left-rotation transformation to a single cell coordinate.
 *
 * Used to map merge positions back to the board's original orientation after computing
 * a slide in the rotated frame.
 *
 * @param row - Original row index.
 * @param col - Original column index.
 * @param n - Board side length.
 * @returns The rotated `{ row, col }` position.
 */
function rotateLeftPosition(row: number, col: number, n: number): Position {
	return { row: n - 1 - col, col: row };
}

/**
 * Compare two boards cell-by-cell for equality.
 *
 * Used to determine whether a direction is a no-op move. This is cheaper than generating
 * a `boardKey` and comparing strings for small boards.
 *
 * @param a - First board.
 * @param b - Second board.
 * @returns `true` if every cell matches.
 */
function boardsEqual(a: number[][], b: number[][]): boolean {
	for (let row = 0; row < a.length; row++) {
		for (let col = 0; col < a[row].length; col++) {
			if (a[row][col] !== b[row][col]) return false;
		}
	}
	return true;
}

/**
 * Determine whether any legal move exists on the board.
 *
 * A move exists if any cell is empty OR if any horizontal/vertical neighbors share a
 * value (so a slide would create a merge). The early return on empty cells avoids an
 * O(n²) scan of adjacent pairs when the board is clearly playable.
 *
 * @param board - The board to evaluate.
 * @returns `true` if at least one move is available.
 */
export function hasMoves(board: number[][]): boolean {
	if (getEmptyCells(board).length > 0) return true;
	const n = board.length;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (col + 1 < n && board[row][col + 1] === value) return true;
			if (row + 1 < n && board[row + 1][col] === value) return true;
		}
	}
	return false;
}

/**
 * Find the maximum tile value on the board.
 *
 * Used by `isWin` and by the UI to highlight special large tiles. Board values carry no
 * negative state, so initializing to `0` is safe for all starting configurations.
 *
 * @param board - The board to scan.
 * @returns The highest tile value, or `0` if the board is empty.
 */
export function getHighestTile(board: number[][]): number {
	let max = 0;
	for (const row of board) {
		for (const value of row) {
			if (value > max) max = value;
		}
	}
	return max;
}

/**
 * Check whether the player has reached the win condition.
 *
 * The default target is `2048` because tile values double on each merge and the original
 * game defines 2048 as the victory condition. The parameter override lets smaller boards
 * use a proportionally scaled target (see `winTarget` in composables).
 *
 * @param board - The board to evaluate.
 * @param target - The tile value required to win (default 2048).
 * @returns `true` if the highest tile meets or exceeds the target.
 */
export function isWin(board: number[][], target: number = 2048): boolean {
	return getHighestTile(board) >= target;
}
