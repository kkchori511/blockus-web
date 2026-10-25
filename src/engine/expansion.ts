// '블럭 확장판' 모드: 6칸 조각 4개를 반드시 넣고, 클래식에서 Y5와 5칸 4개·4칸 1개(무작위)를 빼서
// 19개·84칸으로 맞춘다. 모든 색이 같은 세트로 시작한다.
// Y5는 긴 T자(T6)·엇갈린 T6(S6)에서 한 칸만 뺀 모양이라 헷갈리지 않게 항상 뺀다.
// 1~3칸 조각은 막판에 틈을 메우는 역할이라 항상 남긴다. 시뮬레이션에서 판 채움이 클래식과 비슷했다(68.5% 대 69.5%).

import { ALL_PIECE_IDS, HEX_PIECE_IDS, PIECES, PIECE_IDS, type PieceId } from './pieces'
import type { Rng } from './rng'

/** 6칸 조각과 닮아 항상 빼는 조각 */
const ALWAYS_DROPPED: PieceId[] = ['Y5']
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
  const candidates = PIECE_IDS.filter((id) => !ALWAYS_DROPPED.includes(id))
  const dropped = new Set<PieceId>([
    ...ALWAYS_DROPPED,
    ...Object.entries(DROP).flatMap(([size, count]) => pick(rng, candidates.filter((id) => PIECES[id].size === Number(size)), count)),
  ])
  const set: PieceId[] = [...PIECE_IDS.filter((id) => !dropped.has(id)), ...HEX_PIECE_IDS]
  return set.sort((a, b) => ALL_PIECE_IDS.indexOf(a) - ALL_PIECE_IDS.indexOf(b))
}
