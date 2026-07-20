<script lang="ts">
  interface Props {
    sizes: number[];
    size: number;
    disabled?: boolean;
    onchange?: (next: number) => void;
  }

  let { sizes, size, disabled = false, onchange }: Props = $props();
</script>

<div class="size-picker" role="group" aria-label="Board size">
  <span class="size-label">Size</span>
  {#each sizes as s}
    <button
      type="button"
      class="size-option"
      class:active={s === size}
      onclick={() => onchange?.(s)}
      {disabled}
    >
      {s}×{s}
    </button>
  {/each}
</div>

<style>
  .size-picker {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--cell-bg) 35%, transparent);
  }

  .size-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--tile-text);
    margin-right: 2px;
  }

  .size-option {
    background: transparent;
    color: var(--tile-text);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 13px;
    font-weight: 700;
    font-family: var(--mono);
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;

    &:hover:not(:disabled) {
      background: var(--btn-bg-hover);
      color: var(--btn-text);
    }

    &.active {
      background: var(--btn-bg);
      color: var(--btn-text);
      border-color: var(--btn-bg);
    }

    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  }
</style>
