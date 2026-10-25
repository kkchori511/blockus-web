// 색이 끝났을 때(더 놓을 곳이 없거나 모두 놓음) 보드 가운데에 3초 동안 크게 띄우는 카드.
// 모두 놓은 경우에는 폭죽을 함께 터뜨린다. 클릭을 막지 않아 떠 있는 동안에도 다음 사람이 둘 수 있다.

import { useState } from 'react'
import type { Color } from '../engine'
import { PLASTIC } from './palette'

export interface BannerItem {
  color: Color
  who: string
  allPlaced: boolean
  /** 모두 놓았을 때 받는 보너스. 남은 조각 숨기기 옵션이면 점수를 숨기므로 null */
  bonus: number | null
}

export interface Banner {
  id: number
  items: BannerItem[]
}

export const BANNER_MS = 3000

export function OutBanner({ banner }: { banner: Banner }) {
  const celebrate = banner.items.filter((i) => i.allPlaced).map((i) => i.color)
  return (
    <div className="out-banner-layer">
      {celebrate.length > 0 && <Confetti colors={celebrate} />}
      <div className="out-banner" style={{ animationDuration: `${BANNER_MS}ms` }}>
        {banner.items.map((item) => (
          <div key={item.color} className={`out-row${item.allPlaced ? ' all-placed' : ''}`}>
            <span className="out-who">
              <span className="out-chip" style={{ background: PLASTIC[item.color].base }} />
              {item.who}
            </span>
            <span className="out-msg" style={{ color: item.allPlaced ? PLASTIC[item.color].dark : undefined }}>
              {item.allPlaced ? '모든 조각을 놓았어요!' : '더 놓을 곳이 없어요'}
              {item.bonus !== null && <span className="out-bonus">+{item.bonus}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PIECES_PER_BURST = 70
const FESTIVE = ['#ffffff', '#ffd84d', '#ff7ab6', '#7ad7ff']

interface Particle {
  dx: number
  dy: number
  fall: number
  spin: number
  delay: number
  size: number
  round: boolean
  color: string
}

/** 가운데에서 사방으로 터졌다가 천천히 떨어지는 색종이 */
function Confetti({ colors }: { colors: Color[] }) {
  const [particles] = useState<Particle[]>(() => {
    const palette = [...colors.map((c) => PLASTIC[c].base), ...colors.map((c) => PLASTIC[c].light), ...FESTIVE]
    return Array.from({ length: PIECES_PER_BURST * Math.min(colors.length, 2) }, () => {
      const angle = Math.random() * Math.PI * 2
      const dist = 120 + Math.random() * 260
      return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist * 0.8 - 60,
        fall: 160 + Math.random() * 220,
        spin: (Math.random() - 0.5) * 1080,
        delay: Math.random() * 0.15,
        size: 7 + Math.random() * 8,
        round: Math.random() < 0.3,
        color: palette[Math.floor(Math.random() * palette.length)],
      }
    })
  })
  return (
    <div className="confetti">
      {particles.map((p, i) => (
        <span
          key={i}
          style={
            {
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              '--fall': `${p.fall}px`,
              '--spin': `${p.spin}deg`,
              width: p.size,
              height: p.round ? p.size : p.size * 0.45,
              borderRadius: p.round ? '50%' : 2,
              background: p.color,
              animationDelay: `${p.delay}s`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}
