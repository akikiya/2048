/**
 * Allowed move directions for a tile shift in the 2048 grid.
 */
export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Zero-based coordinate within the game board.
 */
export interface Position {
	/** Row index (0-based). */
	row: number;
	/** Column index (0-based). */
	col: number;
}

/**
 * Outcome of evaluating a potential move on the board.
 */
export interface MoveResult {
	/** Board state after applying the move. */
	board: Uint32Array;
	/** Whether the board actually changed after the move. */
	moved: boolean;
	/** Score gained from merged tiles during this move. */
	scoreGained: number;
	/** Positions of tiles that were created by a merge in this move. */
	merged: Position[];
}

const EMPTY = 0;

/**
 * Creates a flat {@link Uint32Array} representing an empty square board.
 *
 * Uses a row-major layout: the element at index `row * size + col` holds the
 * value of that cell. A value of `0` represents an empty cell.
 *
 * @param size - Width and height of the board (default `4`).
 * @returns A new zero-filled board of length `size * size`.
 *
 * @example
 * ```ts
 * const board = createEmptyBoard(4); // Uint32Array(16) filled with 0
 * ```
 */
export function createEmptyBoard(size: number = 4): Uint32Array {
	return new Uint32Array(size * size);
}

/**
 * Returns a shallow copy of the given flat board.
 *
 * @param board - Source board to duplicate.
 * @returns A new {@link Uint32Array} with identical values.
 */
function cloneBoard(board: Uint32Array): Uint32Array {
	return new Uint32Array(board);
}

/**
 * Derives the board dimension from a flat array length.
 *
 * @param board - A flat board whose length is a perfect square.
 * @returns The width (and height) of the board.
 */
export function boardSize(board: Uint32Array): number {
	return Math.sqrt(board.length);
}

/**
 * Collects all empty cell positions on the board.
 *
 * @param board - Flat board to scan.
 * @returns An array of {@link Position} objects for every cell whose value is `0`.
 */
export function getEmptyCells(board: Uint32Array): Position[] {
	const n = boardSize(board);
	const cells: Position[] = [];
	for (let i = 0; i < board.length; i++) {
		if (board[i] === EMPTY) {
			cells.push({ row: (i / n) | 0, col: i % n });
		}
	}
	return cells;
}

/**
 * Spawns a new tile (90% chance of `2`, 10% chance of `4`) in a random empty cell.
 *
 * Mutates the board in place.
 *
 * @param board - Flat board to modify. Must have at least one empty cell.
 * @returns The {@link Position} of the newly spawned tile, or `null` if the board is full.
 */
export function spawnTile(board: Uint32Array): Position | null {
	const n = boardSize(board);
	const empty = getEmptyCells(board);
	if (empty.length === 0) return null;
	const { row, col } = empty[Math.floor(Math.random() * empty.length)];
	board[row * n + col] = Math.random() < 0.9 ? 2 : 4;
	return { row, col };
}

/**
 * Creates a fresh board with two randomly spawned tiles, matching the standard game start.
 *
 * @param size - Width and height of the board (default `4`).
 * @returns A flat {@link Uint32Array} with two tiles already placed.
 */
export function createInitialBoard(size: number = 4): Uint32Array {
	const board = createEmptyBoard(size);
	spawnTile(board);
	spawnTile(board);
	return board;
}

/**
 * Rotates a flat board 90 degrees counter-clockwise.
 *
 * Used internally to unify all four move directions into a single left-slide
 * implementation.
 *
 * @param board - Flat board to rotate.
 * @returns A new flat board rotated 90° CCW.
 */
function rotateLeft(board: Uint32Array): Uint32Array {
	const n = boardSize(board);
	const rotated = new Uint32Array(n * n);
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			rotated[(n - 1 - col) * n + row] = board[row * n + col];
		}
	}
	return rotated;
}

