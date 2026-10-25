// 3단계 렌더링 확인용 화면: 시뮬레이션으로 만든 게임 중반 상태를 보드와 영역에 그린다.
// 4단계에서 실제 플레이어 영역·캐러셀로 바뀐다.

import { useMemo } from 'react'
import { createGame, createRng, PIECES, place, placedCells, type Color, type GameState } from './engine'
import { chooseMove } from './engine/sim'
import { Board, type BoardPreview } from './ui/Board'
import { PALETTE } from './ui/palette'
import { PieceIcon, PlasticDefs } from './ui/Plastic'

function demoState(moves: number): { state: GameState; preview: BoardPreview | null } {
  const rng = createRng(7)
  let state = createGame({
    playerCount: 4,
    playerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    mode: 'classic',
    options: { timeLimit: 30, hideRemaining: false, allowUndo: true },
    seed: 11,
  })
  for (let i = 0; i < moves && !state.over; i++) {
    const m = chooseMove(state, 'bigFirst', rng)!
    state = place(state, m.pieceId, m.cells)
  }
  const next = state.over ? null : chooseMove(state, 'bigFirst', rng)
  return { state, preview: next ? { color: state.current, cells: next.cells, valid: true } : null }
}

function Panel({ state, color }: { state: GameState; color: Color }) {
  const tone = PALETTE[color]
  return (
    <section className="panel" style={{ background: tone.panel, outlineColor: state.current === color ? tone.accent : 'transparent' }}>
      <header className="panel-head">
        <span className="swatch" style={{ background: tone.base }} />
        <div>
          <div className="panel-name">{state.config.playerNames[color]}</div>
          <div className="panel-score">{placedCells(state, color)}</div>
        </div>
      </header>
      <div className="tray">
        {state.remaining[color].map((id) => (
          <PieceIcon key={id} shape={PIECES[id].shape} color={color} cellSize={14} />
        ))}
      </div>
    </section>
  )
}

export default function App() {
  const moves = Number(new URLSearchParams(location.search).get('moves') ?? 32)
  const { state, preview } = useMemo(() => demoState(moves), [moves])
  return (
    <>
      <PlasticDefs />
      <main className="stage">
        <div className="side">
          <Panel state={state} color={0} />
          <Panel state={state} color={3} />
        </div>
        <div className="board-wrap">
          <Board state={state} preview={preview} />
        </div>
        <div className="side">
          <Panel state={state} color={1} />
          <Panel state={state} color={2} />
        </div>
      </main>
    </>
  )
}
