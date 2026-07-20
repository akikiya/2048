<script lang="ts">
  interface Props {
    score: number;
    best: number;
  }

  let { score, best }: Props = $props();
</script>

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

<style>
  .scores {
    display: flex;
    gap: 8px;
  }

  .score-box {
    background: var(--board-bg);
    color: #fff;
    border-radius: 6px;
    padding: 8px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    min-width: 64px;

    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--score-label);
    }
    .value {
      font-size: 22px;
      font-weight: 700;
      font-family: var(--mono);
    }
  }
</style>
