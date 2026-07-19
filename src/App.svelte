<script lang="ts">
  import {
    createInitialBoard,
    move,
    spawnTile,
    hasMoves,
    isWin,
    type Direction,
  } from './lib/game';

  const SIZE = 4;
  const WIN_TARGET = 2048;
  const BEST_KEY = '2048-best';

  let board = $state(createInitialBoard(SIZE));
  let score = $state(0);
  let best = $state(Number(localStorage.getItem(BEST_KEY)) || 0);
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
      localStorage.setItem(BEST_KEY, String(best));
    }
    spawnTile(board);
    syncDerived();
  }

  function newGame() {
    board = createInitialBoard(SIZE);
    score = 0;
    won = false;
    keepPlaying = false;
    over = false;
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
    <button type="button" onclick={newGame}>New Game</button>
  </div>

  <div
    class="board"
    style="--size: {SIZE}"
    role="application"
    aria-label="2048 game board"
    ontouchstart={onTouchStart}
    ontouchend={onTouchEnd}
  >
    <div class="grid-background">
      {#each Array(SIZE * SIZE) as _}
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
