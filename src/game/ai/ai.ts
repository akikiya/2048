import { move, getEmptyCells, type Direction, type MoveResult } from '../game';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

/**
 * Builds a weight matrix that rewards tiles placed near the bottom-right corner.
 *
 * This heuristic encourages the AI to keep large values clustered in a corner,
 * which is a well-known strategy for high scores in 2048.
 *
 * @param size - Board dimension.
 * @returns A flat {@link Uint32Array} where values decrease with Manhattan distance from the bottom-right corner.
 */
function buildWeightMatrix(size: number): Uint32Array {
	const matrix = new Uint32Array(size * size);
	for (let row = 0; row < size; row++) {
		for (let col = 0; col < size; col++) {
			const distance = Math.abs(row - (size - 1)) + Math.abs(col - (size - 1));
			matrix[row * size + col] = size * size - 1 - distance;
		}
	}
	return matrix;
}

/**
 * Returns the four corner coordinate pairs for a board of the given size.
 *
 * @param size - Board dimension.
 * @returns Array of `[row, col]` pairs representing the four corners.
 */
function cornersFor(size: number): [number, number][] {
	return [
		[0, 0],
		[0, size - 1],
		[size - 1, 0],
		[size - 1, size - 1],
	];
}

let weightMatrix = buildWeightMatrix(4);
let corners = cornersFor(4);

/**
 * Lazily rebuilds the cached weight matrix and corner list if the board size has changed.
 *
 * This allows the same AI heuristics to work on non-standard board sizes (e.g. 3×3)
 * without re-instantiating the evaluator.
 *
 * @param board - Flat board whose size determines the required matrix dimensions.
 */
function syncSize(board: Uint32Array) {
	const n = Math.sqrt(board.length);
	if (weightMatrix.length !== board.length) {
		weightMatrix = buildWeightMatrix(n);
		corners = cornersFor(n);
	}
}

/**
 * Serializes a flat board into a comma-separated string key.
 *
 * Used as a memoization key for the expectimax cache.
 *
 * @param board - Flat board to serialize.
 * @returns A deterministic string representation of the board state.
 */
function boardKey(board: Uint32Array): string {
	let key = '';
	for (let i = 0; i < board.length; i++) {
		key += board[i] + ',';
	}
	return key;
}

/**
 * Computes the base-2 logarithm of a tile value.
 *
 * @param value - Tile value (must be positive).
 * @returns `log2(value)`.
 */
function log2(value: number): number {
	return Math.log2(value);
}

/**
 * Measures how smoothly tile values transition across adjacent cells.
 *
 * Large differences between neighboring tiles reduce the score, penalizing
 * configurations where high and low values are interleaved.
 *
 * @param board - Flat board to evaluate.
 * @returns A smoothness score (higher is better).
 */
function smoothScore(board: Uint32Array): number {
	const n = Math.sqrt(board.length);
	let score = 0;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row * n + col];
			if (value === 0) continue;
			const log = log2(value);
			if (row > 0 && board[(row - 1) * n + col] !== 0)
				score -= Math.abs(log - log2(board[(row - 1) * n + col]));
			if (col < n - 1 && board[row * n + col + 1] !== 0)
				score -= Math.abs(log - log2(board[row * n + col + 1]));
		}
	}
	return score;
}

/**
 * Measures how monotonically tile values increase or decrease along rows and columns.
 *
 * A monotonic board (values always rise or always fall along a row/column) is
 * easier to merge, so higher scores indicate more manageable layouts.
 *
 * @param board - Flat board to evaluate.
 * @returns A monotonicity score (higher is better).
 */
function monotonicityScore(board: Uint32Array): number {
	const n = Math.sqrt(board.length);
	let totals = [0, 0, 0, 0];

	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n - 1; col++) {
			const current = board[row * n + col] ? log2(board[row * n + col]) : 0;
			const next = board[row * n + col + 1] ? log2(board[row * n + col + 1]) : 0;
			if (current > next) totals[0] += next - current;
			else totals[1] += current - next;
		}
	}

	for (let col = 0; col < n; col++) {
		for (let row = 0; row < n - 1; row++) {
			const current = board[row * n + col] ? log2(board[row * n + col]) : 0;
			const next = board[(row + 1) * n + col] ? log2(board[(row + 1) * n + col]) : 0;
			if (current > next) totals[2] += next - current;
			else totals[3] += current - next;
		}
	}

	return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
}

/**
 * Counts pairs of adjacent equal-value tiles that could be merged in one move.
 *
 * @param board - Flat board to evaluate.
 * @returns The number of horizontally or vertically adjacent matching pairs.
 */
