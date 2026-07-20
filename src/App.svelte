<script lang="ts">
  import {
    createInitialBoard,
    move,
    spawnTile,
    hasMoves,
    isWin,
    type Direction,
  } from './lib/game';
  import { requestBestMove } from './lib/ai/aiClient';
  import GithubCorner from './lib/GithubCorner.svelte';

  const WIN_TARGET = 2048;
  const SIZES = [3, 4, 5, 6];

  function bestKey(size: number): string {
    return `2048-best-${size}`;
  }

  const LEGACY_BEST_KEY = '2048-best';
  const legacyBest = localStorage.getItem(LEGACY_BEST_KEY);
  if (legacyBest !== null && localStorage.getItem(bestKey(4)) === null) {
    localStorage.setItem(bestKey(4), legacyBest);
    localStorage.removeItem(LEGACY_BEST_KEY);
  }

  let size = $state(4);
  let board = $state(createInitialBoard(4));
  let score = $state(0);
  let best = $state(Number(localStorage.getItem(bestKey(size))) || 0);
  let won = $state(false);
  let keepPlaying = $state(false);
  let over = $state(false);

  function syncDerived() {
    if (isWin(board, WIN_TARGET)) won = true;
    if (!hasMoves(board)) over = true;
  }

  function handleMove(direction: Direction) {
    if (over || (won && !keepPlaying)) return;
    const result = move(board, direction);
    if (!result.moved) return;
    board = result.board;
    score += result.scoreGained;
    if (score > best) {
      best = score;
      localStorage.setItem(bestKey(size), String(best));
    }
    spawnTile(board);
    syncDerived();
  }

  let aiRunning = $state(false);
  let aiTimer: ReturnType<typeof setTimeout> | null = null;
  let aiSpeed = $state(120);
  let aiDepth = $state(3);

  let aiSeq = 0;

  async function aiStep() {
    const seq = ++aiSeq;
    if (!aiRunning) return;
    if (over || (won && !keepPlaying)) {
      aiRunning = false;
      return;
    }
    const direction = await requestBestMove(board, aiDepth);
    if (seq !== aiSeq || !aiRunning) return;
    if (!direction) {
      aiRunning = false;
      return;
    }
    handleMove(direction);
    if (seq !== aiSeq || !aiRunning) return;
    aiTimer = setTimeout(aiStep, aiSpeed);
  }

  function toggleAI() {
    aiRunning = !aiRunning;
    if (aiRunning) {
      if (over || (won && !keepPlaying)) newGame();
      aiStep();
    } else {
      aiSeq++;
      if (aiTimer) {
        clearTimeout(aiTimer);
        aiTimer = null;
      }
    }
  }

  function newGame() {
    aiSeq++;
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    aiRunning = false;
    board = createInitialBoard(size);
    score = 0;
    won = false;
    keepPlaying = false;
    over = false;
  }

  function changeSize(next: number) {
    if (next === size) return;
    size = next;
    best = Number(localStorage.getItem(bestKey(size))) || 0;
    newGame();
  }

  function continuePlaying() {
    keepPlaying = true;
  }

  function onKeydown(e: KeyboardEvent) {
    const map: Record<string, Direction> = {
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
    const direction = map[e.key];
    if (!direction) return;
    e.preventDefault();
    handleMove(direction);
  }

  let touchX = 0;
  let touchY = 0;

  function onTouchStart(e: TouchEvent) {
    touchX = e.touches[0].clientX;
    touchY = e.touches[0].clientY;
  }

  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchX;
    const dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left');
    } else {
      handleMove(dy > 0 ? 'down' : 'up');
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

<GithubCorner href="https://github.com/akikiya/2048" />

<main>
  <header>
    <h1>2048</h1>
    <div class="scores">
      <div class="score-box">
        <span class="label">Score</span>
        <span class="value">{score}</span>
      </div>
      <div class="score-box">
        <span class="label">Best</span>
        <span class="value">{best}</span>
      </div>
    </div>
  </header>

  <p class="intro">
    Join the tiles, get to <strong>2048!</strong> Use arrow keys or swipe.
  </p>

  <div class="controls">
    <div class="size-picker" role="group" aria-label="Board size">
      <span class="size-label">Size</span>
      {#each SIZES as s}
        <button
          type="button"
          class="size-option"
          class:active={s === size}
          onclick={() => changeSize(s)}
          disabled={aiRunning}
        >
          {s}×{s}
        </button>
      {/each}
    </div>
    <button type="button" onclick={newGame}>New Game</button>
    <button type="button" class="ai-toggle" class:running={aiRunning} onclick={toggleAI}>
      {aiRunning ? 'Stop AI' : 'Run AI'}
    </button>
    <div class="ai-settings" class:disabled={aiRunning}>
      <label class="slider">
        <span class="slider-label">
          Speed <span class="slider-value">{aiSpeed} ms</span>
        </span>
        <input
          type="range"
          min="0"
          max="500"
          step="20"
          bind:value={aiSpeed}
          disabled={aiRunning}
        />
      </label>
      <label class="slider">
        <span class="slider-label">
          Depth <span class="slider-value">{aiDepth}</span>
        </span>
        <input
          type="range"
          min="1"
          max="6"
          step="1"
          bind:value={aiDepth}
          disabled={aiRunning}
        />
      </label>
    </div>
  </div>

  <div
    class="board"
    style="--size: {size}"
    role="application"
    aria-label="2048 game board"
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}
  >
    <div class="grid-background">
      {#each Array(size * size) as _}
        <div class="cell"></div>
      {/each}
    </div>

    <div class="tiles">
      {#each board as row, r}
        {#each row as value, c}
          {#if value !== 0}
            <div
              class="tile tile-{value}"
              style="--r: {r}; --c: {c}"
            >
              {value}
            </div>
          {/if}
        {/each}
      {/each}
    </div>

    {#if (won && !keepPlaying) || over}
      <div class="overlay" class:win={won && !keepPlaying} class:lose={over}>
        <div class="overlay-text">
          {#if won && !keepPlaying}
            <h2>You win!</h2>
            <div class="overlay-actions">
              <button type="button" onclick={continuePlaying}>Keep going</button>
              <button type="button" onclick={newGame}>New Game</button>
            </div>
          {:else if over}
            <h2>Game over</h2>
            <div class="overlay-actions">
              <button type="button" onclick={newGame}>Try again</button>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</main>
