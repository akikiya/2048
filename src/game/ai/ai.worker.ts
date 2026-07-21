/// <reference lib="webworker" />
import { chooseBestMove } from './ai';
import type { Direction } from '../game';

export interface AiRequest {
	id: number;
	board: number[][];
	depth: number;
}

export interface AiResponse {
	id: number;
	direction: Direction | null;
}

// Runs the expectimax search off the main thread to keep the UI responsive.
self.onmessage = (e: MessageEvent<AiRequest>) => {
	const { id, board, depth } = e.data;
	const direction = chooseBestMove(board, depth);
	const response: AiResponse = { id, direction };
	(self as DedicatedWorkerGlobalScope).postMessage(response);
};
