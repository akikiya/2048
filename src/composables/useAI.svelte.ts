import { requestBestMove } from '../game/ai/aiClient';
import type { Game } from './game.svelte';

/**
 * Drive the AI autoplay loop for a given game instance.
 *
 * Manages async step scheduling, user cancellation, depth/speed mutation, and stale
 * request filtering so that ghost moves cannot apply after the user toggles or stops.
 *
 * @param game - The encapsulated game session to control.
 * @returns An object with observable properties (`running`, `speed`, `depth`) and controls (`toggle`, `stop`).
 */
export function useAI(game: Game) {
	let running = $state(false);
	let speed = $state(120);
	let depth = $state(3);

	let timer: ReturnType<typeof setTimeout> | null = null;
	/**
	 * Sequence counter guards against stale async results applying after toggle/stop.
	 *
	 * Every call to `step()` increments the counter; subsequent async resolutions discard
	 * themselves if their sequence token is no longer current, preventing ghost moves.
	 */
	let seq = 0;

	/**
	 * Execute one AI move and schedule the next if still running.
	 *
	 * Cancellation is handled via the `seq` token: any response whose token does not
	 * match the current sequence is discarded. This makes the loop resilient to rapid
	 * toggle/stop actions.
	 */
	async function step() {
		const current = ++seq;
		if (!running) return;
		if (game.over || (game.won && !game.keepPlaying)) {
			running = false;
			return;
		}
		const direction = await requestBestMove(game.board, depth);
		if (current !== seq || !running) return;
		if (!direction) {
			running = false;
			return;
		}
		game.moveTile(direction);
		if (current !== seq || !running) return;
		timer = setTimeout(step, speed);
	}

	/**
	 * Halt the AI loop immediately.
	 *
	 * Clears the pending timer and increments the sequence counter so any in-flight
	 * worker request resolves to a discarded stale token.
	 */
	function stop() {
		seq++;
		running = false;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
	}

	/**
	 * Toggle the AI loop on or off.
	 *
	 * Starting the AI auto-resets the game if it is in a terminal state so the AI never
	 * begins from an unrecoverable board.
	 */
	function toggle() {
		running = !running;
		if (running) {
			if (game.over || (game.won && !game.keepPlaying)) game.reset();
			step();
		} else {
			stop();
		}
	}

	return {
		get running() {
			return running;
		},
		get speed() {
			return speed;
		},
		set speed(value: number) {
			speed = value;
		},
		get depth() {
			return depth;
		},
		set depth(value: number) {
			depth = value;
		},
		toggle,
		stop,
	};
}
