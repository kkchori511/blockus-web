// 모드별 밀도(놓은 칸, 판 채움) 비교 시뮬레이션.
// 사용: npm run simulate -- [판 수]

import { cellCount, createRng, type GameConfig, type PlayerCount } from '../src/engine'
import { playOut, type Policy } from '../src/engine/sim'

const GAMES = Number(process.argv[2] ?? 300)

interface Stats {
  placedCells: number
  placedPieces: number
  allPlacedRate: number
  turns: number
}

function run(playerCount: PlayerCount, policy: Policy, extra: Partial<GameConfig> = {}): Stats {
  const rng = createRng(1234)
  let placedCells = 0
  let placedPieces = 0
  let allPlaced = 0
  let turns = 0
  for (let g = 0; g < GAMES; g++) {
    const { state, turns: t } = playOut(
      {
        playerCount,
        playerNames: ['A', 'B', 'C', 'D'],
        mode: 'classic',
        options: { timeLimit: null, hideRemaining: false, allowUndo: false },
        seed: g * 7919 + 1,
        ...extra,
      },
      policy,
      rng,
    )
    turns += t
    for (let c = 0; c < 4; c++) {
      placedCells += cellCount(state.pieceSet) - cellCount(state.remaining[c])
      placedPieces += state.pieceSet.length - state.remaining[c].length
      if (state.remaining[c].length === 0) allPlaced++
    }
  }
  return {
    placedCells: placedCells / (GAMES * 4),
    placedPieces: placedPieces / (GAMES * 4),
    allPlacedRate: allPlaced / (GAMES * 4),
    turns: turns / GAMES,
  }
}

const f1 = (n: number) => n.toFixed(1)
const pct = (n: number) => `${(n * 100).toFixed(0)}%`

console.log(`판 수: ${GAMES} (조건마다)\n`)

// 인원수는 색 배정만 바꾸고 보드 진행은 같으므로 4색 기준으로 한 번만 돌린다
console.log('## 클래식 (색 하나 기준 평균, 전체 21개 / 89칸)')
console.log('정책 | 놓은 칸 | 놓은 조각 | 전부 놓은 비율 | 판당 배치 수')
for (const policy of ['bigFirst', 'random'] as const) {
  const s = run(4, policy)
  console.log(`${policy} | ${f1(s.placedCells)} | ${f1(s.placedPieces)} | ${pct(s.allPlacedRate)} | ${f1(s.turns)}`)
}

console.log('\n## 블럭 확장판 (6칸 4개 + 클래식 16개 = 20개 / 89칸)')
console.log('정책 | 놓은 칸 | 놓은 조각 | 전부 놓은 비율 | 판당 배치 수')
for (const policy of ['bigFirst', 'random'] as const) {
  const s = run(4, policy, { mode: 'expansion' })
  console.log(`${policy} | ${f1(s.placedCells)} | ${f1(s.placedPieces)} | ${pct(s.allPlacedRate)} | ${f1(s.turns)}`)
}

console.log('\n## 올랜덤 (4인, 참고)')
const ar = run(4, 'random', { mode: 'allRandom' })
console.log(`놓은 칸 ${f1(ar.placedCells)} / 놓은 조각 ${f1(ar.placedPieces)} / 전부 놓은 비율 ${pct(ar.allPlacedRate)} / 판당 배치 수 ${f1(ar.turns)}`)

