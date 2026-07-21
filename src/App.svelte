<script lang="ts">
  import GithubCorner from './components/GithubCorner.svelte';
  import SizePicker from './components/SizePicker.svelte';
  import Scores from './components/Scores.svelte';
  import Board from './components/Board.svelte';
  import AISettings from './components/AISettings.svelte';
  import { createGame } from './composables/game.svelte';
  import { useAI } from './composables/useAI.svelte';
  import { useKeyboard } from './composables/useKeyboard.svelte';
  import { winTarget } from './composables/game.svelte';

  const SIZES = [3, 4, 5, 6];

  const game = createGame(4);
  const ai = useAI(game);
  const keyboard = useKeyboard((direction) => game.moveTile(direction));

  // Win targets per board size: 3→512, 4→2048, 5→4096, 6→8129.
  const target = $derived(winTarget(game.size));
</script>

<svelte:window onkeydown={keyboard.handle} />

<GithubCorner href="https://github.com/akikiya/2048" fill="#8f7a66" />

<main>
  <header>
    <h1>2048</h1>
    <Scores score={game.score} best={game.best} />
  </header>

  <p class="intro">
    Join the tiles, get to <strong>{target}!</strong> Use arrow keys or swipe.
  </p>

  <div class="controls">
    <SizePicker sizes={SIZES} size={game.size} disabled={ai.running} onchange={game.changeSize} />
    <button type="button" onclick={game.reset}>New Game</button>
    <button type="button" class="ai-toggle" class:running={ai.running} onclick={ai.toggle}>
      {ai.running ? 'Stop AI' : 'Run AI'}
    </button>
    <AISettings
      speed={ai.speed}
      depth={ai.depth}
      disabled={ai.running}
      onspeedchange={(v) => (ai.speed = v)}
      ondepthchange={(v) => (ai.depth = v)}
    />
  </div>

  <Board
    board={game.board}
    size={game.size}
    won={game.won}
    over={game.over}
    keepPlaying={game.keepPlaying}
    onmove={game.moveTile}
    oncontinue={game.continuePlaying}
    onnewgame={game.reset}
  />
</main>
