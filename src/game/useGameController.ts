// 게임 화면의 상태 관리: 엔진 상태 + 캐러셀 선택, 회전·뒤집기, 배치 대기(확정 전) 상태.

import { useCallback, useMemo, useState } from 'react'
import { chooseMove } from '../engine/sim'
import {
  canPlace,
  createRng,
  createGame,
  passTurn,
  PIECES,
  place,
  transform,
  translate,
  undo,
  type GameConfig,
  type GameState,
  type PieceId,
  type Point,
  type Shape,
} from '../engine'

export interface Orientation {
  rotation: number
  flipped: boolean
}

/** 보드에 올려 두고 확정을 기다리는 수. origin은 변형된 모양의 왼쪽 위 칸 좌표. */
export interface Pending {
  pieceId: PieceId
  origin: Point
}

export function orientedShape(pieceId: PieceId, o: Orientation): Shape {
  return transform(PIECES[pieceId].shape, o.rotation, o.flipped)
}

/** 모양의 가운데 칸을 기준점으로 삼아, 손가락이나 커서가 가리키는 칸에 조각 가운데가 오게 한다. */
export function originForCenter(shape: Shape, cell: Point): Point {
  const w = Math.max(...shape.map(([x]) => x)) + 1
  const h = Math.max(...shape.map(([, y]) => y)) + 1
  return [cell[0] - Math.floor((w - 1) / 2), cell[1] - Math.floor((h - 1) / 2)]
}

export function useGameController(config: GameConfig) {
  const [state, setState] = useState<GameState>(() => createGame(config))
  const [index, setIndex] = useState(0)
  const [orientation, setOrientation] = useState<Orientation>({ rotation: 0, flipped: false })
  const [pending, setPending] = useState<Pending | null>(null)

  /** 캐러셀에 보이는 조각들. 올랜덤이면 뽑힌 조각 하나만. */
  const choices: PieceId[] = useMemo(() => {
    if (state.over) return []
    if (state.drawn) return [state.drawn]
    return state.remaining[state.current]
  }, [state])

  const selected: PieceId | null = choices.length ? choices[((index % choices.length) + choices.length) % choices.length] : null
  const shape = selected ? orientedShape(selected, orientation) : null

  const pendingCells = pending && shape ? translate(shape, pending.origin[0], pending.origin[1]) : null
  const pendingValid = !!(pending && pendingCells && canPlace(state, pending.pieceId, pendingCells))

  const resetSelection = () => {
    setIndex(0)
    setOrientation({ rotation: 0, flipped: false })
    setPending(null)
  }

  const step = useCallback(
    (delta: number) => {
      setIndex((i) => i + delta)
      setOrientation({ rotation: 0, flipped: false })
      setPending(null)
    },
    [],
  )

  const select = useCallback(
    (pieceId: PieceId) => {
      const i = choices.indexOf(pieceId)
      if (i < 0) return
      setIndex(i)
      setOrientation({ rotation: 0, flipped: false })
      setPending(null)
    },
    [choices],
  )

  /** 회전·뒤집기. 배치 대기 중이면 조각의 가운데를 유지한 채 바뀐다. */
  const reorient = useCallback(
    (change: (o: Orientation) => Orientation) => {
      if (!selected) return
      const next = change(orientation)
      if (pending && shape) {
        const center = centerCell(shape, pending.origin)
        setPending({ pieceId: selected, origin: originForCenter(orientedShape(selected, next), center) })
      }
      setOrientation(next)
    },
    [orientation, pending, selected, shape],
  )

  const rotate = useCallback(() => reorient((o) => ({ ...o, rotation: (o.rotation + 1) % 4 })), [reorient])
  const flip = useCallback(() => reorient((o) => ({ ...o, flipped: !o.flipped })), [reorient])

  /** 보드의 칸을 가리켜 조각을 올려 둔다(확정 전). */
  const putAt = useCallback(
    (cell: Point) => {
      if (!selected || !shape) return
      setPending({ pieceId: selected, origin: originForCenter(shape, cell) })
    },
    [selected, shape],
  )

  const cancel = useCallback(() => setPending(null), [])

  const confirm = useCallback(() => {
    if (!pending || !pendingCells || !pendingValid) return
    setState((s) => place(s, pending.pieceId, pendingCells))
    resetSelection()
  }, [pending, pendingCells, pendingValid])

  const timeout = useCallback(() => {
    setState((s) => passTurn(s, 'timeout'))
    resetSelection()
  }, [])

  const undoLast = useCallback(() => {
    setState((s) => undo(s))
    resetSelection()
  }, [])

  /** 개발용: 자동으로 n수를 둔다(화면 확인·종료 화면 테스트) */
  const debugAutoplay = useCallback((moves: number) => {
    const rng = createRng(1)
    setState((s) => {
      for (let i = 0; i < moves && !s.over; i++) {
        const m = chooseMove(s, 'bigFirst', rng)
        if (!m) break
        s = place(s, m.pieceId, m.cells)
      }
      return s
    })
    resetSelection()
  }, [])

  const restart = useCallback(() => {
    setState(createGame({ ...config, seed: (Math.random() * 2 ** 32) | 0 }))
    resetSelection()
  }, [config])

  return {
    state,
    choices,
    index,
    selected,
    shape,
    orientation,
    pending,
    pendingCells,
    pendingValid,
    step,
    select,
    rotate,
    flip,
    putAt,
    cancel,
    confirm,
    timeout,
    undoLast,
    restart,
    debugAutoplay,
  }
}

export type GameController = ReturnType<typeof useGameController>

function centerCell(shape: Shape, origin: Point): Point {
  const w = Math.max(...shape.map(([x]) => x)) + 1
  const h = Math.max(...shape.map(([, y]) => y)) + 1
  return [origin[0] + Math.floor((w - 1) / 2), origin[1] + Math.floor((h - 1) / 2)]
}
