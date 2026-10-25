// 색 하나의 플레이어 영역. 차례인 영역은 캐러셀과 조작 버튼을 펼치고, 아닌 영역은 남은 조각만 작게 보인다.

import { colorOwners, ownerOf, PIECES, placedCells, type Color } from '../engine'
import type { GameController } from '../game/useGameController'
import { Carousel } from './Carousel'
import { ChevronLeftIcon, ChevronRightIcon, FlipIcon, RotateIcon, UndoIcon } from './icons'
import { PALETTE } from './palette'
import { PieceIcon } from './Plastic'
import { TimerRing } from './TimerRing'

export type PanelMode = 'active' | 'normal' | 'collapsed'

interface Props {
  game: GameController
  color: Color
  mode: PanelMode
  carouselCell: number
  onDragStart: (e: React.PointerEvent) => void
}

export function PlayerPanel({ game, color, mode, carouselCell, onDragStart }: Props) {
  const { state } = game
  const { config } = state
  const tone = PALETTE[color]
  const active = mode === 'active'
  const shared = colorOwners(config.playerCount)[color] === 'shared'
  const owner = ownerOf(state, color)
  const hidden = config.options.hideRemaining && !state.over
  const showPieces = !hidden || active
  const finished = state.out[color]

  // 2인은 두 색을 합친 플레이어 점수, 3인 공용 색은 그 색이 놓은 칸 수
  const ownColors = shared ? [color] : ([0, 1, 2, 3] as Color[]).filter((c) => colorOwners(config.playerCount)[c] === owner)
  const score = ownColors.reduce<number>((sum, c) => sum + placedCells(state, c), 0)

  const undoTarget = state.undo
  const canUndo = config.options.allowUndo && undoTarget?.color === color && !state.over

  return (
    <section className={`panel panel-${mode}${finished ? ' panel-out' : ''}`} style={{ '--tone': tone.accent, '--panel': tone.panel } as React.CSSProperties}>
      <header className="panel-head">
        <span className="swatch" style={{ background: tone.base }} />
        <div className="panel-id">
          <div className="panel-name">
            {shared ? `공용 · ${config.playerNames[owner]}` : config.playerNames[owner]}
            {finished && <span className="badge">{state.remaining[color].length === 0 ? '완주' : '종료'}</span>}
          </div>
          <div className="panel-score">{hidden ? '—' : score}</div>
        </div>
        <div className="panel-actions">
          {active && config.options.timeLimit && (
            <TimerRing key={state.turnId} seconds={config.options.timeLimit} color={tone.accent} running={!state.over} onExpire={game.timeout} size={carouselCell < 34 ? 40 : 44} />
          )}
          {config.options.allowUndo && (
            <button className="icon-btn" disabled={!canUndo} onClick={game.undoLast} aria-label="되돌리기" title="되돌리기">
              <UndoIcon />
            </button>
          )}
        </div>
      </header>

      {active && (
        <>
          <Carousel
            choices={game.choices}
            index={game.index}
            color={color}
            centerShape={game.shape}
            cellSize={carouselCell}
            onStep={game.step}
            onDragStart={onDragStart}
          />
          <div className="controls">
            {game.choices.length > 1 && (
              <button className="round-btn" onClick={() => game.step(-1)} aria-label="이전 조각">
                <ChevronLeftIcon />
              </button>
            )}
            <button className="tool-btn" onClick={game.rotate} aria-label="회전" title="회전 (R)">
              <RotateIcon />
            </button>
            <button className="tool-btn" onClick={game.flip} aria-label="뒤집기" title="뒤집기 (F)">
              <FlipIcon />
            </button>
            {game.choices.length > 1 && (
              <button className="round-btn" onClick={() => game.step(1)} aria-label="다음 조각">
                <ChevronRightIcon />
              </button>
            )}
          </div>
          {state.drawn && <p className="hint">이번 턴에 낼 조각이 정해졌습니다</p>}
        </>
      )}

      <div className="tray">
        {showPieces ? (
          state.remaining[color].map((id) => (
            <button
              key={id}
              className={`tray-piece${active && id === game.selected ? ' selected' : ''}`}
              disabled={!active || !!state.drawn}
              onClick={() => game.select(id)}
              aria-label={id}
            >
              <PieceIcon shape={PIECES[id].shape} color={color} cellSize={mode === 'collapsed' ? 7 : carouselCell < 34 ? 8 : 10} />
            </button>
          ))
        ) : (
          <span className="tray-hidden">남은 조각은 자기 차례에만 보입니다</span>
        )}
      </div>
    </section>
  )
}
