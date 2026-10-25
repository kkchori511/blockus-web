// 시작 화면: 인원수, 닉네임, 게임 모드, 옵션을 고른다. 마지막 설정은 브라우저에 기억한다.

import { useState } from 'react'
import { colorOwners, COLORS, PIECES, randomSeed, type Color, type GameConfig, type GameMode, type GameState, type PieceId, type PlayerCount, type TimeLimit } from '../engine'
import { clearGame, loadGame } from '../game/save'
import { PALETTE } from './palette'
import { PieceIcon, PlasticDefs } from './Plastic'
import { unlockAudio } from './sound'

interface Settings {
  playerCount: PlayerCount
  names: string[]
  mode: GameMode
  timeLimit: TimeLimit | null
  hideRemaining: boolean
  allowUndo: boolean
}

const STORAGE_KEY = 'blokus:settings'
const NAME_MAX = 8

const DEFAULTS: Settings = {
  playerCount: 4,
  names: ['', '', '', ''],
  mode: 'classic',
  timeLimit: null,
  hideRemaining: false,
  allowUndo: true,
}

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!saved) return DEFAULTS
    const merged: Settings = { ...DEFAULTS, ...saved }
    // 이름이 바뀌어 없어진 모드(예전 '오늘의 세트')는 클래식으로 돌린다
    return MODES.some((m) => m.id === merged.mode) ? merged : { ...merged, mode: 'classic' }
  } catch {
    return DEFAULTS
  }
}

function saveSettings(s: Settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // 저장이 막힌 환경(사생활 보호 모드 등)에서는 기억만 못 할 뿐 게임은 그대로 진행한다
  }
}

const MODES: { id: GameMode; title: string; desc: string; pieces: PieceId[] }[] = [
  { id: 'classic', title: '클래식', desc: '21개 조각을 모두 쓰는 기본 규칙', pieces: ['F5', 'L4', 'I3'] },
  { id: 'allRandom', title: '올랜덤', desc: '매 턴 낼 조각이 무작위로 정해져요. 못 놓으면 패스!', pieces: ['X5', 'T4', 'V3'] },
  { id: 'expansion', title: '블럭 확장판', desc: '6칸 조각 4개가 더해진 19개 조각으로 시작해요', pieces: ['H6', 'S6', 'C6'] },
]

/** 모드 카드의 조각 3개가 110px 칸에 들어가도록 칸 크기를 줄인다 */
function iconCell(pieces: PieceId[]) {
  const width = pieces.reduce((sum, id) => sum + Math.max(...PIECES[id].shape.map(([x]) => x)) + 1, 0)
  return Math.min(12, Math.floor((110 - 8) / width))
}

const TIME_OPTIONS: { value: TimeLimit | null; label: string }[] = [
  { value: null, label: '없음' },
  { value: 15, label: '15초' },
  { value: 30, label: '30초' },
  { value: 60, label: '1분' },
]

