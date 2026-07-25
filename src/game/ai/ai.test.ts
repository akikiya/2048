import { describe, expect, it, vi } from 'vitest';
import {
	boardKey,
	evaluate,
	chooseBestMove,
} from './ai';

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

describe('boardKey', () => {
	it('returns a unique string for a given board', () => {
		const board = flatBoard([
			[2, 0, 4, 0],
			[0, 8, 0, 0],
			[16, 0, 0, 32],
			[0, 0, 0, 0],
		]);
		expect(boardKey(board)).toBe('2,0,4,0,0,8,0,0,16,0,0,32,0,0,0,0');
	});

	it('distinguishes different boards with the same filled cells', () => {
		const a = flatBoard([
			[2, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 4],
		]);
		const b = flatBoard([
			[0, 0, 0, 2],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[4, 0, 0, 0],
		]);
		expect(boardKey(a)).not.toBe(boardKey(b));
	});
});

describe('evaluate', () => {
	it('returns a finite positive score for an empty board', () => {
		const board = flatBoard([
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const score = evaluate(board);
		expect(Number.isFinite(score)).toBe(true);
		expect(score).toBeGreaterThan(0);
	});

	it('returns the same score for identical boards', () => {
		const board = flatBoard([
			[2, 4, 0, 0],
			[4, 8, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		expect(evaluate(board)).toBe(evaluate(board));
	});

	it('awards a higher score when the max tile is in a corner than when it is in the center', () => {
		const corner = flatBoard([
			[2048, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		const center = flatBoard([
			[0, 0, 0, 0],
			[0, 0, 2048, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		expect(evaluate(corner)).toBeGreaterThan(evaluate(center));
	});
});

describe('chooseBestMove', () => {
	it('returns a direction when at least one move is legal', () => {
		const board = flatBoard([
			[2, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 2],
		]);
		const dir = chooseBestMove(board, 1);
		expect(['up', 'down', 'left', 'right']).toContain(dir);
	});

	it('returns null when no move is possible', () => {
		const board = flatBoard([
			[2, 4, 2, 4],
			[4, 2, 4, 2],
			[2, 4, 2, 4],
			[4, 2, 4, 2],
		]);
		const dir = chooseBestMove(board, 1);
		expect(dir).toBeNull();
	});

	it('returns a deterministic direction for the same board', () => {
		const board = flatBoard([
			[2, 2, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		]);
		expect(chooseBestMove(board, 2)).toBe(chooseBestMove(board, 2));
	});
});