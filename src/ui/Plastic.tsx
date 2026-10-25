// 투명 플라스틱 조각 렌더링.
// 좌표 단위는 칸(1칸 = 1). 그라디언트·그림자 정의는 문서에 한 번만 두고 id로 참조한다.
// 조각은 외곽선 하나로 몸체를 채워 한 덩어리로 보이게 하고, 칸별로는 얕은 베벨만 그린다.

import { useId } from 'react'
import type { Color, Shape } from '../engine'
import { COLORS } from '../engine'
import { exposedRuns, piecePath } from './outline'
import { PLASTIC } from './palette'

const BODY_INSET = 0.025

export function PlasticDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {COLORS.map((c) => {
          const t = PLASTIC[c]
          return (
            <g key={c}>
              {/* 칸마다 같은 명암을 주는 그라디언트(칸 크기 기준). 조각 전체에 걸면 아래쪽 칸만 어두워진다 */}
              <linearGradient id={`pl-cell-${c}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#fff" stopOpacity="0.12" />
                <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.8" stopColor={t.dark} stopOpacity="0" />
                <stop offset="1" stopColor={t.dark} stopOpacity="0.18" />
              </linearGradient>
              {/* 그림자만 출력하는 필터: 바닥에 닿는 좁은 접촉 그림자 + 넓게 퍼지는 색 투과 그림자 */}
              <filter id={`pl-shadow-${c}`} filterUnits="userSpaceOnUse" x="-2" y="-2" width="26" height="26">
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.11" result="wide" />
                <feOffset in="wide" dx="0.06" dy="0.13" result="wideOff" />
                <feFlood floodColor={t.base} floodOpacity="0.26" />
                <feComposite in2="wideOff" operator="in" result="tint" />
                <feGaussianBlur in="SourceAlpha" stdDeviation="0.022" result="near" />
                <feOffset in="near" dx="0.015" dy="0.035" result="nearOff" />
                <feFlood floodColor="#203044" floodOpacity="0.18" />
                <feComposite in2="nearOff" operator="in" result="contact" />
                <feMerge>
                  <feMergeNode in="tint" />
                  <feMergeNode in="contact" />
                </feMerge>
              </filter>
            </g>
          )
        })}
      </defs>
    </svg>
  )
}

/** 칸 하나의 얕은 베벨: 위·왼쪽은 밝게, 아래·오른쪽은 어둡게, 칸 경계는 아주 옅게. */
function CellBevel({ x, y, color, dark }: { x: number; y: number; color: Color; dark: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0.03" y="0.03" width="0.94" height="0.94" fill={`url(#pl-cell-${color})`} />
      <rect x="0.1" y="0.1" width="0.8" height="0.8" rx="0.04" fill="none" stroke={dark} strokeOpacity="0.2" strokeWidth="0.018" />
      <path d="M0.12 0.86 V0.12 H0.86" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.025" strokeLinecap="round" />
      <path d="M0.88 0.14 V0.88 H0.14" fill="none" stroke={dark} strokeOpacity="0.3" strokeWidth="0.025" strokeLinecap="round" />
    </g>
  )
}

/** 여러 칸으로 된 조각 하나. */
export function PlasticPiece({ cells, color, shadow = true, bodyOpacity = 1 }: { cells: Shape; color: Color; shadow?: boolean; bodyOpacity?: number }) {
  const t = PLASTIC[color]
  const maskId = useId()
  const body = piecePath(cells, BODY_INSET)
  const xs = cells.map(([x]) => x)
  const ys = cells.map(([, y]) => y)
  const box = { x: Math.min(...xs) - 1, y: Math.min(...ys) - 1, w: Math.max(...xs) - Math.min(...xs) + 3, h: Math.max(...ys) - Math.min(...ys) + 3 }
  const e = BODY_INSET
  return (
    <g>
      {shadow && <path d={body} fill="#000" filter={`url(#pl-shadow-${color})`} />}
      <g opacity={bodyOpacity}>
        {/* 바닥 두께: 몸체를 아래·오른쪽으로 민 어두운 면 중 몸체 밖으로 드러난 부분만 */}
        <mask id={maskId} maskUnits="userSpaceOnUse" x={box.x} y={box.y} width={box.w} height={box.h}>
          <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="#fff" />
          <path d={body} fill="#000" />
        </mask>
        <path d={body} transform="translate(0.015 0.045)" fill={t.dark} opacity="0.5" mask={`url(#${maskId})`} />
        <path d={body} fill={t.base} fillOpacity="0.74" stroke={t.dark} strokeOpacity="0.35" strokeWidth="0.02" strokeLinejoin="round" />
        {cells.map(([x, y]) => (
          <CellBevel key={`${x},${y}`} x={x} y={y} color={color} dark={t.dark} />
        ))}
        {/* 빛이 투과하는 아래·오른쪽 가장자리 띠 */}
        <g stroke={t.light} strokeOpacity="0.42" strokeWidth="0.035" strokeLinecap="round">
          {exposedRuns(cells, 'bottom').map(({ start, end }) => (
            <line key={`${start}`} x1={start[0] + 0.08} y1={start[1] + 1 - e - 0.03} x2={end[0] - 0.08} y2={end[1] + 1 - e - 0.03} />
          ))}
          {exposedRuns(cells, 'right').map(({ start, end }) => (
            <line key={`r${start}`} x1={start[0] + 1 - e - 0.03} y1={start[1] + 0.08} x2={end[0] + 1 - e - 0.03} y2={end[1] - 0.08} />
          ))}
        </g>
        {/* 왼쪽 위 광원의 얇고 선명한 외곽 반사 */}
        <g stroke="#fff" strokeLinecap="round">
          {exposedRuns(cells, 'top').map(({ start, end }) => (
            <line key={`${start}`} x1={start[0] + 0.12} y1={start[1] + 0.055} x2={end[0] - 0.14} y2={end[1] + 0.055} strokeWidth="0.022" strokeOpacity="0.9" />
          ))}
          {exposedRuns(cells, 'left').map(({ start, end }) => (
            <line key={`l${start}`} x1={start[0] + 0.055} y1={start[1] + 0.12} x2={end[0] + 0.055} y2={end[1] - 0.14} strokeWidth="0.02" strokeOpacity="0.4" />
          ))}
        </g>
      </g>
    </g>
  )
}

/** 보드 밖(트레이, 캐러셀)에서 조각 하나를 크기에 맞춰 그린다. */
export function PieceIcon({ shape, color, cellSize, className }: { shape: Shape; color: Color; cellSize: number; className?: string }) {
  const w = Math.max(...shape.map(([x]) => x)) + 1
  const h = Math.max(...shape.map(([, y]) => y)) + 1
  const pad = 0.2
  return (
    <svg
      className={className}
      width={(w + pad * 2) * cellSize}
      height={(h + pad * 2) * cellSize}
      viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}
      style={{ overflow: 'visible' }}
    >
      <PlasticPiece cells={shape} color={color} />
    </svg>
  )
}
