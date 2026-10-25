// 시작 화면(5단계) 전까지는 URL로 게임 설정을 받는다.
// 예: ?players=3&mode=allRandom&timer=30&hide=1&undo=1&names=가,나,다

import { useState } from 'react'
import { randomSeed, type GameConfig, type GameMode, type PlayerCount, type TimeLimit } from './engine'
import { GameScreen } from './ui/GameScreen'

function configFromUrl(): GameConfig {
  const q = new URLSearchParams(location.search)
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

export default function App() {
  const [config] = useState(configFromUrl)
  return <GameScreen config={config} />
}
