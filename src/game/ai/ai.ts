import { move, getEmptyCells, type Direction, type MoveResult } from '../game';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

function buildWeightMatrix(size: number): number[][] {
	// Higher weights toward the bottom-right corner encourage the AI to build large tiles there.
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

function syncSize(board: number[][]) {
	const n = board.length;
	if (weightMatrix.length !== n) {
		weightMatrix = buildWeightMatrix(n);
		corners = cornersFor(n);
	}
}

function boardKey(board: number[][]): string {
	// Serialize board state to a string for memoization in expectimax.
	let key = '';
	for (let r = 0; r < board.length; r++) {
		for (let c = 0; c < board.length; c++) {
			key += board[r][c] + ',';
		}
	}
	return key;
}

function log2(value: number): number {
	return Math.log2(value);
}

function smoothScore(board: number[][]): number {
	const n = board.length;
	let score = 0;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (value === 0) continue;
			const log = log2(value);
			// Penalize adjacent tiles with large log-value differences (rough board surface).
			if (row > 0 && board[row - 1][col] !== 0)
				score -= Math.abs(log - log2(board[row - 1][col]));
			if (col < n - 1 && board[row][col + 1] !== 0)
				score -= Math.abs(log - log2(board[row][col + 1]));
		}
	}
	return score;
}

function monotonicityScore(board: number[][]): number {
	const n = board.length;
	let totals = [0, 0, 0, 0];

	// Measure monotonicity in all four directions; lower penalty = more monotonic.
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

function countMergeable(board: number[][]): number {
	const n = board.length;
	let count = 0;
	// Count pairs of adjacent equal tiles as potential future merges.
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

function snakeScore(board: number[][]): number {
	// Reward the classic snake/winding pattern: tiles generally decrease along a
	// serpentine path from the anchor corner. This encourages the structured
	// stacking that human players use to reach high tiles.
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

function cornerQualityScore(board: number[][]): number {
	// Quantify how well the largest tiles are anchored in corners/edges.
	// Strongly prefer corners, moderately prefer same-edge adjacency, penalize center.
	const n = board.length;
	const positions: { r: number; c: number; val: number }[] = corners
		.map(([r, c]) => ({ r, c, val: board[r][c] }))
		.filter(p => p.val > 0)
		.sort((a, b) => b.val - a.val);

	if (positions.length === 0) return 0;

	let score = 0;
	const maxVal = positions[0].val;

	// Largest tile in any corner: strong bonus.
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

	// Penalize if the max tile is trapped in the center (not on any edge).
	const [mr, mc] = [positions[0].r, positions[0].c];
	const onEdge = mr === 0 || mr === n - 1 || mc === 0 || mc === n - 1;
	if (!onEdge && maxVal > 0) score -= 30;

	return score;
}

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
		Math.log2(maxTile) * 2.7 +
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

function expectimax(
	state: SearchState,
	board: number[][],
	depth: number,
	isChance: boolean
): number {
	const key = boardKey(board);
	if (depth === 0) {
		// Leaf node: return cached evaluation or compute and cache it.
		let cached = state.cache.get(key);
		if (cached === undefined) {
			cached = evaluate(board);
			state.cache.set(key, cached);
		}
		return cached;
	}

	// Return cached intermediate result to prune redundant recursion.
	const cached = state.cache.get(key);
	if (cached !== undefined) return cached;

	let result: number;

	if (isChance) {
		const empty = getEmptyCells(board);
		if (empty.length === 0) {
			result = evaluate(board);
		} else {
			// Expectation over all possible spawns: 90% for 2, 10% for 4.
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
		// Large negative penalty distinguishes terminal no-move states from valid scores.
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
