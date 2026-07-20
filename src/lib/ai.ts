import { move, getEmptyCells, type Direction, type MoveResult } from './game';

const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

const WEIGHT_MATRIX = [
	[15, 14, 13, 12],
	[8, 9, 10, 11],
	[7, 6, 5, 4],
	[0, 1, 2, 3],
];

function cloneBoard(board: number[][]): number[][] {
	return board.map((row) => [...row]);
}

function smoothScore(board: number[][]): number {
	const n = board.length;
	let score = 0;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (value === 0) continue;
			const neighbors: number[] = [];
			if (row > 0 && board[row - 1][col] !== 0)
				neighbors.push(board[row - 1][col]);
			if (row < n - 1 && board[row + 1][col] !== 0)
				neighbors.push(board[row + 1][col]);
			if (col > 0 && board[row][col - 1] !== 0)
				neighbors.push(board[row][col - 1]);
			if (col < n - 1 && board[row][col + 1] !== 0)
				neighbors.push(board[row][col + 1]);
			for (const neighbor of neighbors) {
				score -= Math.abs(Math.log2(value) - Math.log2(neighbor));
			}
		}
	}
	return score;
}

function monotonicityScore(board: number[][]): number {
	const n = board.length;
	let totals = [0, 0, 0, 0];

	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n - 1; col++) {
			const current = board[row][col] ? Math.log2(board[row][col]) : 0;
			const next = board[row][col + 1] ? Math.log2(board[row][col + 1]) : 0;
			if (current > next) totals[0] += next - current;
			else totals[1] += current - next;
		}
	}

	for (let col = 0; col < n; col++) {
		for (let row = 0; row < n - 1; row++) {
			const current = board[row][col] ? Math.log2(board[row][col]) : 0;
			const next = board[row + 1][col] ? Math.log2(board[row + 1][col]) : 0;
			if (current > next) totals[2] += next - current;
			else totals[3] += current - next;
		}
	}

	return Math.max(totals[0], totals[1]) + Math.max(totals[2], totals[3]);
}

function evaluate(board: number[][]): number {
	const n = board.length;
	let empty = 0;
	let weightSum = 0;
	let maxTile = 0;

	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (value === 0) {
				empty++;
			} else {
				weightSum += Math.log2(value) * WEIGHT_MATRIX[row][col];
				if (value > maxTile) maxTile = value;
			}
		}
	}

	const mergeable = countMergeable(board);

	return (
		weightSum * 1.0 +
		Math.log2(maxTile) * 2.5 +
		empty * 2.7 +
		smoothScore(board) * 0.1 +
		monotonicityScore(board) * 1.0 +
		mergeable * 1.0
	);
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

function expectimax(
	board: number[][],
	depth: number,
	isChance: boolean
): number {
	const n = board.length;
	if (depth === 0) return evaluate(board);

	if (isChance) {
		let total = 0;
		let moves = 0;
		const empty = getEmptyCells(board);
		for (const { row, col } of empty) {
			for (const value of [2, 4]) {
				const next = cloneBoard(board);
				next[row][col] = value;
				const prob = value === 2 ? 0.9 : 0.1;
				total += prob * expectimax(next, depth - 1, false);
				moves++;
			}
		}
		if (moves === 0) return evaluate(board);
		return total / moves;
	}

	let best = -Infinity;
	let anyMove = false;
	for (const direction of DIRECTIONS) {
		const result: MoveResult = move(board, direction);
		if (!result.moved) continue;
		anyMove = true;
		const value = expectimax(result.board, depth - 1, true);
		if (value > best) best = value;
	}
	if (!anyMove) return evaluate(board);
	return best;
}

export function chooseBestMove(board: number[][], depth: number = 3): Direction | null {
	let bestDirection: Direction | null = null;
	let bestScore = -Infinity;
	for (const direction of DIRECTIONS) {
		const result = move(board, direction);
		if (!result.moved) continue;
		const score = expectimax(result.board, depth - 1, true);
		if (score > bestScore) {
			bestScore = score;
			bestDirection = direction;
		}
	}
	return bestDirection;
}
