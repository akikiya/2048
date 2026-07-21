<script lang="ts">
  interface Props {
    value: number;
    row: number;
    col: number;
  }

  let { value, row, col }: Props = $props();
</script>

<div class="tile tile-{value}" style="--r: {row}; --c: {col}">
  {value}
</div>

<style>
  .tile {
    /* Use CSS custom properties for grid placement instead of inline row/col styles. */
    grid-row: calc(var(--r) + 1);
    grid-column: calc(var(--c) + 1);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-weight: 800;
    font-family: var(--mono);
    /* clamp() scales text responsively; larger tiles shrink font to avoid overflow. */
    font-size: clamp(18px, 7vw, 34px);
    background: var(--t2);
    color: var(--tile-text);
    animation: appear 0.12s ease-in-out;
  }

  @keyframes appear {
    from {
      transform: scale(0.6);
      opacity: 0.4;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .tile-2 {
    background: var(--t2);
  }
  .tile-4 {
    background: var(--t4);
  }
  .tile-8 {
    background: var(--t8);
    color: var(--tile-text-light);
  }
  .tile-16 {
    background: var(--t16);
    color: var(--tile-text-light);
  }
  .tile-32 {
    background: var(--t32);
    color: var(--tile-text-light);
  }
  .tile-64 {
    background: var(--t64);
    color: var(--tile-text-light);
  }
  .tile-128 {
    background: var(--t128);
    color: var(--tile-text-light);
    font-size: clamp(16px, 6vw, 30px);
  }
  .tile-256 {
    background: var(--t256);
    color: var(--tile-text-light);
    font-size: clamp(16px, 6vw, 30px);
  }
  .tile-512 {
    background: var(--t512);
    color: var(--tile-text-light);
    font-size: clamp(16px, 6vw, 30px);
  }
  .tile-1024 {
    background: var(--t1024);
    color: var(--tile-text-light);
    font-size: clamp(14px, 5vw, 26px);
  }
  .tile-2048 {
    background: var(--t2048);
    color: var(--tile-text-light);
    font-size: clamp(14px, 5vw, 26px);
  }
  .tile-4096,
  .tile-8192 {
    background: var(--tbig);
    color: var(--tile-text-light);
    font-size: clamp(14px, 5vw, 26px);
  }
</style>
