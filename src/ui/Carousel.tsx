// 내 차례의 조각 선택 캐러셀: 가운데 조각이 크게, 좌우 조각은 원근감 있게 물러나 일부만 보인다.
// 가운데 조각을 끌면 보드로 드래그, 배경이나 옆 조각을 좌우로 밀면 넘김, 옆 조각을 누르면 그 조각으로 이동.

import { useRef } from 'react'
import { PIECES, type Color, type PieceId, type Shape } from '../engine'
import { PieceIcon } from './Plastic'

const SWIPE_STEP = 48

interface Props {
  choices: PieceId[]
  index: number
  color: Color
  /** 가운데 조각의 회전·뒤집기가 적용된 모양 */
  centerShape: Shape | null
  cellSize: number
  onStep: (delta: number) => void
  onDragStart: (e: React.PointerEvent) => void
}

function wrap(i: number, n: number) {
  return ((i % n) + n) % n
}

export function Carousel({ choices, index, color, centerShape, cellSize, onStep, onDragStart }: Props) {
  const swipe = useRef<{ id: number; x: number } | null>(null)
  const n = choices.length
  if (n === 0) return null
  const current = wrap(index, n)

  // 보이는 범위: 가운데 ±1, 애니메이션용으로 ±2까지 그리되 ±2는 투명
  const reach = Math.min(2, Math.floor((n - 1) / 2))
  const extraRight = n > 1 && (n - 1) % 2 === 1 ? 1 : 0
  const offsets: number[] = []
  for (let o = -reach; o <= reach + extraRight; o++) offsets.push(o)

  const onPointerDown = (e: React.PointerEvent) => {
    swipe.current = { id: e.pointerId, x: e.clientX }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const s = swipe.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) >= SWIPE_STEP) {
      onStep(dx < 0 ? 1 : -1)
      s.x = e.clientX
    }
  }
  const onPointerUp = () => {
    swipe.current = null
  }

  return (
    <div className="carousel" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className="carousel-floor" />
      {offsets.map((o) => {
        const id = choices[wrap(current + o, n)]
        const center = o === 0
        const shape = center && centerShape ? centerShape : PIECES[id].shape
        return (
          <div
            key={id}
            className={`carousel-item${center ? ' center' : ''}`}
            style={{
              transform: `translateX(${o * 64}%) scale(${center ? 1 : 0.58}) rotateY(${-o * 28}deg)`,
              opacity: Math.abs(o) >= 2 ? 0 : center ? 1 : 0.6,
              zIndex: 10 - Math.abs(o),
            }}
            onPointerDown={
              center
                ? (e) => {
                    e.stopPropagation()
                    onDragStart(e)
                  }
                : undefined
            }
            onClick={center || Math.abs(o) >= 2 ? undefined : () => onStep(o)}
          >
            <PieceIcon shape={shape} color={color} cellSize={cellSize} />
          </div>
        )
      })}
    </div>
  )
}
