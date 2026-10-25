// 게임 진행 상태와 턴 처리. 모든 함수는 새 상태를 돌려주고 입력 상태는 바꾸지 않는다.

import {
  COLORS,
  applyPlacement,
  createBoard,
  hasAnyPlacement,
  hasPlacementForPiece,
  isValidPlacement,
  type Color,
} from './board'
import { generateExpansionSet } from './expansion'
import { PIECES, PIECE_IDS, normalize, shapeKey, type PieceId, type Shape } from './pieces'
import { createRng, randomInt } from './rng'

export type GameMode = 'classic' | 'allRandom' | 'expansion'
export type PlayerCount = 2 | 3 | 4
export type TimeLimit = 15 | 30 | 60

export interface GameOptions {
  timeLimit: TimeLimit | null
  hideRemaining: boolean
  allowUndo: boolean
}

export interface GameConfig {
  playerCount: PlayerCount
  playerNames: string[]
  mode: GameMode
  options: GameOptions
  seed: number
}

/** 색을 맡은 플레이어 번호. 3인일 때 초록은 세 사람이 번갈아 놓는 공용 색이다. */
export type ColorOwner = number | 'shared'

export function colorOwners(playerCount: PlayerCount): ColorOwner[] {
  if (playerCount === 4) return [0, 1, 2, 3]
  if (playerCount === 3) return [0, 1, 2, 'shared']
  // 2인: 마주 보는 색끼리(파랑+빨강, 노랑+초록)
  return [0, 1, 0, 1]
}

/** timeout: 시간 초과, blockedDraw: 올랜덤에서 뽑힌 조각을 놓을 수 없음, manual: 플레이어가 스스로 포기 */
export type PassReason = 'timeout' | 'blockedDraw' | 'manual'
export type OutReason = 'noMoves' | 'allPlaced'

export type GameEvent =
  | { type: 'place'; color: Color; player: number; pieceId: PieceId; cells: Shape }
  | { type: 'pass'; color: Color; player: number; reason: PassReason; pieceId?: PieceId }
  | { type: 'out'; color: Color; reason: OutReason }
  | { type: 'undo'; color: Color; player: number }
  | { type: 'gameOver' }

export interface GameState {
  config: GameConfig
  /** 각 색이 시작할 때 받은 조각들(클래식·올랜덤은 21개, 블럭 확장판은 뽑힌 19개) */
  pieceSet: PieceId[]
  board: number[]
  remaining: PieceId[][]
  /** 색별 마지막으로 놓은 조각. null이면 아직 첫 수 전 */
  lastPiece: (PieceId | null)[]
  out: boolean[]
  current: Color
  /** 3인 공용 색이 지금까지 받은 턴 수. 누가 놓을지 정한다 */
  sharedTurns: number
  /** 올랜덤 모드에서 이번 턴에 낼 조각 */
  drawn: PieceId | null
  rng: number
  /** 입력을 기다리는 턴마다 1씩 늘어나는 번호. 되돌리기 후에도 늘어나서 타이머 재시작 기준이 된다 */
  turnId: number
  log: GameEvent[]
  undo: UndoInfo | null
  over: boolean
}

export interface UndoInfo {
  color: Color
  player: number
  snapshot: GameState
}

export function ownerOf(state: GameState, color: Color): number {
  const owner = colorOwners(state.config.playerCount)[color]
  return owner === 'shared' ? state.sharedTurns % 3 : owner
}

export function currentPlayer(state: GameState): number {
  return ownerOf(state, state.current)
}

export function createGame(config: GameConfig): GameState {
  const rng = createRng(config.seed)
  const pieceSet = config.mode === 'expansion' ? generateExpansionSet(rng) : [...PIECE_IDS]
  const state: GameState = {
    config,
    pieceSet,
    board: createBoard(),
    remaining: COLORS.map(() => [...pieceSet]),
    lastPiece: COLORS.map(() => null),
    out: COLORS.map(() => false),
    current: 0,
    sharedTurns: 0,
    drawn: null,
    rng: rng.state,
    turnId: 0,
    log: [],
    undo: null,
    over: false,
  }
  startTurn(state)
  return state
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: [...state.board],
    remaining: state.remaining.map((r) => [...r]),
    lastPiece: [...state.lastPiece],
    out: [...state.out],
    log: [...state.log],
  }
}

