// 남은 시간을 링으로 보여 주는 카운트다운. 시간이 다 되면 onExpire를 한 번 부른다.
// 턴이 바뀌면(turnId) 부모가 key를 바꿔 새로 시작시킨다.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { play } from './sound'

export function TimerRing({ seconds, color, running, onExpire, size = 44 }: { seconds: number; color: string; running: boolean; onExpire: () => void; size?: number }) {
  const [left, setLeft] = useState(seconds * 1000)
  const onExpireRef = useRef(onExpire)
  useLayoutEffect(() => {
    onExpireRef.current = onExpire
  })

  useEffect(() => {
    if (!running) return
    const end = performance.now() + seconds * 1000
    let lastSecond = seconds
    const id = setInterval(() => {
      const remaining = Math.max(0, end - performance.now())
      setLeft(remaining)
      // 마지막 5초는 초마다 짧게 똑딱
      const second = Math.ceil(remaining / 1000)
      if (second !== lastSecond && second <= 5 && second > 0) play('tick')
      lastSecond = second
      if (remaining === 0) {
        clearInterval(id)
        onExpireRef.current()
      }
    }, 100)
    return () => clearInterval(id)
  }, [running, seconds])

  const r = 18
  const c = 2 * Math.PI * r
  const ratio = left / (seconds * 1000)
  const urgent = left <= 5000
  return (
    <div className={`timer-ring${urgent ? ' urgent' : ''}`} style={{ width: size, height: size }} aria-label={`남은 시간 ${Math.ceil(left / 1000)}초`}>
      <svg viewBox="0 0 44 44" width={size} height={size}>
        <circle cx="22" cy="22" r={r} fill="#fff" fillOpacity="0.85" stroke="#000" strokeOpacity="0.08" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={urgent ? '#ef4444' : color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          transform="rotate(-90 22 22)"
        />
      </svg>
      <span>{Math.ceil(left / 1000)}</span>
    </div>
  )
}
