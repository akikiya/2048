import { describe, expect, it, vi, afterEach } from 'vitest';
import { chooseBestMove } from './ai';

class FakeWorker {
	onmessage: ((e: { data: { id: number; direction: 'up' | 'down' | 'left' | 'right' | null } }) => void) | null = null;
	onerror: (() => void) | null = null;

	constructor(_url: URL | string, _options?: { type: string }) {}

	postMessage(data: { id: number; board: number[][]; depth: number }) {
		if (this.onmessage) {
			const direction = chooseBestMove(data.board, data.depth);
			this.onmessage({ data: { id: data.id, direction } });
		}
	}
}

async function loadRequestBestMove() {
	vi.resetModules();
	(globalThis as Record<string, unknown>).Worker = FakeWorker as unknown as typeof Worker;
	const mod = await import('./aiClient');
	return mod.requestBestMove;
}

describe('requestBestMove', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('resolves with a direction from the worker', async () => {
		const requestBestMove = await loadRequestBestMove();

		const board = [
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 2],
		];
		const dir = await requestBestMove(board, 2);
		expect(['up', 'down', 'left', 'right', null]).toContain(dir);
	});

	it('falls back synchronously when Worker is unavailable', async () => {
		vi.resetModules();
		(globalThis as Record<string, unknown>).Worker = undefined;
		const mod = await import('./aiClient');
		const requestBestMove = mod.requestBestMove;

		const board = [
			[2, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
			[0, 0, 0, 0],
		];
		const dir = await requestBestMove(board, 1);
		expect(['up', 'down', 'left', 'right']).toContain(dir);
	});
});
