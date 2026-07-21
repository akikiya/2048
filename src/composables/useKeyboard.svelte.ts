import type { Direction } from '../game/game';

// Map both arrow keys and WASD (lowercase and uppercase) to unified directions.
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

export function useKeyboard(onMove: (direction: Direction) => void) {
  function handle(e: KeyboardEvent) {
    const direction = KEY_MAP[e.key];
    if (!direction) return;
    e.preventDefault();
    onMove(direction);
  }

  return { handle };
}
