import { move, getEmptyCells, type Direction, type MoveResult } from '../game';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

const WEIGHT_MATRIX = [
	[15, 14, 13, 12],
	[8, 9, 10, 11],
	[7, 6, 5, 4],
	[0, 1, 2, 3],
];

const CORNERS: [number, number][] = [
	[0, 0],
	[0, 3],
	[3, 0],
	[3, 3],
];

function boardKey(board: number[][]): string {
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

function evaluate(board: number[][]): number {
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
				weightSum += log2(value) * WEIGHT_MATRIX[row][col];
				if (value > maxTile) maxTile = value;
			}
		}
	}

	for (const [r, c] of CORNERS) {
		if (board[r][c] === maxTile && maxTile !== 0) {
			maxAtCorner = true;
			break;
		}
	}

	const mergeable = countMergeable(board);

	return (
		weightSum * 1.0 +
		Math.log2(maxTile) * 2.7 +
		empty * 2.7 +
		smoothScore(board) * 0.1 +
		monotonicityScore(board) * 1.0 +
		mergeable * 1.0 +
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
