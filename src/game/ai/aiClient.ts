import { chooseBestMove } from './ai';
import type { Direction } from '../game';
import type { AiRequest, AiResponse } from './ai.worker';

type Pending = (direction: Direction | null) => void;

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

/**
 * Checks whether the current environment supports Web Workers.
 *
 * @returns `true` if `Worker` is available in the global scope.
 */
function supportsWorker(): boolean {
	return typeof Worker !== 'undefined';
}

/**
 * Lazily creates (or returns the cached) AI Web Worker.
 *
 * If workers are unsupported, returns `null`. The worker is instantiated once
 * and reused for all subsequent requests.
 *
 * @returns A running {@link Worker} instance, or `null` if workers are unavailable.
 */
function getWorker(): Worker | null {
	if (!supportsWorker()) return null;
	if (worker) return worker;
	worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
		type: 'module',
	});
	worker.onmessage = (e: MessageEvent<AiResponse>) => {
		const resolve = pending.get(e.data.id);
		if (!resolve) return;
		pending.delete(e.data.id);
		resolve(e.data.direction);
	};
	worker.onerror = () => {
		for (const resolve of pending.values()) resolve(null);
		pending.clear();
	};
	return worker;
}

/**
 * Requests the best move from the AI, delegating to a Web Worker when available.
 *
 * If the environment lacks worker support or the worker fails, the computation
 * falls back to running {@link chooseBestMove} synchronously on the main thread.
 *
 * @param board - Flat board representing the current game state.
 * @param depth - Expectimax search depth to use for the calculation.
 * @returns A promise that resolves to the recommended {@link Direction}, or `null` if no moves are possible.
 */
export function requestBestMove(
	board: Uint32Array,
	depth: number
): Promise<Direction | null> {
	if (!supportsWorker()) {
		return Promise.resolve(chooseBestMove(board, depth));
	}

	const w = getWorker();
	if (!w) return Promise.resolve(chooseBestMove(board, depth));

	const id = nextId++;
	const flatBoard = new Uint32Array(board);
	const request: AiRequest = { id, board: flatBoard, depth };
	return new Promise<Direction | null>((resolve) => {
		pending.set(id, resolve);
		w.postMessage(request);
	});
}
