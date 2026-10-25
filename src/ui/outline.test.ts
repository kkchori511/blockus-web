import { describe, expect, it } from 'vitest'
import { PIECES } from '../engine'
import { exposedRuns, insetLoop, outlineLoops } from './outline'

describe('외곽선', () => {
  it('정사각형 조각은 꼭짓점 4개, L자는 6개', () => {
    expect(outlineLoops(PIECES.O4.shape)).toEqual([
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
      ],
    ])
    expect(outlineLoops(PIECES.L5.shape)[0]).toHaveLength(6)
    expect(outlineLoops(PIECES.X5.shape)[0]).toHaveLength(12)
  })

  it('안쪽으로 들이면 볼록·오목 모서리 모두 안으로 움직인다', () => {
    const [loop] = outlineLoops(PIECES.V3.shape) // (0,0),(0,1),(1,1)
    const inset = insetLoop(loop, 0.1)
    expect(inset).toContainEqual([0.1, 0.1])
    // 오목 모서리 (1,1): 세로 변 x=1은 왼쪽으로, 가로 변 y=1은 아래로 들어간다
    expect(inset).toContainEqual([0.9, 1.1])
  })

  it('드러난 윗변은 한 줄로 이어진다', () => {
    expect(exposedRuns(PIECES.I4.shape, 'top')).toEqual([{ start: [0, 0], end: [4, 0] }])
    expect(exposedRuns(PIECES.T4.shape, 'top')).toHaveLength(3)
  })
})
