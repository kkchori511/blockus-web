// 게임 종료 결과: 승자, 순위, 색별 남은 칸과 보너스 내역.

import { ALL_PLACED_BONUS, cellCount, colorOwners, MONOMINO_LAST_BONUS, playerScores, type Color, type GameState } from '../engine'
import { PALETTE } from './palette'

interface Props {
  state: GameState
  onRestart: () => void
  onExit?: () => void
  onViewBoard: () => void
}

export function ResultDialog({ state, onRestart, onExit, onViewBoard }: Props) {
  const scores = playerScores(state).sort((a, b) => a.rank - b.rank || a.player - b.player)
  const winners = scores.filter((s) => s.rank === 1)
  const shared = colorOwners(state.config.playerCount).indexOf('shared') as Color | -1

  return (
    <div className="overlay">
      <div className="result wide">
        <p className="result-kicker">게임 종료</p>
        <h2 className="result-title">{winners.length > 1 ? `${winners.map((w) => w.name).join(', ')} 공동 우승!` : `${winners[0].name} 우승!`}</h2>

        <ol className="result-list">
          {scores.map((s) => (
            <li key={s.player} className={s.rank === 1 ? 'winner' : ''}>
              <span className="rank-badge">{s.rank}</span>
              <div className="result-who">
                <strong>{s.name}</strong>
                <div className="result-colors">
                  {s.colors.map((c) => (
                    <ColorDetail key={c} state={state} color={c} />
                  ))}
                </div>
              </div>
              <span className="result-pts">{s.final}</span>
            </li>
          ))}
        </ol>
        {shared !== -1 && (
          <p className="result-note">
            <ColorDetail state={state} color={shared} /> 공용 색은 점수에 넣지 않았어요.
          </p>
        )}
        <p className="result-note">남은 칸마다 −1점 · 모두 놓으면 +{ALL_PLACED_BONUS} · 마지막이 1칸 조각이면 +{MONOMINO_LAST_BONUS}</p>

        <div className="result-actions">
          <button className="ghost-btn" onClick={onViewBoard}>
            보드 보기
          </button>
          {onExit && (
            <button className="ghost-btn" onClick={onExit}>
              처음으로
            </button>
          )}
          <button className="confirm-btn" onClick={onRestart}>
            다시 하기
          </button>
        </div>
      </div>
    </div>
  )
}

function ColorDetail({ state, color }: { state: GameState; color: Color }) {
  const remaining = state.remaining[color]
  const allPlaced = remaining.length === 0
  const monoBonus = allPlaced && state.lastPiece[color] === 'I1'
  return (
    <span className="color-detail">
      <span className="color-dot" style={{ background: PALETTE[color].base }} />
      {allPlaced ? (
        <span className="bonus">모두 놓음 +{ALL_PLACED_BONUS + (monoBonus ? MONOMINO_LAST_BONUS : 0)}</span>
      ) : (
        <span>
          남은 {remaining.length}개 · {cellCount(remaining)}칸
        </span>
      )}
    </span>
  )
}
