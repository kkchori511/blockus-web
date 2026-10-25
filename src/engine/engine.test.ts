import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  ALL_PIECE_IDS,
  EMPTY,
  HEX_PIECE_IDS,
  PIECES,
  PIECE_IDS,
  TOTAL_CELLS,
  cellCount,
  colorOwners,
  createBoard,
  createGame,
  createRng,
  currentPlayer,
  finalColorScore,
  generateExpansionSet,
  isValidPlacement,
  passTurn,
  place,
  playerScores,
  translate,
  undo,
  undoTarget,
  type GameConfig,
  type GameState,
  type PieceId,
} from '.'
import { chooseMove, playOut } from './sim'

function config(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    playerCount: 4,
    playerNames: ['A', 'B', 'C', 'D'],
    mode: 'classic',
    options: { timeLimit: null, hideRemaining: false, allowUndo: false },
    seed: 1,
    ...overrides,
  }
}

const shape = (id: PieceId) => PIECES[id].orientations[0]

describe('조각', () => {
  it('21개, 총 89칸', () => {
    expect(PIECE_IDS).toHaveLength(21)
    expect(TOTAL_CELLS).toBe(89)
    const sizes = PIECE_IDS.map((id) => PIECES[id].size)
    expect([1, 2, 3, 4, 5].map((n) => sizes.filter((s) => s === n).length)).toEqual([1, 1, 2, 5, 12])
  })

  it('회전·뒤집기 변형은 모두 합쳐 91가지', () => {
    expect(PIECE_IDS.reduce((sum, id) => sum + PIECES[id].orientations.length, 0)).toBe(91)
    expect(PIECES.X5.orientations).toHaveLength(1)
    expect(PIECES.F5.orientations).toHaveLength(8)
  })

  it('확장판 6칸 조각 4개는 서로, 그리고 기존 조각과 모양이 겹치지 않는다', () => {
    expect(HEX_PIECE_IDS.every((id) => PIECES[id].size === 6)).toBe(true)
    const keys = ALL_PIECE_IDS.flatMap((id) => PIECES[id].orientations.map((o) => o.map(([x, y]) => `${x},${y}`).join(';')))
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('배치 규칙', () => {
  it('첫 수는 시작 모서리를 덮어야 한다', () => {
    const board = createBoard()
    expect(isValidPlacement(board, 0, translate(shape('I2'), 0, 0), true)).toBe(true)
    expect(isValidPlacement(board, 0, translate(shape('I2'), 1, 0), true)).toBe(false)
    expect(isValidPlacement(board, 2, translate(shape('I1'), BOARD_SIZE - 1, BOARD_SIZE - 1), true)).toBe(true)
  })

  it('같은 색과 변으로 닿으면 안 되고, 꼭짓점으로는 닿아야 한다', () => {
    const board = createBoard()
    board[0] = 0 // 파랑 (0,0)
    expect(isValidPlacement(board, 0, [[1, 1]], false)).toBe(true) // 대각선
    expect(isValidPlacement(board, 0, [[1, 0]], false)).toBe(false) // 변 접촉
    expect(isValidPlacement(board, 0, [[2, 2]], false)).toBe(false) // 연결 없음
  })

  it('다른 색과는 변으로 닿아도 된다', () => {
    const board = createBoard()
    board[0] = 0
    board[BOARD_SIZE + 2] = 1 // 노랑 (2,1)
    expect(isValidPlacement(board, 0, [[1, 1]], false)).toBe(true)
  })

  it('정수가 아닌 좌표는 거부한다', () => {
    const board = createBoard()
    board[0] = 0
    expect(isValidPlacement(board, 0, [[1.5, 0.975]], false)).toBe(false)
  })

  it('보드 밖이나 이미 찬 칸에는 놓을 수 없다', () => {
    const board = createBoard()
    board[0] = 0
    expect(isValidPlacement(board, 0, [[-1, 1]], false)).toBe(false)
    board[BOARD_SIZE + 1] = 1
    expect(isValidPlacement(board, 0, [[1, 1]], false)).toBe(false)
  })
})

describe('인원별 색 배정', () => {
  it('2인은 마주 보는 두 색, 3인은 초록 공용', () => {
    expect(colorOwners(2)).toEqual([0, 1, 0, 1])
    expect(colorOwners(3)).toEqual([0, 1, 2, 'shared'])
  })

  it('3인 공용 색은 세 사람이 번갈아 맡는다', () => {
    let state = createGame(config({ playerCount: 3, playerNames: ['A', 'B', 'C'] }))
    const rng = createRng(3)
    const sharedPlayers: number[] = []
    while (sharedPlayers.length < 3) {
      if (state.current === 3) sharedPlayers.push(currentPlayer(state))
      const move = chooseMove(state, 'bigFirst', rng)!
      state = place(state, move.pieceId, move.cells)
    }
    expect(sharedPlayers).toEqual([0, 1, 2])
  })
})

describe('턴 진행', () => {
  it('시간 초과 패스는 다음 색으로 넘어간다', () => {
    const state = passTurn(createGame(config()))
    expect(state.current).toBe(1)
    expect(state.log.at(-1)).toMatchObject({ type: 'pass', reason: 'timeout', color: 0 })
  })

  it('스스로 포기한 패스도 다음 색으로 넘어가고 기록이 남는다', () => {
    const state = passTurn(createGame(config()), 'manual')
    expect(state.current).toBe(1)
    expect(state.out[0]).toBe(false)
    expect(state.log.at(-1)).toMatchObject({ type: 'pass', reason: 'manual', color: 0 })
  })

  it('배치 후 넘긴 좌표 배열을 바꿔도 기록은 그대로다', () => {
    const cells: [number, number][] = [
      [0, 0],
      [1, 0],
    ]
    const state = place(createGame(config()), 'I2', cells)
    cells[0][0] = 10
    expect(state.log.find((e) => e.type === 'place')).toMatchObject({ cells: [[0, 0], [1, 0]] })
  })

  it('놓을 수 없는 수는 거부한다', () => {
    const state = createGame(config())
    expect(() => place(state, 'I2', translate(shape('I2'), 5, 5))).toThrow()
  })

  it('전체 게임이 끝까지 진행된다(2·3·4인, 세 모드)', () => {
    for (const playerCount of [2, 3, 4] as const) {
      for (const mode of ['classic', 'allRandom', 'expansion'] as const) {
        const { state } = playOut(config({ playerCount, mode, seed: playerCount * 10 }), 'bigFirst', createRng(playerCount))
        expect(state.over).toBe(true)
        expect(state.out.every(Boolean)).toBe(true)
        const filled = state.board.filter((c) => c !== EMPTY).length
        const placed = [0, 1, 2, 3].reduce((sum, c) => sum + cellCount(state.pieceSet) - cellCount(state.remaining[c]), 0)
        expect(filled).toBe(placed)
      }
    }
  })
})

describe('되돌리기', () => {
  const withUndo = config({ options: { timeLimit: null, hideRemaining: false, allowUndo: true } })

  it('방금 놓은 수를 취소하면 그 색의 차례로 돌아간다', () => {
    const start = createGame(withUndo)
    const rng = createRng(5)
    const move = chooseMove(start, 'bigFirst', rng)!
    const after = place(start, move.pieceId, move.cells)
    expect(undoTarget(after)).toEqual({ color: 0, player: 0 })
    const back = undo(after)
    expect(back.current).toBe(0)
    expect(back.board).toEqual(start.board)
    expect(back.remaining[0]).toEqual(start.remaining[0])
    expect(back.turnId).toBeGreaterThan(after.turnId)
  })

  it('다음 사람이 패스해도 유지되고, 다음 사람이 놓으면 사라진다', () => {
    const rng = createRng(6)
    let state = createGame(withUndo)
    const m = chooseMove(state, 'bigFirst', rng)!
    state = place(state, m.pieceId, m.cells)
    expect(undoTarget(passTurn(state))).not.toBeNull()
    const m2 = chooseMove(state, 'bigFirst', rng)!
    expect(undoTarget(place(state, m2.pieceId, m2.cells))?.color).toBe(1)
  })

  it('옵션이 꺼져 있으면 되돌릴 수 없다', () => {
    const state = createGame(config())
    const m = chooseMove(state, 'bigFirst', createRng(1))!
    expect(undoTarget(place(state, m.pieceId, m.cells))).toBeNull()
  })

  it('올랜덤에서 되돌려도 같은 조각이 뽑힌 상태로 복원된다', () => {
    const start = createGame({ ...withUndo, mode: 'allRandom' })
    const drawn = start.drawn
    const m = chooseMove(start, 'random', createRng(2))!
    expect(m.pieceId).toBe(drawn)
    expect(undo(place(start, m.pieceId, m.cells)).drawn).toBe(drawn)
  })
})

describe('올랜덤', () => {
  it('뽑힌 조각 외에는 놓을 수 없다', () => {
    const state = createGame(config({ mode: 'allRandom', seed: 42 }))
    const other = PIECE_IDS.find((id) => id !== state.drawn)!
    expect(() => place(state, other, translate(shape(other), 0, 0))).toThrow()
  })

  it('같은 시드면 같은 순서로 뽑힌다', () => {
    expect(createGame(config({ mode: 'allRandom', seed: 9 })).drawn).toBe(createGame(config({ mode: 'allRandom', seed: 9 })).drawn)
  })
})

describe('블럭 확장판', () => {
  it('6칸 4개를 반드시 넣고 1~3칸은 남기며, 20개·89칸으로 맞추고 모든 색이 같은 세트를 받는다', () => {
    for (let seed = 0; seed < 50; seed++) {
      const set = generateExpansionSet(createRng(seed))
      expect(new Set(set).size).toBe(20)
      expect(cellCount(set)).toBe(TOTAL_CELLS)
      expect(HEX_PIECE_IDS.every((id) => set.includes(id))).toBe(true)
      expect(['I1', 'I2', 'I3', 'V3'].every((id) => set.includes(id as PieceId))).toBe(true)
      expect(set.filter((id) => PIECES[id].size === 5)).toHaveLength(8)
      expect(set.filter((id) => PIECES[id].size === 4)).toHaveLength(4)
    }
    const state = createGame(config({ mode: 'expansion' }))
    expect(state.remaining.every((r) => r.join() === state.pieceSet.join())).toBe(true)
  })
})

describe('점수', () => {
  function finished(remaining: PieceId[][], lastPiece: (PieceId | null)[], playerCount: 2 | 3 | 4 = 4): GameState {
    const state = createGame(config({ playerCount, playerNames: ['A', 'B', 'C', 'D'].slice(0, playerCount) }))
    return { ...state, remaining, lastPiece }
  }

  it('남은 칸 −1, 전부 놓으면 +15, 마지막이 1칸이면 +5 추가', () => {
    const state = finished([['I5', 'I2'], [], [], ['I1']], ['V3', 'I1', 'X5', 'L5'])
    expect(finalColorScore(state, 0)).toBe(-7)
    expect(finalColorScore(state, 1)).toBe(20)
    expect(finalColorScore(state, 2)).toBe(15)
    expect(finalColorScore(state, 3)).toBe(-1)
  })

  it('2인은 두 색 합산, 3인 공용 색은 제외', () => {
    const two = playerScores(finished([['I5'], [], ['I2'], []], ['I1', 'I1', 'I1', 'X5'], 2))
    expect(two.map((s) => s.final)).toEqual([-7, 35])
    expect(two.map((s) => s.rank)).toEqual([2, 1])
    const three = playerScores(finished([[], [], [], ['I5']], ['X5', 'X5', 'X5', 'I1'], 3))
    expect(three.map((s) => s.final)).toEqual([15, 15, 15])
    expect(three.every((s) => s.rank === 1)).toBe(true)
  })
})