function countMergeable(board: Uint32Array): number {
	const n = Math.sqrt(board.length);
	let count = 0;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row * n + col];
			if (value === 0) continue;
			if (col + 1 < n && board[row * n + col + 1] === value) count++;
			if (row + 1 < n && board[(row + 1) * n + col] === value) count++;
		}
	}
	return count;
}

/**
 * Awards points when tiles follow a "snake" ordering (zig-zag descending).
 *
 * The snake pattern keeps the largest tile in a corner with descending values
 * weaving toward the opposite corner.
 *
 * @param board - Flat board to evaluate.
 * @returns A snake-sequencing score (higher is better).
 */
function snakeScore(board: Uint32Array): number {
	const n = Math.sqrt(board.length);
	let score = 0;
	for (let row = 0; row < n; row++) {
		const evenRow = row % 2 === 0;
		for (let col = 0; col < n - 1; col++) {
			const c1 = evenRow ? col : n - 1 - col;
			const c2 = evenRow ? col + 1 : n - 1 - (col + 1);
			const v1 = board[row * n + c1] ? log2(board[row * n + c1]) : 0;
			const v2 = board[row * n + c2] ? log2(board[row * n + c2]) : 0;
			if (v1 >= v2) score += (v1 - v2) * 0.5;
			else score -= (v2 - v1);
		}
	}
	return score;
}

/**
 * Evaluates whether the largest tiles are anchored in corners and aligned on edges.
 *
 * Rewards configurations where the highest-value tiles occupy corner cells and
 * lie along the same edge or adjacent corners.
 *
 * @param board - Flat board to evaluate.
 * @returns A corner-quality score (higher is better).
 */
function cornerQualityScore(board: Uint32Array): number {
	const n = Math.sqrt(board.length);
	const positions: { r: number; c: number; val: number }[] = corners
		.map(([r, c]) => ({ r, c, val: board[r * n + c] }))
		.filter((p) => p.val > 0)
		.sort((a, b) => b.val - a.val);

	if (positions.length === 0) return 0;

	let score = 0;
	const maxVal = positions[0].val;

	for (const [r, c] of corners) {
		if (board[r * n + c] === maxVal && maxVal !== 0) {
			score += 50;
			break;
		}
	}

	if (positions.length >= 2) {
		const [r1, c1] = [positions[0].r, positions[0].c];
		const [r2, c2] = [positions[1].r, positions[1].c];
		const sameEdge = r1 === r2 || c1 === c2;
		const adjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
		if (sameEdge || adjacent) score += 20;
	}

	const [mr, mc] = [positions[0].r, positions[0].c];
	const onEdge = mr === 0 || mr === n - 1 || mc === 0 || mc === n - 1;
	if (!onEdge && maxVal > 0) score -= 30;

	return score;
}

/**
 * Computes a heuristic evaluation score for the current board state.
 *
 * Combines multiple weighted features:
 * - Corner-weighted tile values
 * - Maximum tile logarithm
 * - Empty cell count
 * - Smoothness
 * - Monotonicity
 * - Mergeable pair count
 * - Snake ordering
 * - Corner quality
 *
 * @param board - Flat board to evaluate.
 * @returns A numeric score where higher values indicate stronger positions.
 */
function evaluate(board: Uint32Array): number {
	syncSize(board);
	const n = Math.sqrt(board.length);
	let empty = 0;
	let weightSum = 0;
	let maxTile = 0;
	let maxAtCorner = false;

	for (let row = 0; row < n; row++) {
		const rowOffset = row * n;
		for (let col = 0; col < n; col++) {
			const value = board[rowOffset + col];
			if (value === 0) {
				empty++;
			} else {
				weightSum += log2(value) * weightMatrix[rowOffset + col];
				if (value > maxTile) maxTile = value;
			}
		}
	}

	for (const [r, c] of corners) {
		if (board[r * n + c] === maxTile && maxTile !== 0) {
			maxAtCorner = true;
			break;
		}
	}

	const mergeable = countMergeable(board);
	const snake = snakeScore(board);
	const cornerQuality = cornerQualityScore(board);

	return (
		weightSum * 1.2 +
		(maxTile > 0 ? Math.log2(maxTile) * 2.7 : 0) +
		empty * 2.7 +
		smoothScore(board) * 0.5 +
		monotonicityScore(board) * 1.5 +
		mergeable * 1.5 +
		snake * 2.0 +
		cornerQuality +
		(maxAtCorner ? 10 : 0)
	);
}

