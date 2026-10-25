// 20×20 보드: 매트한 플라스틱 판, 연속된 얕은 격자 홈, 시작 모서리 표시, 놓인 조각, 배치 미리보기.

import type React from 'react'
import { BOARD_SIZE, COLORS, START_CORNERS, type Color, type GameState, type Shape } from '../engine'
import { piecePath } from './outline'
import { PALETTE } from './palette'
import { PlasticPiece } from './Plastic'

export interface BoardPreview {
  color: Color
  cells: Shape
  valid: boolean
}

export const RIM = 0.45
const N = BOARD_SIZE
/** viewBox 한 변의 길이(칸 단위) */
export const BOARD_UNITS = N + RIM * 2

export function Board({ state, preview, ref }: { state: GameState; preview?: BoardPreview | null; ref?: React.Ref<SVGSVGElement> }) {
  const placements = state.log.filter((e) => e.type === 'place')
  return (
    <svg ref={ref} className="board" viewBox={`${-RIM} ${-RIM} ${N + RIM * 2} ${N + RIM * 2}`} role="img" aria-label="블로커스 보드">
      <defs>
        <linearGradient id="board-plate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbfbfa" />
          <stop offset="1" stopColor="#e9eae9" />
        </linearGradient>
        <linearGradient id="board-surface" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f4f3" />
          <stop offset="0.55" stopColor="#eeeeed" />
          <stop offset="1" stopColor="#e9eae9" />
        </linearGradient>
        <filter id="board-shadow" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="0.14" stdDeviation="0.2" floodColor="#475569" floodOpacity="0.2" />
        </filter>
        {/* 격자 홈: 각 칸의 위·왼쪽 경계만 그려 선이 겹치지 않게 하고, 어두운 홈 옆에 밝은 반사선을 둔다 */}
        <pattern id="board-groove" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M0 0 H1 M0 0 V1" stroke="#aeb4bb" strokeWidth="0.045" strokeOpacity="0.5" />
          <path d="M0 0.035 H1 M0.035 0 V1" stroke="#fff" strokeWidth="0.016" strokeOpacity="0.75" />
        </pattern>
      </defs>

      <rect x={-RIM} y={-RIM} width={N + RIM * 2} height={N + RIM * 2} rx="0.5" fill="url(#board-plate)" filter="url(#board-shadow)" />
      {/* 판 외곽의 밝은 위·왼쪽, 어두운 아래·오른쪽 림 */}
      <path d={`M${-RIM + 0.5} ${-RIM + 0.02} H${N + RIM - 0.5} M${-RIM + 0.02} ${-RIM + 0.5} V${N + RIM - 0.5}`} stroke="#fff" strokeOpacity="0.85" strokeWidth="0.025" />
      <path d={`M${-RIM + 0.5} ${N + RIM - 0.02} H${N + RIM - 0.5} M${N + RIM - 0.02} ${-RIM + 0.5} V${N + RIM - 0.5}`} stroke="#aab0b8" strokeOpacity="0.45" strokeWidth="0.035" />
      <rect x="-0.06" y="-0.06" width={N + 0.12} height={N + 0.12} rx="0.12" fill="none" stroke="#d4d8dd" strokeWidth="0.03" />

      <rect x="0" y="0" width={N} height={N} fill="url(#board-surface)" />
      <rect x="0" y="0" width={N} height={N} fill="url(#board-groove)" />
      <path d={`M${N} 0 V${N} H0`} stroke="#aeb4bb" strokeWidth="0.045" strokeOpacity="0.5" fill="none" />

      {COLORS.filter((c) => state.lastPiece[c] === null).map((c) => {
        const [x, y] = START_CORNERS[c]
        return (
          <g key={c}>
            <rect x={x + 0.08} y={y + 0.08} width="0.84" height="0.84" rx="0.06" fill={PALETTE[c].base} opacity="0.16" />
            <circle cx={x + 0.5} cy={y + 0.5} r="0.14" fill={PALETTE[c].base} opacity="0.6" />
          </g>
        )
      })}

      {placements.map((p, i) => (
        <PlasticPiece key={i} cells={p.cells} color={p.color} />
      ))}

      {preview && <Preview preview={preview} />}
    </svg>
  )
}

/** 반투명 조각 + 조각 실루엣을 따라 한 번 두른 윤곽(가능하면 초록, 불가능하면 빨강) */
function Preview({ preview }: { preview: BoardPreview }) {
  const outline = piecePath(preview.cells, 0.02)
  const stroke = preview.valid ? '#24e34a' : '#ef4444'
  return (
    <g className="board-preview" pointerEvents="none">
      <PlasticPiece cells={preview.cells} color={preview.color} shadow={false} bodyOpacity={0.5} />
      <path d={outline} fill={stroke} fillOpacity="0.035" stroke={stroke} strokeWidth="0.08" strokeOpacity="0.16" strokeLinejoin="round" />
      <path d={outline} fill="none" stroke={stroke} strokeWidth="0.05" strokeLinejoin="round" />
    </g>
  )
}
