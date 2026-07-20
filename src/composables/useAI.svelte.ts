import { requestBestMove } from '../game/ai/aiClient';
import type { Game } from './game.svelte';

export function useAI(game: Game) {
  let running = $state(false);
  let speed = $state(120);
  let depth = $state(3);

  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;

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

  function stop() {
    seq++;
    running = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

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
