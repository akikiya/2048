import { chooseBestMove } from './ai';
import type { Direction } from '../game';
import type { AiRequest, AiResponse } from './ai.worker';

type Pending = (direction: Direction | null) => void;

// Lazy-init singleton worker with request-correlation via incrementing IDs.
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

/**
 * Feature-detect whether the current environment provides Web Worker support.
 *
 * Not every environment provides Web Worker support (e.g., some SSR or older browsers).
 * This guard avoids throwing at module import time and lets the AI degrade gracefully to
 * a synchronous main-thread fallback.
 *
 * @returns `true` if `Worker` is available.
 */
function supportsWorker(): boolean {
	return typeof Worker !== 'undefined';
}

/**
 * Lazily initialize and return the singleton AI worker.
 *
 * Using a singleton avoids spawning redundant threads if multiple components request AI
 * moves concurrently. The module URL resolution via `import.meta.url` is required because
 * relative paths in `new Worker()` are resolved from the HTML page, not the module file.
 *
 * @returns The singleton worker, or `null` if workers are unsupported.
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
	// Reject all pending requests on worker error to avoid hanging promises.
	worker.onerror = () => {
		for (const resolve of pending.values()) resolve(null);
		pending.clear();
	};
	return worker;
}

/**
 * Dispatch an AI move request to the background worker (or main-thread fallback).
 *
 * Deep-clones the board before posting so worker mutation cannot affect the caller's
 * reactive state. Shared memory (`Transferable`) is not used here because the board is
 * small enough that `structuredClone` overhead is negligible relative to expectimax cost.
 *
 * Correlation IDs let many in-flight requests coexist without ordering constraints; the
 * worker replies with the same ID so we can resolve the correct Promise.
 *
 * @param board - The current board snapshot.
 * @param depth - Maximum expectimax search depth.
 * @returns A promise that resolves to the best direction, or `null` if unavailable.
 */
export function requestBestMove(
	board: number[][],
	depth: number
): Promise<Direction | null> {
	if (!supportsWorker()) {
		return Promise.resolve(chooseBestMove(board, depth));
	}

	const w = getWorker();
	if (!w) return Promise.resolve(chooseBestMove(board, depth));

	const id = nextId++;
	const plainBoard = board.map((row) => [...row]);
	const request: AiRequest = { id, board: plainBoard, depth };
	return new Promise<Direction | null>((resolve) => {
		pending.set(id, resolve);
		w.postMessage(request);
	});
}
