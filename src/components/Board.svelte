<script lang="ts">
	import Tile from './Tile.svelte';
	import type { Direction } from '../game/game';

	/** Props accepted by the Board component. */
	interface Props {
		/** Current tile values as a 2-D array. */
		board: number[][];
		/** Board side length (also used for grid-template CSS variables). */
		size: number;
		/** Whether the player has reached the win condition. */
		won?: boolean;
		/** Whether the game has no remaining moves. */
		over?: boolean;
		/** Whether the player has chosen to continue after winning. */
		keepPlaying?: boolean;
		/** Fired when the board receives a move input (keyboard, button, swipe). */
		onmove?: (direction: Direction) => void;
		/** Fired when the player chooses to keep playing after winning. */
		oncontinue?: () => void;
		/** Fired when the player starts a new game. */
		onnewgame?: () => void;
	}

	let {
		board,
		size,
		won = false,
		over = false,
		keepPlaying = false,
		onmove,
		oncontinue,
		onnewgame,
	}: Props = $props();

	/** Derived state: show the win overlay only while the player hasn't chosen to continue. */
	const showWin = $derived(won && !keepPlaying);
	/** Derived state: show overlay for either win or loss. */
	const showOverlay = $derived(showWin || over);

	// Local gesture state for touch swipe detection. These do not need to be reactive
	// ($state) because they are only consumed within a single gesture lifecycle and are
	// reset on every new touchstart.
	let touchStartX = 0;
	let touchStartY = 0;

	/**
	 * Capture the initial touch coordinates so the end handler can compute the swipe
	 * vector. Storing them in closure-scoped variables is safer than trusting event order
	 * on mobile browsers, which sometimes fire intermediate touchmove events.
	 *
	 * @param e - The native touchstart event.
	 */
	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	/**
	 * Compute the swipe vector from press to release and fire the appropriate move.
	 *
	 * 24 px dead-zone avoids registering tiny finger jitters as moves. The axis with the
	 * larger absolute delta wins; ambiguous diagonals default to the dominant axis rather
	 * than arbitrary up/down, which reduces accidental inputs.
	 *
	 * @param e - The native touchend event.
	 */
	function onTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
		if (Math.abs(dx) > Math.abs(dy)) {
			onmove?.(dx > 0 ? 'right' : 'left');
		} else {
			onmove?.(dy > 0 ? 'down' : 'up');
		}
	}
</script>

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
					<Tile value={value} row={r} col={c} />
				{/if}
			{/each}
		{/each}
	</div>

	{#if showOverlay}
		<div class="overlay" class:win={showWin} class:lose={over}>
			<div class="overlay-text">
				{#if showWin}
					<h2>You win!</h2>
					<div class="overlay-actions">
						<button type="button" onclick={() => oncontinue?.()}>Keep going</button>
						<button type="button" onclick={() => onnewgame?.()}>New Game</button>
					</div>
				{:else if over}
					<h2>Game over</h2>
					<div class="overlay-actions">
						<button type="button" onclick={() => onnewgame?.()}>Try again</button>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.board {
		position: relative;
		background: var(--board-bg);
		border-radius: 10px;
		padding: calc(var(--gap) * 1);
		--gap: 12px;
		aspect-ratio: 1 / 1;
		/* Prevent mobile browser gestures (scroll/zoom) from interfering with swipes. */
		touch-action: none;
		user-select: none;
	}

	.grid-background,
	.tiles {
		position: absolute;
		inset: var(--gap);
		display: grid;
		grid-template-columns: repeat(var(--size), 1fr);
		grid-template-rows: repeat(var(--size), 1fr);
		gap: var(--gap);
	}

	.grid-background .cell {
		background: var(--cell-bg);
		border-radius: 6px;
	}

	.overlay {
		position: absolute;
		inset: 0;
		border-radius: 10px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--overlay);

		&.win {
			background: var(--overlay-win);
		}
		&.lose {
			background: var(--overlay);
		}
	}

	.overlay-text {
		text-align: center;
		h2 {
			margin: 0 0 16px;
			font-size: 40px;
			color: var(--tile-text);
			font-weight: 800;
		}
	}

	.overlay-actions {
		display: flex;
		gap: 8px;
		justify-content: center;
	}

	.overlay-actions button {
		background: var(--btn-bg);
		color: var(--btn-text);
		border: none;
		border-radius: 6px;
		padding: 10px 18px;
		font-size: 15px;
		font-weight: 700;
		cursor: pointer;
		transition: background 0.2s;

		&:hover {
			background: var(--btn-bg-hover);
		}
	}
</style>
