// 게임 화면: 가운데 보드, 좌우 4개 플레이어 영역, 드래그 배치와 확정, 알림, 종료 화면.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BOARD_SIZE, playerScores, type Color, type GameConfig, type GameEvent, type Point } from '../engine'
import { useGameController, type GameController } from '../game/useGameController'
import { Board, BOARD_UNITS, RIM } from './Board'
import { PALETTE } from './palette'
import { CloseIcon, HomeIcon } from './icons'
import { PieceIcon, PlasticDefs } from './Plastic'
import { PlayerPanel, type PanelMode } from './PlayerPanel'

/** 터치로 끌 때 손가락에 가리지 않도록 조각을 손가락 위쪽(칸 단위)에 띄운다 */
const TOUCH_LIFT = 1.6

interface Drag {
  pointerType: string
  x: number
  y: number
  overBoard: boolean
  cellPx: number
}

export function GameScreen({ config, onExit }: { config: GameConfig; onExit?: () => void }) {
  const game = useGameController(config)
  const { state } = game
  const boardRef = useRef<SVGSVGElement>(null)
  const sideRef = useRef<HTMLDivElement>(null)
  const sideWidth = useElementWidth(sideRef)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const gameRef = useLatest(game)
  const toasts = useEventToasts(game)

  const carouselCell = Math.max(18, Math.min(48, (sideWidth - 40) / 6))

  // 화면 좌표 → 보드 칸 좌표와 칸 한 변의 픽셀 크기
  const toCell = (x: number, y: number, pointerType: string): { cell: Point; inside: boolean; cellPx: number } | null => {
    const svg = boardRef.current
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    const cellPx = r.width / BOARD_UNITS
    const lift = pointerType === 'touch' ? TOUCH_LIFT * cellPx : 0
    const cx = (x - r.left) / cellPx - RIM
    const cy = (y - lift - r.top) / cellPx - RIM
    const cell: Point = [Math.floor(cx), Math.floor(cy)]
    const inside = cx >= -1 && cy >= -1 && cx <= BOARD_SIZE + 1 && cy <= BOARD_SIZE + 1
    return { cell, inside, cellPx }
  }

  const lastCell = useRef('')
  const moveTo = (x: number, y: number, pointerType: string) => {
    const hit = toCell(x, y, pointerType)
    const overBoard = !!hit?.inside
    if (hit && overBoard) {
      const k = hit.cell.join()
      if (k !== lastCell.current) {
        lastCell.current = k
        gameRef.current.putAt(hit.cell)
      }
    } else if (lastCell.current) {
      lastCell.current = ''
      gameRef.current.cancel()
    }
    setDrag({ pointerType, x, y, overBoard, cellPx: hit?.cellPx ?? 40 })
  }

  const startDrag = (e: React.PointerEvent) => {
    if (!game.selected || state.over) return
    e.preventDefault()
    lastCell.current = ''
    moveTo(e.clientX, e.clientY, e.pointerType)
    const pointerId = e.pointerId
    const pointerType = e.pointerType
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) moveTo(ev.clientX, ev.clientY, pointerType)
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      if (!lastCell.current) gameRef.current.cancel()
      setDrag(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // 보드를 누르면 그 자리에 조각을 올리고, 그대로 끌면 옮긴다
  const onBoardPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('.pending-actions')) return
    startDrag(e)
  }

  const onBoardWheel = () => {
    if (!game.pending) return
    game.rotate()
  }

  useKeyboard(game)

  // 개발 서버에서만 브라우저 콘솔·자동 테스트로 진행을 빠르게 넘길 수 있게 한다
  useEffect(() => {
    if (!import.meta.env.DEV) return
    ;(window as unknown as { __autoplay?: (n: number) => void }).__autoplay = (n) => gameRef.current.debugAutoplay(n)
  }, [gameRef])

  const modeFor = (color: Color, partner: Color): PanelMode => {
    if (state.over) return 'normal'
    if (state.current === color) return 'active'
    if (state.current === partner) return 'collapsed'
    return 'normal'
  }

  const panel = (color: Color, partner: Color) => (
    <PlayerPanel key={color} game={game} color={color} mode={modeFor(color, partner)} carouselCell={carouselCell} onDragStart={startDrag} />
  )

  const floating = drag && !drag.overBoard && game.shape && game.selected

  return (
    <>
      <PlasticDefs />
      <main className="stage">
        <div className="side" ref={sideRef}>
          {panel(0, 3)}
          {panel(3, 0)}
        </div>
        <div className="board-wrap" onPointerDown={onBoardPointerDown} onWheel={onBoardWheel}>
          <Board
            ref={boardRef}
            state={state}
            preview={game.pendingCells ? { color: state.current, cells: game.pendingCells, valid: game.pendingValid } : null}
          />
          {game.pendingCells && !drag && <PendingActions game={game} />}
          {onExit && !state.over && (
            <button className="home-btn" onClick={() => setConfirmExit(true)} aria-label="처음으로" title="처음으로">
              <HomeIcon />
            </button>
          )}
          <div className="toasts">
            {toasts.map((t) => (
              <div key={t.id} className="toast" style={{ borderColor: t.color ? PALETTE[t.color].accent : undefined }}>
                {t.text}
              </div>
            ))}
          </div>
        </div>
        <div className="side">
          {panel(1, 2)}
          {panel(2, 1)}
        </div>
      </main>

      {floating && (
        <div
          className="floating-piece"
          style={{ left: drag.x, top: drag.y - (drag.pointerType === 'touch' ? TOUCH_LIFT * drag.cellPx : 0) }}
        >
          <PieceIcon shape={game.shape!} color={state.current} cellSize={drag.cellPx} />
        </div>
      )}

      {state.over && <GameOver game={game} onExit={onExit} />}

      {confirmExit && onExit && (
        <div className="overlay" onClick={() => setConfirmExit(false)}>
          <div className="result" onClick={(e) => e.stopPropagation()}>
            <h2>게임을 그만둘까요?</h2>
            <p className="dialog-text">지금 진행 중인 게임은 사라지고 시작 화면으로 돌아갑니다.</p>
            <div className="result-actions">
              <button className="ghost-btn" onClick={() => setConfirmExit(false)}>
                계속하기
              </button>
              <button className="confirm-btn" onClick={onExit}>
                그만두기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** 확정 전 조각 아래(공간이 없으면 위)에 띄우는 확정·취소 버튼 */
function PendingActions({ game }: { game: GameController }) {
  const cells = game.pendingCells!
  const xs = cells.map(([x]) => x)
  const ys = cells.map(([, y]) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs) + 1
  const centerX = (minX + maxX) / 2
  const below = Math.max(...ys) < BOARD_SIZE - 3
  const y = below ? Math.max(...ys) + 1 : Math.min(...ys)
  // 보드 좌우 가장자리 근처에서는 버튼이 보드 밖으로 나가지 않게 조각의 왼쪽·오른쪽 끝에 맞춘다
  const align = centerX < 4 ? 'start' : centerX > BOARD_SIZE - 4 ? 'end' : 'center'
  const x = align === 'start' ? minX : align === 'end' ? maxX : centerX
  const pct = (v: number) => `${((v + RIM) / BOARD_UNITS) * 100}%`
  return (
    <div className={`pending-actions ${below ? 'below' : 'above'} align-${align}`} style={{ left: pct(x), top: pct(y) }}>
      <button className="cancel-btn" onClick={game.cancel} aria-label="취소">
        <CloseIcon />
      </button>
      <button className="confirm-btn" disabled={!game.pendingValid} onClick={game.confirm}>
        {game.pendingValid ? '확정' : '놓을 수 없음'}
      </button>
    </div>
  )
}

function GameOver({ game, onExit }: { game: GameController; onExit?: () => void }) {
  const scores = playerScores(game.state).sort((a, b) => a.rank - b.rank)
  return (
    <div className="overlay">
      <div className="result">
        <h2>게임 종료</h2>
        <ol>
          {scores.map((s) => (
            <li key={s.player}>
              <span className="rank">{s.rank}위</span>
              <span className="who">
                {s.colors.map((c) => (
                  <span key={c} className="dot" style={{ background: PALETTE[c].base }} />
                ))}
                {s.name}
              </span>
              <span className="pts">{s.final}점</span>
            </li>
          ))}
        </ol>
        <div className="result-actions">
          <button className="confirm-btn" onClick={game.restart}>
            다시 하기
          </button>
          {onExit && (
            <button className="ghost-btn" onClick={onExit}>
              처음으로
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function useElementWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(300)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

/** 렌더 중이 아닌 이벤트 처리에서 항상 최신 값을 읽기 위한 ref */
function useLatest<T>(value: T) {
  const ref = useRef(value)
  useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

function useKeyboard(game: GameController) {
  const ref = useLatest(game)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = ref.current
      if (g.state.over) return
      const key = e.key.toLowerCase()
      if (key === 'r') g.rotate()
      else if (key === 'f') g.flip()
      else if (key === 'arrowleft') g.step(-1)
      else if (key === 'arrowright') g.step(1)
      else if (key === 'enter') g.confirm()
      else if (key === 'escape') g.cancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ref])
}

interface Toast {
  id: number
  text: string
  color?: Color
}

/** 자동 패스·탈락·되돌리기처럼 놓치기 쉬운 일을 잠깐 알려 준다 */
function useEventToasts(game: GameController) {
  const { state } = game
  const [toasts, setToasts] = useState<Toast[]>([])
  const seen = useRef(state.log.length)
  const nextId = useRef(0)
  useEffect(() => {
    const log = state.log
    const fresh = log.length > seen.current ? log.slice(seen.current) : log.at(-1)?.type === 'undo' ? [log.at(-1)!] : []
    seen.current = log.length
    const items = fresh.map((e) => describe(e, state.config.playerNames)).filter((t): t is Omit<Toast, 'id'> => !!t)
    if (!items.length) return
    const added = items.map((t) => ({ ...t, id: nextId.current++ }))
    setToasts((prev) => [...prev, ...added].slice(-3))
    const timer = setTimeout(() => setToasts((prev) => prev.filter((t) => !added.includes(t))), 2800)
    return () => clearTimeout(timer)
  }, [state.log, state.config.playerNames])
  return toasts
}

function describe(e: GameEvent, names: string[]): Omit<Toast, 'id'> | null {
  switch (e.type) {
    case 'pass':
      return e.reason === 'timeout'
        ? { text: `${names[e.player]}(${PALETTE[e.color].name}) 시간 초과로 패스`, color: e.color }
        : { text: `${names[e.player]}(${PALETTE[e.color].name}) 뽑힌 조각을 놓을 자리가 없어 패스`, color: e.color }
    case 'out':
      return e.reason === 'allPlaced'
        ? { text: `${PALETTE[e.color].name} 모든 조각을 놓았습니다!`, color: e.color }
        : { text: `${PALETTE[e.color].name} 더 놓을 곳이 없어 끝났습니다`, color: e.color }
    case 'undo':
      return { text: `${names[e.player]} 되돌리기`, color: e.color }
    default:
      return null
  }
}
