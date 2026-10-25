// '오늘의 세트' 모드: 모든 플레이어가 같은 랜덤 세트로 시작한다.
// 세트의 총 칸 수가 목표 범위 안에 들도록 뽑아 판마다 블럭 양이 크게 차이 나지 않게 한다.

import { PIECE_IDS, cellCount, type PieceId } from './pieces'
import type { Rng } from './rng'

export interface DailySetSpec {
  size: number
  minCells: number
  maxCells: number
}

// 시뮬레이션(scripts/simulate.ts)으로 정한 값. 16개는 평균 67.8칸이라 ±2칸을 목표로 한다.
// 자동 플레이어 기준 전부 놓는 비율이 약 24%이고, 사람은 이보다 높을 것으로 본다.
export const DEFAULT_DAILY_SET: DailySetSpec = { size: 16, minCells: 66, maxCells: 70 }

function sample(rng: Rng, size: number): PieceId[] {
  const pool = [...PIECE_IDS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, size)
}

/** 총 칸 수가 범위에 드는 세트가 나올 때까지 다시 뽑는다. 끝내 없으면 범위에 가장 가까운 세트를 쓴다. */
export function generateDailySet(rng: Rng, spec: DailySetSpec = DEFAULT_DAILY_SET): PieceId[] {
  const mid = (spec.minCells + spec.maxCells) / 2
  let best: PieceId[] = []
  let bestDistance = Infinity
  for (let attempt = 0; attempt < 500; attempt++) {
    const set = sample(rng, spec.size)
    const cells = cellCount(set)
    if (cells >= spec.minCells && cells <= spec.maxCells) return sortBySetOrder(set)
    const distance = Math.abs(cells - mid)
    if (distance < bestDistance) {
      best = set
      bestDistance = distance
    }
  }
  return sortBySetOrder(best)
}

function sortBySetOrder(set: PieceId[]): PieceId[] {
  return [...set].sort((a, b) => PIECE_IDS.indexOf(a) - PIECE_IDS.indexOf(b))
}
