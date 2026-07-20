export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Position {
	row: number;
	col: number;
}

export interface MoveResult {
	board: number[][];
	moved: boolean;
	scoreGained: number;
	merged: Position[];
}

const SIZE = 4;
const EMPTY = 0;

export function createEmptyBoard(size: number = SIZE): number[][] {
	return Array.from({ length: size }, () => Array<number>(size).fill(EMPTY));
}

function cloneBoard(board: number[][]): number[][] {
	return board.map((row) => [...row]);
}

export function getEmptyCells(board: number[][]): Position[] {
	const cells: Position[] = [];
	for (let row = 0; row < board.length; row++) {
		for (let col = 0; col < board[row].length; col++) {
			if (board[row][col] === EMPTY) {
				cells.push({ row, col });
			}
		}
	}
	return cells;
}

export function spawnTile(board: number[][]): Position | null {
	const empty = getEmptyCells(board);
	if (empty.length === 0) return null;
	const { row, col } = empty[Math.floor(Math.random() * empty.length)];
	board[row][col] = Math.random() < 0.9 ? 2 : 4;
	return { row, col };
}

export function createInitialBoard(size: number = SIZE): number[][] {
	const board = createEmptyBoard(size);
	spawnTile(board);
	spawnTile(board);
	return board;
}

function rotateLeft(board: number[][]): number[][] {
	const n = board.length;
	const rotated: number[][] = createEmptyBoard(n);
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			rotated[n - 1 - col][row] = board[row][col];
		}
	}
	return rotated;
}

function slideAndMergeRow(row: number[]): {
	row: number[];
	scoreGained: number;
	mergedCols: number[];
} {
	const size = row.length;
	const filtered = row.filter((v) => v !== EMPTY);
	const result: number[] = [];
	let scoreGained = 0;
	const mergedCols: number[] = [];
	let i = 0;
	let outCol = 0;
	while (i < filtered.length) {
		if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
			const merged = filtered[i] * 2;
			result.push(merged);
			scoreGained += merged;
			mergedCols.push(outCol);
			i += 2;
		} else {
			result.push(filtered[i]);
			i += 1;
		}
		outCol++;
	}
	while (result.length < size) result.push(EMPTY);
	return { row: result, scoreGained, mergedCols };
}

function rotateCount(direction: Direction): number {
	switch (direction) {
		case 'left':
			return 0;
		case 'up':
			return 1;
		case 'right':
			return 2;
		case 'down':
			return 3;
	}
}

export function move(board: number[][], direction: Direction): MoveResult {
	const n = board.length;
	const rotations = rotateCount(direction);

	let working = cloneBoard(board);
	for (let r = 0; r < rotations; r++) {
		working = rotateLeft(working);
	}

	let scoreGained = 0;
	const mergedWorking: Position[] = [];
	const newWorking: number[][] = createEmptyBoard(n);
	for (let row = 0; row < n; row++) {
		const { row: slid, scoreGained: gained, mergedCols } = slideAndMergeRow(
			working[row]
		);
		newWorking[row] = slid;
		scoreGained += gained;
		for (const col of mergedCols) {
			mergedWorking.push({ row, col });
		}
	}

	let newBoard = newWorking;
	for (let r = 0; r < (4 - rotations) % 4; r++) {
		newBoard = rotateLeft(newBoard);
	}

	const moved = !boardsEqual(board, newBoard);

	const totalRotations = (4 - rotations) % 4;
	const merged = mergedWorking.map((p) => {
		let { row, col } = p;
		for (let r = 0; r < totalRotations; r++) {
			const next = rotateLeftPosition(row, col, n);
			row = next.row;
			col = next.col;
		}
		return { row, col };
	});

	return { board: newBoard, moved, scoreGained, merged };
}

function rotateLeftPosition(row: number, col: number, n: number): Position {
	return { row: n - 1 - col, col: row };
}

function boardsEqual(a: number[][], b: number[][]): boolean {
	for (let row = 0; row < a.length; row++) {
		for (let col = 0; col < a[row].length; col++) {
			if (a[row][col] !== b[row][col]) return false;
		}
	}
	return true;
}

export function hasMoves(board: number[][]): boolean {
	if (getEmptyCells(board).length > 0) return true;
	const n = board.length;
	for (let row = 0; row < n; row++) {
		for (let col = 0; col < n; col++) {
			const value = board[row][col];
			if (col + 1 < n && board[row][col + 1] === value) return true;
			if (row + 1 < n && board[row + 1][col] === value) return true;
		}
	}
	return false;
}

export function getHighestTile(board: number[][]): number {
	let max = 0;
	for (const row of board) {
		for (const value of row) {
			if (value > max) max = value;
		}
	}
	return max;
}

export function isWin(board: number[][], target: number = 2048): boolean {
	return getHighestTile(board) >= target;
}
