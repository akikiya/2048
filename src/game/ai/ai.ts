import { move, getEmptyCells, type Direction, type MoveResult } from '../game';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

/**
 * Assign exponentially decaying weights radiating from the bottom-right corner.
 *
 * This heuristic encourages the AI to preserve large-value tiles in the preferred corner
 * rather than scattering them randomly. The gradient is intentionally steep so that
 * corner-adjacent high tiles receive a dominant positional bonus during evaluation.
 *
 * @param size - Side length of the square board.
 * @returns A `size × size` matrix where each cell contains its positional weight.
 */
function buildWeightMatrix(size: number): number[][] {
	const matrix: number[][] = [];
	for (let row = 0; row < size; row++) {
		const matrixRow: number[] = [];
		for (let col = 0; col < size; col++) {
			const distance = Math.abs(row - (size - 1)) + Math.abs(col - (size - 1));
			matrixRow.push(size * size - 1 - distance);
		}
		matrix.push(matrixRow);
	}
	return matrix;
}

/**
 * Return the four corner coordinates for a given board size.
 *
 * Caching these avoids recomputing them during every board evaluation.
 *
 * @param size - Side length of the square board.
 * @returns An array of `[row, col]` tuples representing the four corners.
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
 * Lazily rebuild `weightMatrix` and `corners` when the board dimension changes.
 *
 * The weight matrix and corner cache are lazily rebuilt only when the board dimension
 * changes from the previous evaluation. This avoids needless allocation for every move
 * since most games stay at the same size after the initial configuration.
 *
 * @param board - The current game board.
 */
function syncSize(board: number[][]) {
	const n = board.length;
	if (weightMatrix.length !== n) {
		weightMatrix = buildWeightMatrix(n);
		corners = cornersFor(n);
	}
}

/**
 * Serialize a 2-D board into a deterministic string key for memoization.
 *
 * We explicitly serialize every cell to avoid edge cases where `toString()` on nested
 * arrays might be ambiguous (e.g., zero vs. empty elements).
 *
 * @param board - The board state to serialize.
 * @returns A flat, comma-delimited string uniquely identifying the board configuration.
 */
function boardKey(board: number[][]): string {
	let key = '';
	for (let r = 0; r < board.length; r++) {
		for (let c = 0; c < board.length; c++) {
			key += board[r][c] + ',';
		}
	}
	return key;
}

/**
 * Extract the base-2 logarithm of a tile value.
 *
 * Using log2 instead of the raw value keeps the heuristic scale-independent — adding one
 * more 2→4 merge has the same informational weight regardless of how large the existing
 * tiles are.
 *
 * @param value - A positive tile value (power of two).
 * @returns The base-2 logarithm of the value.
 */
function log2(value: number): number {
	return Math.log2(value);
}

/**
 * Penalize boards with rough surfaces — adjacent tiles whose log-values differ sharply.
 *
 * Smoother boards are preferred because they indicate the player is maintaining monotonic
 * stacks, which reduces the risk of getting stuck with isolated high tiles.
 *
 * @param board - The current board state.
 * @returns A score where lower values indicate more surface roughness.
 */
function smoothScore(board: number[][]): number {
	const n = board.length;
	let score = 0;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (value === 0) continue;
			const log = log2(value);
			if (row > 0 && board[row - 1][col] !== 0)
				score -= Math.abs(log - log2(board[row - 1][col]));
			if (col < n - 1 && board[row][col + 1] !== 0)
				score -= Math.abs(log - log2(board[row][col + 1]));
		}
	}
	return score;
}

/**
 * Measure how monotonically tile values change in all four directions.
 *
 * Monotonic boards (values consistently increasing or decreasing along rows/columns)
 * are easier to navigate and merge. We sum the best horizontal and best vertical
 * monotonicity, so lower penalties mean more ordered boards.
 *
 * @param board - The current board state.
 * @returns A non-negative penalty; 0 means perfectly monotonic in both axes.
 */
function monotonicityScore(board: number[][]): number {
	const n = board.length;
	let totals = [0, 0, 0, 0];

	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n - 1; col++) {
			const current = board[row][col] ? log2(board[row][col]) : 0;
			const next = board[row][col + 1] ? log2(board[row][col + 1]) : 0;
			if (current > next) totals[0] += next - current;
			else totals[1] += current - next;
		}
	}

	for (let col = 0; col < n; col++) {
		for (let row = 0; row < n - 1; row++) {
			const current = board[row][col] ? log2(board[row][col]) : 0;
			const next = board[row + 1][col] ? log2(board[row + 1][col]) : 0;
			if (current > next) totals[2] += next - current;
			else totals[3] += current - next;
		}
	}

	return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
}

/**
 * Count adjacent pairs of equal tiles as potential future merges.
 *
 * This rewards boards where the current state already has fertile ground for the next
 * slide, because even immobile equal neighbors indicate the player is close to freeing
 * space or scoring.
 *
 * @param board - The current board state.
 * @returns The number of horizontally or vertically adjacent equal pairs.
 */
function countMergeable(board: number[][]): number {
	const n = board.length;
	let count = 0;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (value === 0) continue;
			if (col + 1 < n && board[row][col + 1] === value) count++;
			if (row + 1 < n && board[row + 1][col] === value) count++;
		}
	}
	return count;
}

