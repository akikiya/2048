/// <reference lib="webworker" />
import { chooseBestMove } from './ai';
import type { Direction } from '../game';

/**
 * Request payload sent from the main thread to the AI worker.
 */
export interface AiRequest {
	/** Correlates the request with its corresponding {@link AiResponse}. */
	id: number;
	/** Flat board representing the current game state to evaluate. */
	board: Uint32Array;
	/** Expectimax search depth to use for this calculation. */
	depth: number;
}

/**
 * Response payload sent from the AI worker back to the main thread.
 */
export interface AiResponse {
	/** Matches the `id` of the originating {@link AiRequest}. */
	id: number;
	/** Best move direction determined by the AI, or `null` if no moves exist. */
	direction: Direction | null;
}

/**
 * Worker message handler that delegates AI computation to the expectimax solver.
 *
 * Receives an {@link AiRequest}, computes the best move via {@link chooseBestMove},
 * and posts an {@link AiResponse} back to the main thread.
 */
self.onmessage = (e: MessageEvent<AiRequest>) => {
	const { id, board, depth } = e.data;
	const direction = chooseBestMove(board, depth);
	const response: AiResponse = { id, direction };
	(self as DedicatedWorkerGlobalScope).postMessage(response);
};
