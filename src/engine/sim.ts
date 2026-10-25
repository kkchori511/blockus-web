// 시뮬레이션용 자동 플레이어. 테스트와 scripts/simulate.ts에서 쓴다.

import { allPlacements, type Placement } from './board'
import { createGame, place, type GameConfig, type GameState } from './game'
import { PIECES } from './pieces'
import type { Rng } from './rng'

export type Policy = 'random' | 'bigFirst'

/** random: 가능한 수 중 무작위. bigFirst: 가장 큰 조각의 수 중 무작위(사람의 일반적인 전략에 가까움). */
export function chooseMove(state: GameState, policy: Policy, rng: Rng): Placement | null {
  const color = state.current
  const pieces = state.drawn ? [state.drawn] : state.remaining[color]
  let moves = allPlacements(state.board, color, pieces, state.lastPiece[color] === null)
  if (moves.length === 0) return null
  if (policy === 'bigFirst') {
    const maxSize = Math.max(...moves.map((m) => PIECES[m.pieceId].size))
    moves = moves.filter((m) => PIECES[m.pieceId].size === maxSize)
  }
  return moves[rng.int(moves.length)]
}

export function playOut(config: GameConfig, policy: Policy, rng: Rng): { state: GameState; turns: number } {
  let state = createGame(config)
  let turns = 0
  while (!state.over) {
    const move = chooseMove(state, policy, rng)
    if (!move) throw new Error('입력 대기 중인데 둘 수 있는 수가 없습니다')
    state = place(state, move.pieceId, move.cells)
    turns++
  }
  return { state, turns }
}
