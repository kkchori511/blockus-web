// 진행 중인 게임 자동 저장. 새로고침하거나 창을 닫아도 시작 화면에서 이어서 할 수 있다.

import type { GameState } from '../engine'

const KEY = 'blokus:game'
// 저장 형식이 바뀌면 올려서 예전 저장본을 무시한다
const VERSION = 3

export function saveGame(state: GameState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: Date.now(), state }))
  } catch {
    // 저장 공간이 막힌 환경에서는 이어 하기만 안 될 뿐 게임은 계속된다
  }
}

export function loadGame(): { state: GameState; savedAt: number } | null {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!data || data.version !== VERSION || data.state?.over) return null
    return { state: data.state, savedAt: data.savedAt }
  } catch {
    return null
  }
}

export function clearGame() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // 무시
  }
}
