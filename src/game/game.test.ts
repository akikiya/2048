import { describe, it, expect } from 'vitest';
import {
	createEmptyBoard,
	createInitialBoard,
	spawnTile,
	getEmptyCells,
	move,
	hasMoves,
	getHighestTile,
	isWin,
	type Direction,
} from './game';

function flatBoard(rows: number[][]): Uint32Array {
	const n = rows.length;
	const board = new Uint32Array(n * n);
	for (let r = 0; r < n; r++) {
		for (let c = 0; c < n; c++) {
			board[r * n + c] = rows[r][c];
		}
	}
	return board;
}

function cellAt(board: Uint32Array, n: number, row: number, col: number): number {
	return board[row * n + col];
}

describe('board helpers', () => {
	it('creates an empty board of given size', () => {
		const board = createEmptyBoard(4);
		expect(board.length).toBe(16);
		expect(board.every((v) => v === 0)).toBe(true);
	});

	it('spawns only 2 or 4', () => {
		const board = createEmptyBoard(4);
		const pos = spawnTile(board);
		expect(pos).not.toBeNull();
		const { row, col } = pos!;
		expect([2, 4]).toContain(cellAt(board, 4, row, col));
	});

	it('getEmptyCells returns all cells when empty', () => {
		const board = createEmptyBoard(2);
		expect(getEmptyCells(board)).toHaveLength(4);
	});

	it('initial board has exactly two tiles', () => {
		const board = createInitialBoard();
		let count = 0;
		for (let i = 0; i < board.length; i++) {
			if (board[i] !== 0) count++;
		}
		expect(count).toBe(2);
	});
});

describe('move left', () => {
	it('slides tiles to the left', () => {
		const start = flatBoard([
			[0, 2, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const { board, moved } = move(start, 'left');
		expect(cellAt(board, 4, 0, 0)).toBe(2);
		expect(moved).toBe(true);
	});

	it('merges equal adjacent tiles once per move', () => {
		const start = flatBoard([
			[2, 2, 2, 2],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const { board, scoreGained } = move(start, 'left');
		expect(cellAt(board, 4, 0, 0)).toBe(4);
		expect(cellAt(board, 4, 0, 1)).toBe(4);
		expect(cellAt(board, 4, 0, 2)).toBe(0);
		expect(cellAt(board, 4, 0, 3)).toBe(0);
		expect(scoreGained).toBe(8);
	});

	it('does not merge a tile more than once', () => {
		const start = flatBoard([
			[4, 2, 2, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const { board } = move(start, 'left');
		expect(cellAt(board, 4, 0, 0)).toBe(4);
		expect(cellAt(board, 4, 0, 1)).toBe(4);
	});

	it('reports no move when nothing changes', () => {
		const start = flatBoard([
			[2, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const { moved } = move(start, 'left');
		expect(moved).toBe(false);
	});
});

describe('all directions', () => {
	const checks: Array<{ dir: Direction; from: number[][]; to: number[][] }> = [
		{
			dir: 'right',
			from: [
				[2, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
			],
			to: [
				[0, 0, 0, 2],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
			],
		},
		{
			dir: 'up',
			from: [
				[2, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
			],
			to: [
				[2, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
			],
		},
		{
			dir: 'down',
			from: [
				[2, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
			],
			to: [
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[2, 0, 0, 0],
			],
		},
	];

	for (const { dir, from, to } of checks) {
		it(`moves tiles ${dir}`, () => {
			const { board } = move(flatBoard(from), dir);
			expect(Array.from(board)).toEqual(to.flat());
		});
	}

	it('merges vertically (up)', () => {
		const start = flatBoard([
			[2, 0, 0, 0],
			[2, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const { board, scoreGained } = move(start, 'up');
		expect(cellAt(board, 4, 0, 0)).toBe(4);
		expect(scoreGained).toBe(4);
	});
});

describe('game state', () => {
	it('detects when moves are available (empty cells)', () => {
		const board = createEmptyBoard(4);
		expect(hasMoves(board)).toBe(true);
	});

	it('detects a mergeable board with no empty cells', () => {
		const board = flatBoard([
			[2, 2, 4, 8],
			[4, 8, 16, 32],
			[2, 4, 8, 16],
			[4, 8, 16, 32],
		]);
		expect(hasMoves(board)).toBe(true);
	});

	it('detects a full board with no moves', () => {
		const board = flatBoard([
			[2, 4, 2, 4],
			[4, 2, 4, 2],
			[2, 4, 2, 4],
			[4, 2, 4, 2],
		]);
		expect(hasMoves(board)).toBe(false);
	});

	it('finds the highest tile', () => {
		const board = flatBoard([
			[2, 0, 0, 0],
			[0, 8, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		expect(getHighestTile(board)).toBe(8);
	});

	it('detects win at 2048', () => {
		const board = flatBoard([
			[2048, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		expect(isWin(board)).toBe(true);
		expect(isWin(board, 4096)).toBe(false);
	});
});

describe('spawn', () => {
	it('spawnTile adds exactly one tile', () => {
		const board = createEmptyBoard(4);
		const pos = spawnTile(board);
		expect(pos).not.toBeNull();
		let count = 0;
		for (let i = 0; i < board.length; i++) {
			if (board[i] !== 0) count++;
		}
		expect(count).toBe(1);
		expect([2, 4]).toContain(cellAt(board, 4, pos!.row, pos!.col));
	});

	it('spawnTile returns null on a full board', () => {
		const board = flatBoard([
			[2, 4, 2, 4],
			[4, 2, 4, 2],
			[2, 4, 2, 4],
			[4, 2, 4, 2],
		]);
		expect(spawnTile(board)).toBeNull();
	});

	it('move does not mutate the original board', () => {
		const start = flatBoard([
			[2, 2, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const snapshot = new Uint32Array(start);
		move(start, 'left');
		expect(start).toEqual(snapshot);
	});

	it('move + spawn keeps tile count correct', () => {
		const start = flatBoard([
			[2, 2, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const result = move(start, 'left');
		expect(result.moved).toBe(true);
		let count = 0;
		for (let i = 0; i < result.board.length; i++) {
			if (result.board[i] !== 0) count++;
		}
		expect(count).toBe(1);
		const spawned = spawnTile(result.board);
		expect(spawned).not.toBeNull();
		count = 0;
		for (let i = 0; i < result.board.length; i++) {
			if (result.board[i] !== 0) count++;
		}
		expect(count).toBe(2);
	});
});