export function StartScreen({ onStart, onResume }: { onStart: (config: GameConfig) => void; onResume: (state: GameState) => void }) {
  const [s, setS] = useState<Settings>(loadSettings)
  const [saved, setSaved] = useState(loadGame)
  const update = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }))
  const owners = colorOwners(s.playerCount)

  const start = () => {
    unlockAudio()
    saveSettings(s)
    const names = Array.from({ length: s.playerCount }, (_, i) => s.names[i]?.trim() || `플레이어 ${i + 1}`)
    onStart({
      playerCount: s.playerCount,
      playerNames: names,
      mode: s.mode,
      options: { timeLimit: s.timeLimit, hideRemaining: s.hideRemaining, allowUndo: s.allowUndo },
      seed: randomSeed(),
    })
  }

  return (
    <>
      <PlasticDefs />
      <main className="start">
        <section className="start-left">
          <Title />
          <h2 className="start-label">게임 모드</h2>
          <div className="mode-list">
            {MODES.map((m, i) => (
              <button key={m.id} className={`mode-card${s.mode === m.id ? ' selected' : ''}`} onClick={() => update({ mode: m.id })}>
                <span className="mode-pieces">
                  {m.pieces.map((id, k) => (
                    <PieceIcon key={id} shape={PIECES[id].shape} color={COLORS[(i + k) % 4]} cellSize={iconCell(m.pieces)} />
                  ))}
                </span>
                <span className="mode-text">
                  <strong>{m.title}</strong>
                  <span>{m.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="start-right">
          {saved && (
            <div className="resume-card">
              <div>
                <strong>진행 중인 게임이 있어요</strong>
                <span>
                  {MODES.find((m) => m.id === saved.state.config.mode)?.title} · {saved.state.config.playerNames.join(', ')} · {timeAgo(saved.savedAt)}
                </span>
              </div>
              <div className="resume-actions">
                <button
                  className="ghost-btn"
                  onClick={() => {
                    clearGame()
                    setSaved(null)
                  }}
                >
                  지우기
                </button>
                <button className="confirm-btn" onClick={() => onResume(saved.state)}>
                  이어서 하기
                </button>
              </div>
            </div>
          )}
          <h2 className="start-label">인원</h2>
          <div className="segmented">
            {([2, 3, 4] as const).map((n) => (
              <button key={n} className={s.playerCount === n ? 'on' : ''} onClick={() => update({ playerCount: n })}>
                {n}명
              </button>
            ))}
          </div>

          <h2 className="start-label">닉네임</h2>
          <div className="name-list">
            {Array.from({ length: s.playerCount }, (_, p) => (
              <label key={p} className="name-row">
                <span className="name-colors">
                  {COLORS.filter((c) => owners[c] === p).map((c) => (
                    <ColorDot key={c} color={c} />
                  ))}
                </span>
                <input
                  value={s.names[p] ?? ''}
                  maxLength={NAME_MAX}
                  placeholder={`플레이어 ${p + 1}`}
                  onChange={(e) => {
                    const names = [...s.names]
                    names[p] = e.target.value
                    update({ names })
                  }}
                />
              </label>
            ))}
          </div>
          <p className="start-note">
            {s.playerCount === 2 && '두 사람이 마주 보는 두 색을 하나씩 더 맡아요. 점수는 두 색을 합칩니다.'}
            {s.playerCount === 3 && (
              <>
                <ColorDot color={3} /> 초록은 세 사람이 돌아가며 놓는 공용 색이에요. 점수에는 들어가지 않아요.
              </>
            )}
            {s.playerCount === 4 && '한 사람이 한 색씩 맡아요.'}
          </p>

          <h2 className="start-label">옵션</h2>
          <div className="option-row">
            <span className="option-name">시간 제한</span>
            <div className="segmented small">
              {TIME_OPTIONS.map((t) => (
                <button key={t.label} className={s.timeLimit === t.value ? 'on' : ''} onClick={() => update({ timeLimit: t.value })}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="남은 블럭 숨김" desc="내 차례에만 내 조각이 보이고, 점수는 끝나고 공개" on={s.hideRemaining} onChange={(v) => update({ hideRemaining: v })} />
          <Toggle label="되돌리기 허용" desc="다음 사람이 놓기 전까지 방금 놓은 수를 취소" on={s.allowUndo} onChange={(v) => update({ allowUndo: v })} />

          <button className="start-btn" onClick={start}>
            게임 시작
          </button>
        </section>
      </main>
    </>
  )
}

function timeAgo(at: number): string {
  const min = Math.floor((Date.now() - at) / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}시간 전`
  return `${Math.floor(hours / 24)}일 전`
}

function ColorDot({ color }: { color: Color }) {
  return <span className="color-dot" style={{ background: PALETTE[color].base }} aria-label={PALETTE[color].name} />
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button className="option-row toggle-row" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="option-text">
        <span className="option-name">{label}</span>
        <span className="option-desc">{desc}</span>
      </span>
      <span className={`switch${on ? ' on' : ''}`} />
    </button>
  )
}

/** 네 색 조각을 모서리에서 뻗어 나가듯 배치한 제목 */
function Title() {
  return (
    <div className="title">
      <div className="title-pieces">
        <PieceIcon shape={PIECES.V5.shape} color={0} cellSize={18} />
        <PieceIcon shape={PIECES.T4.shape} color={1} cellSize={18} />
        <PieceIcon shape={PIECES.Z5.shape} color={2} cellSize={18} />
        <PieceIcon shape={PIECES.L4.shape} color={3} cellSize={18} />
      </div>
      <h1>블로커스</h1>
      <p>모서리끼리만 이어서, 내 땅을 넓혀라</p>
    </div>
  )
}