/**
 * Mutable search context shared across expectimax recursions.
 */
interface SearchState {
	/** Cached board-evaluation scores keyed by {@link boardKey} serialization. */
	cache: Map<string, number>;
	/** Penalty applied when no moves remain (game over). */
	gameOverPenalty: number;
}

/**
 * Recursively evaluates board states using the expectimax algorithm.
 *
 * Alternates between the player's turn (maximize over all legal moves) and the
 * chance turn (expected value over random tile spawns: 90% `2`, 10% `4`).
 * Leaf nodes are scored with {@link evaluate}. Results are memoized in `state.cache`.
 *
 * @param state - Shared search context containing the memoization cache.
 * @param board - Flat board to evaluate.
 * @param depth - Remaining search depth before falling back to the heuristic.
 * @param isChance - `true` if the next event is a random tile spawn; `false` for the player's turn.
 * @returns The expected evaluation score from this state.
 */
function expectimax(
	state: SearchState,
	board: Uint32Array,
	depth: number,
	isChance: boolean
): number {
	const key = boardKey(board);
	if (depth === 0) {
		let cached = state.cache.get(key);
		if (cached === undefined) {
			cached = evaluate(board);
			state.cache.set(key, cached);
		}
		return cached;
	}

	const cached = state.cache.get(key);
	if (cached !== undefined) return cached;

	let result: number;

	if (isChance) {
		const empty = getEmptyCells(board);
		if (empty.length === 0) {
			result = evaluate(board);
		} else {
			let total = 0;
			const cellProb = 1 / empty.length;
			const n = Math.sqrt(board.length);
			for (const { row, col } of empty) {
				const next2 = new Uint32Array(board);
				next2[row * n + col] = 2;
				total += 0.9 * cellProb * expectimax(state, next2, depth - 1, false);

				const next4 = new Uint32Array(board);
				next4[row * n + col] = 4;
				total += 0.1 * cellProb * expectimax(state, next4, depth - 1, false);
			}
			result = total;
		}
	} else {
		let best = -Infinity;
		let anyMove = false;
		const n = Math.sqrt(board.length);
		for (const direction of DIRECTIONS) {
			const m: MoveResult = move(board, direction);
			if (!m.moved) continue;
			anyMove = true;
			const value = expectimax(state, m.board, depth - 1, true);
			if (value > best) best = value;
		}
		if (!anyMove) {
			result = -state.gameOverPenalty;
		} else {
			result = best;
		}
	}

	if (result > -state.gameOverPenalty) {
		state.cache.set(key, result);
	}
	return result;
}

/**
 * Selects the best move for the current board using expectimax search.
 *
 * Iterates all four directions, skips no-op moves, and picks the direction
 * yielding the highest expectimax score at the requested search depth.
 *
 * @param board - Flat board representing the current game state.
 * @param depth - Search depth for the expectimax tree (default `3`).
 * @returns The recommended {@link Direction}, or `null` if no moves are possible.
 */
export function chooseBestMove(board: Uint32Array, depth: number = 3): Direction | null {
	const state: SearchState = {
		cache: new Map<string, number>(),
		gameOverPenalty: 1e9,
	};

	let bestDirection: Direction | null = null;
	let bestScore = -Infinity;
	for (const direction of DIRECTIONS) {
		const result = move(board, direction);
		if (!result.moved) continue;
		const score = expectimax(state, result.board, depth - 1, true);
		if (score > bestScore) {
			bestScore = score;
			bestDirection = direction;
		}
	}
	return bestDirection;
}

/**
 * Dynamically selects an expectimax search depth based on board complexity.
 *
 * Shallower searches are used when many empty cells remain (faster, less precise),
 * while deeper searches are used near the end-game for stronger play.
 *
 * @param board - Flat board to analyze.
 * @returns Search depth between `2` and `6` inclusive.
 */
export function computeAutoDepth(board: Uint32Array): number {
	const n = Math.sqrt(board.length);
	const empty = getEmptyCells(board).length;
	const total = n * n;
	const ratio = empty / total;
	if (ratio > 0.7) return 2;
	if (ratio > 0.5) return 3;
	if (ratio > 0.3) return 4;
	if (ratio > 0.1) return 5;
	return 6;
}

export { boardKey, evaluate };
export {
	buildWeightMatrix,
	syncSize,
	log2,
	smoothScore,
	monotonicityScore,
	countMergeable,
	snakeScore,
	cornerQualityScore,
	expectimax,
};
