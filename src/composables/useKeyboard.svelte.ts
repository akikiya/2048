import type { Direction } from '../game/game';

/**
 * Map both arrow keys and WASD (lowercase and uppercase) to unified directions.
 *
 * Supporting both input schemes lets desktop and laptop users play without remapping.
 */
const KEY_MAP: Record<string, Direction> = {
	ArrowUp: 'up',
	ArrowDown: 'down',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	w: 'up',
	s: 'down',
	a: 'left',
	d: 'right',
	W: 'up',
	S: 'down',
	A: 'left',
	D: 'right',
};

/**
 * Attach a global keyboard listener that translates physical keypresses into game
 * directions. Returning the handler lets the caller bind it to `window.addEventListener`
 * and clean it up on component unmount.
 *
 * @param onMove - Callback invoked with the canonical direction whenever a mapped key is pressed.
 * @returns An object exposing the `handle` event listener.
 */
export function useKeyboard(onMove: (direction: Direction) => void) {
	/**
	 * Filter keyboard events to mapped game directions and suppress default scrolling.
	 *
	 * @param e - The native keyboard event.
	 */
	function handle(e: KeyboardEvent) {
		const direction = KEY_MAP[e.key];
		if (!direction) return;
		e.preventDefault();
		onMove(direction);
	}

	return { handle };
}
