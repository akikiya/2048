<script lang="ts">
  interface Props {
    speed: number;
    depth: number;
    autoDepth?: boolean;
    disabled?: boolean;
    onspeedchange?: (value: number) => void;
    ondepthchange?: (value: number) => void;
    onautodepthchange?: (value: boolean) => void;
  }

  let {
    speed,
    depth,
    autoDepth = false,
    disabled = false,
    onspeedchange,
    ondepthchange,
    onautodepthchange,
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
      class:disabled={autoDepth}
    />
  </label>
  <label class="toggle">
    <input
      type="checkbox"
      checked={autoDepth}
      onchange={(e) => onautodepthchange?.(e.currentTarget.checked)}
      {disabled}
    />
    <span>Auto Depth</span>
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
    /* color-mix blends the cell background with transparency for a subtle container tint. */
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

  .slider input[type='range'].disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  .toggle {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: var(--tile-text);
    white-space: nowrap;
  }

  .toggle input[type='checkbox'] {
    width: 16px;
    height: 16px;
    accent-color: var(--btn-bg);
    cursor: pointer;
  }
</style>