/**
 * Extracts a single row from a flat board as a numeric array.
 *
 * @param board - Source flat board.
 * @param row - Zero-based row index to extract.
 * @param n - Board dimension (width / height).
 * @returns An array of length `n` containing the row's values.
 */
function rowValues(board: Uint32Array, row: number, n: number): number[] {
	const start = row * n;
	const vals: number[] = [];
	for (let i = 0; i < n; i++) vals.push(board[start + i]);
	return vals;
}

/**
 * Slides non-empty tiles in a row toward the start, merging matching adjacent values.
 *
 * Implements the classic 2048 merge rule: two equal tiles merge into their sum,
 * and a tile can only merge once per move.
 *
 * @param row - Row values (length determines the board size).
 * @returns The slid row, the score gained from merges, and the output column indices where merges occurred.
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
 * Maps a {@link Direction} to the number of 90° CCW rotations needed to align it with a left slide.
 *
 * @param direction - Move direction.
 * @returns Number of times {@link rotateLeft} must be applied (0–3).
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
 * Computes the new position after a single 90° CCW rotation.
 *
 * @param row - Original row index.
 * @param col - Original column index.
 * @param n - Board dimension.
 * @returns Rotated {@link Position}.
 */
function rotateLeftPosition(row: number, col: number, n: number): Position {
	return { row: n - 1 - col, col: row };
}

/**
 * Applies a single move to the board in the given direction.
 *
 * Internally rotates the board so the move becomes a left-slide, runs the slide
 * logic, then rotates the result back. Merge positions are tracked and rotated
 * accordingly.
 *
 * @param board - Flat board to mutate (treated as read-only; a new board is returned).
 * @param direction - Direction to shift tiles.
 * @returns A {@link MoveResult} describing the outcome.
 */
export function move(board: Uint32Array, direction: Direction): MoveResult {
	const n = boardSize(board);
	const rotations = rotateCount(direction);

	let working = cloneBoard(board);
	for (let r = 0; r < rotations; r++) {
		working = rotateLeft(working);
	}

	let scoreGained = 0;
	const mergedWorking: Position[] = [];
	const newWorking = createEmptyBoard(n);
	for (let row = 0; row < n; row++) {
		const rowData = rowValues(working, row, n);
		const { row: slid, scoreGained: gained, mergedCols } = slideAndMergeRow(rowData);
		const offset = row * n;
		for (let c = 0; c < n; c++) {
			newWorking[offset + c] = slid[c];
		}
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
 * Compares two flat boards element-by-element.
 *
 * @param a - First board.
 * @param b - Second board.
 * @returns `true` if both boards have identical values at every index.
 */
function boardsEqual(a: Uint32Array, b: Uint32Array): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

/**
 * Checks whether any legal moves remain on the board.
 *
 * A move exists if there is at least one empty cell, or if any two adjacent
 * cells (horizontally or vertically) share the same value.
 *
 * @param board - Flat board to evaluate.
 * @returns `true` if the game is not yet over.
 */
export function hasMoves(board: Uint32Array): boolean {
	if (getEmptyCells(board).length > 0) return true;
	const n = boardSize(board);
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row * n + col];
			if (col + 1 < n && board[row * n + col + 1] === value) return true;
			if (row + 1 < n && board[(row + 1) * n + col] === value) return true;
		}
	}
	return false;
}

/**
 * Finds the highest tile value currently on the board.
 *
 * @param board - Flat board to scan.
 * @returns The maximum tile value, or `0` if the board is empty.
 */
export function getHighestTile(board: Uint32Array): number {
	let max = 0;
	for (let i = 0; i < board.length; i++) {
		if (board[i] > max) max = board[i];
	}
	return max;
}

/**
 * Determines whether the player has reached (or surpassed) the target tile.
 *
 * @param board - Flat board to evaluate.
 * @param target - Winning tile value (default `2048`).
 * @returns `true` if the board contains a tile value greater than or equal to `target`.
 */
export function isWin(board: Uint32Array, target: number = 2048): boolean {
	return getHighestTile(board) >= target;
}
