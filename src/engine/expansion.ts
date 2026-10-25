// '블럭 확장판' 모드: 6칸 조각 4개를 반드시 넣고, 클래식에서 5칸 4개와 4칸 1개를 무작위로 빼서
// 총 89칸(클래식과 같음), 20개로 맞춘다. 모든 색이 같은 세트로 시작한다.
// 1~3칸 조각은 막판에 틈을 메우는 역할이라 항상 남긴다. 시뮬레이션에서 판 채움이 클래식과 같았다(69.7% 대 69.5%).

import { ALL_PIECE_IDS, HEX_PIECE_IDS, PIECES, PIECE_IDS, type PieceId } from './pieces'
import type { Rng } from './rng'

const DROP = { 5: 4, 4: 1 } as const

function pick<T>(rng: Rng, items: readonly T[], count: number): T[] {
  const pool = [...items]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function generateExpansionSet(rng: Rng): PieceId[] {
  const dropped = new Set<PieceId>(
    Object.entries(DROP).flatMap(([size, count]) => pick(rng, PIECE_IDS.filter((id) => PIECES[id].size === Number(size)), count)),
  )
  const set: PieceId[] = [...PIECE_IDS.filter((id) => !dropped.has(id)), ...HEX_PIECE_IDS]
  return set.sort((a, b) => ALL_PIECE_IDS.indexOf(a) - ALL_PIECE_IDS.indexOf(b))
}