/**
 * Reward the classic snake/winding stacking pattern.
 *
 * Tiles should generally decrease along a serpentine path from the anchor corner. This
 * encourages the structured stacking that human players use to reach high tiles.
 *
 * @param board - The current board state.
 * @returns A score; higher values indicate a stronger snake pattern.
 */
function snakeScore(board: number[][]): number {
	const n = board.length;
	let score = 0;
	for (let row = 0; row < n; row++) {
		const evenRow = row % 2 === 0;
		for (let col = 0; col < n - 1; col++) {
			const c1 = evenRow ? col : n - 1 - col;
			const c2 = evenRow ? col + 1 : n - 1 - (col + 1);
			const v1 = board[row][c1] ? log2(board[row][c1]) : 0;
			const v2 = board[row][c2] ? log2(board[row][c2]) : 0;
			if (v1 >= v2) score += (v1 - v2) * 0.5;
			else score -= (v2 - v1);
		}
	}
	return score;
}

/**
 * Quantify how well the largest tiles are anchored in corners or edges.
 *
 * Strongly prefers corners, moderately prefers same-edge adjacency, and penalizes the
 * center. This heuristic directly counters the AI's tendency to scatter high tiles.
 *
 * @param board - The current board state.
 * @returns A score; higher values indicate better corner anchoring.
 */
function cornerQualityScore(board: number[][]): number {
	const n = board.length;
	const positions: { r: number; c: number; val: number }[] = corners
		.map(([r, c]) => ({ r, c, val: board[r][c] }))
		.filter(p => p.val > 0)
		.sort((a, b) => b.val - a.val);

	if (positions.length === 0) return 0;

	let score = 0;
	const maxVal = positions[0].val;

	for (const [r, c] of corners) {
		if (board[r][c] === maxVal) {
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
 * Aggregate every positional heuristic into a single scalar evaluation.
 *
 * The weights were chosen empirically to balance long-term corner discipline (weight sum,
 * snake, corner quality) against short-term mobility (empty cells, mergeable pairs,
 * smoothness). Adjusting these coefficients changes the AI's risk preference: higher
 * empty/monotonicity weight makes it more defensive, while higher max-tile weight makes
 * it more aggressive.
 *
 * @param board - The current board state.
 * @returns A scalar score representing the board's strategic quality.
 */
function evaluate(board: number[][]): number {
	syncSize(board);
	const n = board.length;
	let empty = 0;
	let weightSum = 0;
	let maxTile = 0;
	let maxAtCorner = false;

	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (value === 0) {
				empty++;
			} else {
				weightSum += log2(value) * weightMatrix[row][col];
				if (value > maxTile) maxTile = value;
			}
		}
	}

	for (const [r, c] of corners) {
		if (board[r][c] === maxTile && maxTile !== 0) {
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

interface SearchState {
	cache: Map<string, number>;
	gameOverPenalty: number;
}

/**
 * Recursive expectimax search over the game tree.
 *
 * At max (player-turn) nodes we choose the direction with the highest expected score; at
 * chance (spawn) nodes we average over all legal random spawns using the original 2048
 * odds (90% for 2, 10% for 4). A shared `state.cache` memoizes already-seen board
 * configurations to prune duplicate subtrees.
 *
 * @param state - Shared search state carrying the memoization cache and terminal penalty.
 * @param board - The current board state to evaluate.
 * @param depth - Remaining search depth.
 * @param isChance - `true` if this node represents a random spawn event.
 * @returns The expected board evaluation from this state.
 */
function expectimax(
	state: SearchState,
	board: number[][],
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
			for (const { row, col } of empty) {
				const next2 = board.map((rowArr) => [...rowArr]);
				next2[row][col] = 2;
				total += 0.9 * cellProb * expectimax(state, next2, depth - 1, false);

				const next4 = board.map((rowArr) => [...rowArr]);
				next4[row][col] = 4;
				total += 0.1 * cellProb * expectimax(state, next4, depth - 1, false);
			}
			result = total;
		}
	} else {
		let best = -Infinity;
		let anyMove = false;
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
 * Choose the best move for the current board using expectimax search.
 *
 * A fresh search state is created per request so the memo table is bounded by the branch
 * width of a single search. Workers dispatch this asynchronously; the main thread can
 * use it directly as a fallback.
 *
 * @param board - The current board state.
 * @param depth - Maximum search depth (default 3). Shallower depths keep the UI responsive.
 * @returns The optimal direction, or `null` if no move is available.
 */
export function chooseBestMove(board: number[][], depth: number = 3): Direction | null {
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
 * Compute an expectimax search depth from the current board occupancy.
 *
 * The function maps empty-cell density to a depth between 2 and 6. When the board is
 * mostly empty the search stays shallow to keep the UI responsive; as space dwindles the
 * AI invests more computation because the branching factor naturally drops and late-game
 * decisions matter more.
 *
 * @param board - The current board state.
 * @returns A search depth between 2 and 6 (inclusive).
 */
export function computeAutoDepth(board: number[][]): number {
	const empty = getEmptyCells(board).length;
	const total = board.length * board.length;
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
