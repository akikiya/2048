/// <reference lib="webworker" />
import { chooseBestMove } from './ai';
import type { Direction } from '../game';

/**
 * Serialized request payload sent from the main thread to the AI worker.
 */
export interface AiRequest {
	/** Correlation ID matching the pending Promise resolver. */
	id: number;
	/** Deep-cloned board snapshot so worker mutation cannot leak back. */
	board: number[][];
	/** Maximum expectimax search depth. */
	depth: number;
}

/**
 * Response payload sent from the AI worker back to the main thread.
 */
export interface AiResponse {
	/** Correlation ID echoing the request so the correct resolver is matched. */
	id: number;
	/** The best direction, or `null` if no move is available. */
	direction: Direction | null;
}

/**
 * Delegates the heavy expectimax computation to a background thread.
 *
 * Because the worker is stateless, any message it receives is processed in isolation —
 * no board is mutated before the serialized copy is POSTed back, which eliminates
 * reactivity hazards across the worker boundary.
 */
self.onmessage = (e: MessageEvent<AiRequest>) => {
	const { id, board, depth } = e.data;
	const direction = chooseBestMove(board, depth);
	const response: AiResponse = { id, direction };
	(self as DedicatedWorkerGlobalScope).postMessage(response);
};
