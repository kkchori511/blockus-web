// 게임 화면: 가운데 보드, 좌우 4개 플레이어 영역, 드래그 배치와 확정, 알림, 종료 화면.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BOARD_SIZE, colorOwners, PIECES, type Color, type GameConfig, type GameEvent, type GameState, type Point } from '../engine'
import { clearGame } from '../game/save'
import { useGameController, type GameController } from '../game/useGameController'
import { Board, BOARD_UNITS, RIM } from './Board'
import { PALETTE } from './palette'
import { CloseIcon, HomeIcon, SoundOffIcon, SoundOnIcon } from './icons'
import { PieceIcon, PlasticDefs } from './Plastic'
import { BANNER_MS, OutBanner, type Banner, type BannerItem } from './OutBanner'
import { PlayerPanel, type PanelMode } from './PlayerPanel'
import { ResultDialog } from './ResultDialog'
import { isMuted, play, setMuted, unlockAudio, type SoundName } from './sound'

/** 터치로 끌 때 손가락에 가리지 않도록 조각을 손가락 위쪽(칸 단위)에 띄운다 */
const TOUCH_LIFT = 1.6

interface Drag {
  pointerType: string
  x: number
  y: number
  overBoard: boolean
  cellPx: number
}

export function GameScreen({ config, initial, onExit }: { config: GameConfig; initial?: GameState; onExit?: () => void }) {
  const game = useGameController(config, initial)
  const { state } = game
  const boardRef = useRef<SVGSVGElement>(null)
  const sideRef = useRef<HTMLDivElement>(null)
  const sideWidth = useElementWidth(sideRef)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [confirmExit, setConfirmExit] = useState(false)
  const [confirmPass, setConfirmPass] = useState(false)
  const [viewBoard, setViewBoard] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const gameRef = useLatest(game)
  const { toasts, banner, holdResult, announcement } = useGameEvents(game)

  // 브라우저는 사용자 조작 전에는 소리를 막으므로 첫 터치·클릭에서 오디오를 깨운다
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio, { once: true })
    return () => window.removeEventListener('pointerdown', unlockAudio)
  }, [])

  const exit = () => {
    clearGame()
    onExit?.()
  }
  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }

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
    <PlayerPanel
      key={color}
      game={game}
      color={color}
      mode={modeFor(color, partner)}
      carouselCell={carouselCell}
      onDragStart={startDrag}
      onGiveUp={() => setConfirmPass(true)}
    />
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
          <div className="corner-btns">
            <button className="corner-btn" onClick={toggleMute} aria-label={muted ? '소리 켜기' : '소리 끄기'} title={muted ? '소리 켜기' : '소리 끄기'}>
              {muted ? <SoundOffIcon /> : <SoundOnIcon />}
            </button>
            {onExit && !state.over && (
              <button className="corner-btn" onClick={() => setConfirmExit(true)} aria-label="처음으로" title="처음으로">
                <HomeIcon />
              </button>
            )}
          </div>
          {banner && <OutBanner key={banner.id} banner={banner} />}
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </div>
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

      {state.over && !holdResult && !viewBoard && (
        <ResultDialog state={state} onRestart={game.restart} onExit={onExit ? exit : undefined} onViewBoard={() => setViewBoard(true)} />
      )}
      {state.over && !holdResult && viewBoard && (
        <button className="confirm-btn show-result-btn" onClick={() => setViewBoard(false)}>
          결과 보기
        </button>
      )}

      {confirmPass && (
        <Dialog
          title="이번 턴을 패스할까요?"
          text="아직 놓을 수 있는 자리가 있어요. 패스하면 이번 턴은 조각을 놓지 않고 다음 사람에게 넘어갑니다."
          cancel="다시 찾아보기"
          ok="패스"
          onCancel={() => setConfirmPass(false)}
          onOk={() => {
            setConfirmPass(false)
            game.giveUp()
          }}
        />
      )}

      {confirmExit && onExit && (
        <Dialog
          title="게임을 그만둘까요?"
          text="지금 진행 중인 게임은 사라지고 시작 화면으로 돌아갑니다."
          cancel="계속하기"
          ok="그만두기"
          onCancel={() => setConfirmExit(false)}
          onOk={exit}
        />
      )}
    </>
  )
}

