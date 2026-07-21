import { chooseBestMove } from './ai';
import type { Direction } from '../game';
import type { AiRequest, AiResponse } from './ai.worker';

type Pending = (direction: Direction | null) => void;

// Lazy-init singleton worker with request-correlation via incrementing IDs.
let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function supportsWorker(): boolean {
	return typeof Worker !== 'undefined';
}

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

export function requestBestMove(
	board: number[][],
	depth: number
): Promise<Direction | null> {
	// Fallback to main-thread evaluation when Web Workers are unavailable.
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