function endTurn(s: GameState) {
  if (colorOwners(s.config.playerCount)[s.current] === 'shared') s.sharedTurns++
  s.current = ((s.current + 1) % 4) as Color
  s.drawn = null
}

/**
 * 입력을 기다릴 수 있는 색이 나올 때까지 턴을 진행한다(s를 직접 바꾼다).
 * 놓을 수 없는 색은 탈락시키고, 올랜덤에서 뽑힌 조각을 놓을 수 없으면 패스한다.
 */
function startTurn(s: GameState) {
  for (let guard = 0; guard < 10000; guard++) {
    if (s.out.every(Boolean)) {
      s.over = true
      s.drawn = null
      s.log.push({ type: 'gameOver' })
      return
    }
    const color = s.current
    if (s.out[color]) {
      s.current = ((color + 1) % 4) as Color
      continue
    }
    const isFirst = s.lastPiece[color] === null
    if (!hasAnyPlacement(s.board, color, s.remaining[color], isFirst)) {
      s.out[color] = true
      s.log.push({ type: 'out', color, reason: 'noMoves' })
      endTurn(s)
      continue
    }
    if (s.config.mode === 'allRandom') {
      const [index, rng] = randomInt(s.rng, s.remaining[color].length)
      s.rng = rng
      const pieceId = s.remaining[color][index]
      if (!hasPlacementForPiece(s.board, color, pieceId, isFirst)) {
        s.log.push({ type: 'pass', color, player: ownerOf(s, color), reason: 'blockedDraw', pieceId })
        endTurn(s)
        continue
      }
      s.drawn = pieceId
    }
    s.turnId++
    return
  }
  throw new Error('턴 진행이 끝나지 않습니다')
}

/** 지금 차례인 색이 이 조각을 이 칸들에 놓을 수 있는지. cells는 보드 절대 좌표. */
export function canPlace(state: GameState, pieceId: PieceId, cells: Shape): boolean {
  if (state.over) return false
  const color = state.current
  if (!state.remaining[color].includes(pieceId)) return false
  if (state.config.mode === 'allRandom' && state.drawn !== pieceId) return false
  const key = shapeKey(normalize(cells))
  if (!PIECES[pieceId].orientations.some((o) => shapeKey(o) === key)) return false
  return isValidPlacement(state.board, color, cells, state.lastPiece[color] === null)
}

export function place(state: GameState, pieceId: PieceId, cells: Shape): GameState {
  if (!canPlace(state, pieceId, cells)) throw new Error(`놓을 수 없는 수입니다: ${pieceId}`)
  const color = state.current
  const player = currentPlayer(state)
  const s = cloneState(state)
  s.board = applyPlacement(s.board, color, cells)
  s.remaining[color] = s.remaining[color].filter((id) => id !== pieceId)
  s.lastPiece[color] = pieceId
  // 호출자가 좌표 배열을 재사용해도 기록이 바뀌지 않게 복사해 둔다
  s.log.push({ type: 'place', color, player, pieceId, cells: cells.map(([x, y]) => [x, y] as const) })
  if (s.remaining[color].length === 0) {
    s.out[color] = true
    s.log.push({ type: 'out', color, reason: 'allPlaced' })
  }
  s.undo = state.config.options.allowUndo ? { color, player, snapshot: { ...state, undo: null } } : null
  endTurn(s)
  startTurn(s)
  return s
}

/** 시간 초과나 포기로 이번 턴을 넘긴다. 되돌리기 기회는 유지된다(다음 배치 전까지). */
export function passTurn(state: GameState, reason: PassReason = 'timeout'): GameState {
  if (state.over) return state
  const s = cloneState(state)
  s.log.push({ type: 'pass', color: s.current, player: currentPlayer(s), reason })
  endTurn(s)
  startTurn(s)
  return s
}

/** 되돌릴 수 있는 마지막 배치. 다음 배치가 일어나면 사라진다. */
export function undoTarget(state: GameState): { color: Color; player: number } | null {
  return state.undo ? { color: state.undo.color, player: state.undo.player } : null
}

/** 마지막 배치 직전으로 돌아가 그 색의 차례로 되돌린다. 올랜덤에서 뽑힌 조각도 그대로 복원된다. */
export function undo(state: GameState): GameState {
  if (!state.undo) return state
  const { color, player, snapshot } = state.undo
  const s = cloneState(snapshot)
  s.undo = null
  s.turnId = state.turnId + 1
  s.log.push({ type: 'undo', color, player })
  return s
}