function Dialog({ title, text, cancel, ok, onCancel, onOk }: { title: string; text: string; cancel: string; ok: string; onCancel: () => void; onOk: () => void }) {
  return (
    <div className="overlay" onClick={onCancel}>
      <div className="result" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="dialog-text">{text}</p>
        <div className="result-actions">
          <button className="ghost-btn" onClick={onCancel}>
            {cancel}
          </button>
          <button className="confirm-btn" onClick={onOk}>
            {ok}
          </button>
        </div>
      </div>
    </div>
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

/**
 * 새로 생긴 게임 기록마다 효과음을 내고, 자동 패스·되돌리기는 토스트로, 색이 끝난 일은 가운데 카드로 알려 준다.
 * 같은 내용을 화면 낭독기용 문장(announcement)으로도 내보낸다.
 */
function useGameEvents(game: GameController) {
  const { state } = game
  const [toasts, setToasts] = useState<Toast[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)
  /** 마지막 색이 모두 놓아 끝났을 때, 축하 카드를 보여 주는 동안 결과 화면을 미룬다 */
  const [holdResult, setHoldResult] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const seen = useRef(state.log.length)
  const nextId = useRef(0)
  const timers = useRef<number[]>([])
  const bannerTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const log = state.log
    const undone = log.length <= seen.current && log.at(-1)?.type === 'undo'
    // 되돌리기는 예전 기록으로 돌아간 뒤 undo 하나를 덧붙이므로 길이가 줄 수 있다. 그 밖에 줄어들면 새 게임이다.
    const fresh = log.length > seen.current ? log.slice(seen.current) : undone ? [log.at(-1)!] : []
    const restarted = log.length < seen.current && !undone
    seen.current = log.length
    const outs = fresh.flatMap((e) => (e.type === 'out' ? [e] : []))
    const over = fresh.some((e) => e.type === 'gameOver')
    const finale = over && outs.some((e) => e.reason === 'allPlaced')
    if (undone || restarted || (over && !finale)) {
      // 취소된 종료나 결과 화면 뒤에 가려질 카드는 남기지 않는다
      clearTimeout(bannerTimer.current)
      setBanner(null)
      setHoldResult(false)
    }

    if (finale) {
      // 축하음과 폭죽을 먼저, 3초 뒤 결과 화면과 종료음
      play('allPlaced')
      setHoldResult(true)
      timers.current.push(
        window.setTimeout(() => {
          setHoldResult(false)
          play('gameOver')
        }, BANNER_MS),
      )
    } else {
      const sound = loudest(fresh)
      if (sound) play(sound)
    }

    // 그 수로 게임이 끝나면 결과 화면이 바로 뜨므로 카드는 띄우지 않는다(마지막 색이 모두 놓은 경우는 예외)
    if (outs.length && (!over || finale)) {
      const items = outs.map((e) => bannerItem(state, e.color, e.reason === 'allPlaced'))
      const celebrate = items.filter((i) => i.allPlaced).map((i) => i.color)
      const burst = celebrate.length ? [{ id: nextId.current++, colors: celebrate }] : []
      const id = nextId.current++
      // 카드가 떠 있으면 새 항목을 붙이고 3초를 다시 센다
      setBanner((prev) =>
        prev
          ? { ...prev, rev: id, items: [...prev.items.filter((i) => !items.some((n) => n.color === i.color)), ...items], bursts: [...prev.bursts, ...burst] }
          : { id, rev: id, items, bursts: burst },
      )
      clearTimeout(bannerTimer.current)
      bannerTimer.current = window.setTimeout(() => setBanner(null), BANNER_MS)
    }

    const items = fresh.map((e) => describe(e, state.config.playerNames)).filter((t): t is Omit<Toast, 'id'> => !!t)
    const spoken = [...items.map((t) => t.text), ...outs.map((e) => spokenOut(state, e.color, e.reason === 'allPlaced'))]
    if (spoken.length) setAnnouncement(spoken.join('. '))
    if (!items.length) return
    const added = items.map((t) => ({ ...t, id: nextId.current++ }))
    setToasts((prev) => [...prev, ...added].slice(-3))
    timers.current.push(window.setTimeout(() => setToasts((prev) => prev.filter((t) => !added.includes(t))), 2800))
  }, [state])
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
      clearTimeout(bannerTimer.current)
    },
    [],
  )
  return { toasts, banner, holdResult, announcement }
}

function ownerName(state: GameState, color: Color) {
  const owner = colorOwners(state.config.playerCount)[color]
  return owner === 'shared' ? '공용' : state.config.playerNames[owner]
}

function bannerItem(state: GameState, color: Color, allPlaced: boolean): BannerItem {
  const shared = colorOwners(state.config.playerCount)[color] === 'shared'
  const lastIsMonomino = state.lastPiece[color] !== null && PIECES[state.lastPiece[color]!].size === 1
  // 공용 색은 점수에 들어가지 않고, 숨김 옵션이면 점수를 끝날 때까지 감춘다
  const bonus = allPlaced && !shared && !state.config.options.hideRemaining ? (lastIsMonomino ? 20 : 15) : null
  return { color, who: `${PALETTE[color].name} · ${ownerName(state, color)}`, allPlaced, bonus, shared }
}

function spokenOut(state: GameState, color: Color, allPlaced: boolean) {
  return `${PALETTE[color].name}, ${ownerName(state, color)}, ${allPlaced ? '모든 조각을 놓았습니다' : '더 놓을 곳이 없어 끝났습니다'}`
}

/** 한 번에 여러 일이 생기면(놓자마자 다음 색이 자동 탈락 등) 가장 중요한 소리 하나만 낸다 */
function loudest(events: GameEvent[]): SoundName | null {
  const types = new Set(events.map((e) => (e.type === 'pass' ? 'pass' : e.type)))
  if (types.has('gameOver')) return 'gameOver'
  if (types.has('undo')) return 'undo'
  if (events.some((e) => e.type === 'out' && e.reason === 'allPlaced')) return 'allPlaced'
  if (types.has('place')) return 'place'
  if (types.has('out')) return 'out'
  if (types.has('pass')) return 'pass'
  return null
}

function describe(e: GameEvent, names: string[]): Omit<Toast, 'id'> | null {
  switch (e.type) {
    case 'pass': {
      const who = `${names[e.player]}(${PALETTE[e.color].name})`
      const why = { timeout: '시간 초과로 패스', blockedDraw: '뽑힌 조각을 놓을 자리가 없어 패스', manual: '패스' }[e.reason]
      return { text: `${who} ${why}`, color: e.color }
    }
    case 'undo':
      return { text: `${names[e.player]} 되돌리기`, color: e.color }
    default:
      return null
  }
}
