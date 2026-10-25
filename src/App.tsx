// 시작 화면 → 게임 화면.
// 개발 편의: 주소에 설정을 붙이면 시작 화면을 건너뛴다.
// 예: ?players=3&mode=allRandom&timer=30&hide=1&undo=1&names=가,나,다

import { useState } from 'react'
import { randomSeed, type GameConfig, type GameMode, type GameState, type PlayerCount, type TimeLimit } from './engine'
import { GameScreen } from './ui/GameScreen'
import { StartScreen } from './ui/StartScreen'

function configFromUrl(): GameConfig | null {
  const q = new URLSearchParams(location.search)
  if ([...q.keys()].length === 0) return null
  const playerCount = Number(q.get('players') ?? 4) as PlayerCount
  const mode = (q.get('mode') ?? 'classic') as GameMode
  const timer = Number(q.get('timer') ?? 0)
  const names = q.get('names')?.split(',') ?? []
  return {
    playerCount,
    playerNames: Array.from({ length: playerCount }, (_, i) => names[i] || `Player ${i + 1}`),
    mode,
    options: {
      timeLimit: [15, 30, 60].includes(timer) ? (timer as TimeLimit) : null,
      hideRemaining: q.get('hide') === '1',
      allowUndo: q.get('undo') !== '0',
    },
    seed: q.has('seed') ? Number(q.get('seed')) : randomSeed(),
  }
}

interface Session {
  config: GameConfig
  /** 저장된 게임을 이어서 할 때의 상태 */
  initial?: GameState
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const config = configFromUrl()
    return config ? { config } : null
  })
  if (!session) return <StartScreen onStart={(config) => setSession({ config })} onResume={(state) => setSession({ config: state.config, initial: state })} />
  return <GameScreen key={session.config.seed} config={session.config} initial={session.initial} onExit={() => setSession(null)} />
}
