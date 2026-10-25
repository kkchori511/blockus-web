// 시드 기반 난수(mulberry32). 상태가 숫자 하나라 게임 상태와 함께 저장·복원할 수 있다.

export function nextRandom(state: number): [value: number, nextState: number] {
  const next = (state + 0x6d2b79f5) | 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, next]
}

export function randomInt(state: number, maxExclusive: number): [value: number, nextState: number] {
  const [r, next] = nextRandom(state)
  return [Math.floor(r * maxExclusive), next]
}

/** 상태를 직접 다루지 않아도 되는 로컬 난수기. 시뮬레이션·세트 생성용. */
export function createRng(seed: number) {
  let state = seed | 0
  return {
    next(): number {
      const [v, s] = nextRandom(state)
      state = s
      return v
    },
    int(maxExclusive: number): number {
      return Math.floor(this.next() * maxExclusive)
    },
    get state() {
      return state
    },
  }
}

export type Rng = ReturnType<typeof createRng>

export function randomSeed(): number {
  return (Math.random() * 2 ** 32) | 0
}
