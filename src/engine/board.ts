// 보드 표현과 배치 규칙 판정.

import { PIECES, type PieceId, type Point, type Shape } from './pieces'

export const BOARD_SIZE = 20

/** 0 파랑, 1 노랑, 2 빨강, 3 초록. 턴 순서와 같고, 화면에서 시계 방향이다. */
export type Color = 0 | 1 | 2 | 3
export const COLORS: readonly Color[] = [0, 1, 2, 3]

export const EMPTY = -1
/** 길이 BOARD_SIZE²의 배열. 칸마다 EMPTY 또는 Color. 저장하기 쉽게 일반 배열을 쓴다. */
export type Board = readonly number[]

export function createBoard(): number[] {
  return new Array(BOARD_SIZE * BOARD_SIZE).fill(EMPTY)
}

/** 색별 시작 모서리: 파랑 좌상, 노랑 우상, 빨강 우하, 초록 좌하. */
export const START_CORNERS: Record<Color, Point> = {
  0: [0, 0],
  1: [BOARD_SIZE - 1, 0],
  2: [BOARD_SIZE - 1, BOARD_SIZE - 1],
  3: [0, BOARD_SIZE - 1],
}

const EDGE_DIRS: Point[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]
const DIAG_DIRS: Point[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
]

function inBounds(x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE
}

export function at(board: Board, x: number, y: number): number {
  return inBounds(x, y) ? board[y * BOARD_SIZE + x] : EMPTY
}

export interface Placement {
  pieceId: PieceId
  /** 보드 절대 좌표로 옮겨진 칸들 */
  cells: Shape
}

export function translate(shape: Shape, dx: number, dy: number): Shape {
  return shape.map(([x, y]) => [x + dx, y + dy] as Point)
}

/**
 * 규칙 검사. isFirst는 그 색이 아직 아무 조각도 놓지 않았는지.
 * - 모든 칸이 보드 안이고 비어 있어야 한다
 * - 같은 색과 변으로 맞닿으면 안 된다
 * - 첫 수는 시작 모서리를 덮어야 하고, 이후에는 같은 색과 꼭짓점으로 한 번 이상 맞닿아야 한다
 */
export function isValidPlacement(board: Board, color: Color, cells: Shape, isFirst: boolean): boolean {
  let touchesCorner = false
  const [cx, cy] = START_CORNERS[color]
  for (const [x, y] of cells) {
    if (!inBounds(x, y) || at(board, x, y) !== EMPTY) return false
    for (const [dx, dy] of EDGE_DIRS) if (at(board, x + dx, y + dy) === color) return false
    if (isFirst) {
      if (x === cx && y === cy) touchesCorner = true
    } else if (!touchesCorner) {
      for (const [dx, dy] of DIAG_DIRS) {
        if (at(board, x + dx, y + dy) === color) {
          touchesCorner = true
          break
        }
      }
    }
  }
  return touchesCorner
}

/** 이 색이 새 조각을 이어 붙일 수 있는 빈칸(대각선 연결점). 첫 수면 시작 모서리 하나. */
export function anchorCells(board: Board, color: Color, isFirst: boolean): Point[] {
  if (isFirst) {
    const [x, y] = START_CORNERS[color]
    return at(board, x, y) === EMPTY ? [START_CORNERS[color]] : []
  }
  const anchors: Point[] = []
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (at(board, x, y) !== EMPTY) continue
      if (EDGE_DIRS.some(([dx, dy]) => at(board, x + dx, y + dy) === color)) continue
      if (DIAG_DIRS.some(([dx, dy]) => at(board, x + dx, y + dy) === color)) anchors.push([x, y])
    }
  }
  return anchors
}

/**
 * 한 조각의 가능한 모든 배치. 각 연결점에 변형의 각 칸을 맞춰 보는 방식이라
 * 보드 전체를 훑는 것보다 훨씬 빠르다. limit을 주면 그만큼 찾으면 멈춘다.
 */
export function placementsForPiece(
  board: Board,
  color: Color,
  pieceId: PieceId,
  isFirst: boolean,
  anchors = anchorCells(board, color, isFirst),
  limit = Infinity,
): Placement[] {
  const result: Placement[] = []
  const seen = new Set<string>()
  PIECES[pieceId].orientations.forEach((orientation, oi) => {
    if (result.length >= limit) return
    for (const [ax, ay] of anchors) {
      for (const [px, py] of orientation) {
        const dx = ax - px
        const dy = ay - py
        const key = `${oi}:${dx},${dy}`
        if (seen.has(key)) continue
        seen.add(key)
        const cells = translate(orientation, dx, dy)
        if (isValidPlacement(board, color, cells, isFirst)) {
          result.push({ pieceId, cells })
          if (result.length >= limit) return
        }
      }
    }
  })
  return result
}

export function hasPlacementForPiece(board: Board, color: Color, pieceId: PieceId, isFirst: boolean, anchors?: Point[]): boolean {
  return placementsForPiece(board, color, pieceId, isFirst, anchors, 1).length > 0
}

export function hasAnyPlacement(board: Board, color: Color, pieceIds: readonly PieceId[], isFirst: boolean): boolean {
  const anchors = anchorCells(board, color, isFirst)
  if (anchors.length === 0) return false
  return pieceIds.some((id) => hasPlacementForPiece(board, color, id, isFirst, anchors))
}

export function allPlacements(board: Board, color: Color, pieceIds: readonly PieceId[], isFirst: boolean): Placement[] {
  const anchors = anchorCells(board, color, isFirst)
  return pieceIds.flatMap((id) => placementsForPiece(board, color, id, isFirst, anchors))
}

export function applyPlacement(board: Board, color: Color, cells: Shape): number[] {
  const next = [...board]
  for (const [x, y] of cells) next[y * BOARD_SIZE + x] = color
  return next
}
