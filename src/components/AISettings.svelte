<script lang="ts">
  interface Props {
    speed: number;
    depth: number;
    disabled?: boolean;
    onspeedchange?: (value: number) => void;
    ondepthchange?: (value: number) => void;
  }

  let {
    speed,
    depth,
    disabled = false,
    onspeedchange,
    ondepthchange,
  }: Props = $props();
</script>

<div class="ai-settings" class:disabled>
  <label class="slider">
    <span class="slider-label">
      Speed <span class="slider-value">{speed} ms</span>
    </span>
    <input
      type="range"
      min="0"
      max="500"
      step="20"
      value={speed}
      oninput={(e) => onspeedchange?.(Number(e.currentTarget.value))}
      {disabled}
    />
  </label>
  <label class="slider">
    <span class="slider-label">
      Depth <span class="slider-value">{depth}</span>
    </span>
    <input
      type="range"
      min="1"
      max="6"
      step="1"
      value={depth}
      oninput={(e) => ondepthchange?.(Number(e.currentTarget.value))}
      {disabled}
    />
  </label>
</div>

<style>
  .ai-settings {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--cell-bg) 35%, transparent);

    &.disabled {
      opacity: 0.55;
    }
  }

  .slider {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 4px 10px;
  }

  .slider-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--tile-text);
    white-space: nowrap;
  }

  .slider-value {
    font-family: var(--mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--btn-bg);
    min-width: 44px;
    text-align: right;
  }

  .slider input[type='range'] {
    grid-column: 1 / -1;
    width: 160px;
    max-width: 200px;
    accent-color: var(--btn-bg);
    cursor: pointer;
  }
</style>
