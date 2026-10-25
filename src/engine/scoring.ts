// 점수 계산.
// 게임 중에는 놓은 칸 수를 양수로 보여 주고, 끝나면 공식(고급) 점수로 계산한다.

import { COLORS, type Color } from './board'
import { colorOwners, type GameState } from './game'
import { cellCount } from './pieces'

export const ALL_PLACED_BONUS = 15
export const MONOMINO_LAST_BONUS = 5

export function placedCells(state: GameState, color: Color): number {
  return cellCount(state.pieceSet) - cellCount(state.remaining[color])
}

/** 남은 칸마다 −1, 전부 놓으면 +15, 마지막 조각이 1칸짜리면 추가 +5 */
export function finalColorScore(state: GameState, color: Color): number {
  const remaining = state.remaining[color]
  if (remaining.length > 0) return -cellCount(remaining)
  return ALL_PLACED_BONUS + (state.lastPiece[color] === 'I1' ? MONOMINO_LAST_BONUS : 0)
}

export interface PlayerScore {
  player: number
  name: string
  colors: Color[]
  placed: number
  final: number
  rank: number
}

/** 플레이어별 점수. 2인은 두 색 합산, 3인 공용 색은 누구 점수에도 넣지 않는다. */
export function playerScores(state: GameState): PlayerScore[] {
  const owners = colorOwners(state.config.playerCount)
  const scores: PlayerScore[] = state.config.playerNames.slice(0, state.config.playerCount).map((name, player) => {
    const colors = COLORS.filter((c) => owners[c] === player)
    return {
      player,
      name,
      colors,
      placed: colors.reduce<number>((sum, c) => sum + placedCells(state, c), 0),
      final: colors.reduce<number>((sum, c) => sum + finalColorScore(state, c), 0),
      rank: 0,
    }
  })
  for (const s of scores) s.rank = 1 + scores.filter((o) => o.final > s.final).length
  return scores
}
