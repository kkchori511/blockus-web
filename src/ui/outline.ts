// 칸 집합(폴리오미노)의 바깥 외곽선 계산.
// 조각을 칸별 버튼이 아닌 한 덩어리로 그리고, 미리보기 윤곽을 한 번에 두르기 위해 쓴다.

import type { Point, Shape } from '../engine'

type Edge = { from: Point; to: Point }

const key = ([x, y]: Point) => `${x},${y}`

/**
 * 외곽선 고리들. 화면 좌표(y 아래쪽) 기준 시계 방향이라 진행 방향의 오른쪽이 조각 안쪽이다.
 * 일직선으로 이어지는 점은 합쳐서 모서리 점만 남긴다.
 */
export function outlineLoops(cells: Shape): Point[][] {
  const filled = new Set(cells.map(key))
  const has = (x: number, y: number) => filled.has(`${x},${y}`)
  const edges: Edge[] = []
  for (const [x, y] of cells) {
    if (!has(x, y - 1)) edges.push({ from: [x, y], to: [x + 1, y] })
    if (!has(x + 1, y)) edges.push({ from: [x + 1, y], to: [x + 1, y + 1] })
    if (!has(x, y + 1)) edges.push({ from: [x + 1, y + 1], to: [x, y + 1] })
    if (!has(x - 1, y)) edges.push({ from: [x, y + 1], to: [x, y] })
  }
  const byStart = new Map<string, Edge[]>()
  for (const e of edges) byStart.set(key(e.from), [...(byStart.get(key(e.from)) ?? []), e])

  const used = new Set<Edge>()
  const loops: Point[][] = []
  for (const start of edges) {
    if (used.has(start)) continue
    const points: Point[] = []
    let e: Edge | undefined = start
    while (e && !used.has(e)) {
      used.add(e)
      points.push(e.from)
      e = byStart.get(key(e.to))?.find((n) => !used.has(n))
    }
    loops.push(removeCollinear(points))
  }
  return loops
}

function removeCollinear(points: Point[]): Point[] {
  return points.filter((p, i) => {
    const a = points[(i - 1 + points.length) % points.length]
    const b = points[(i + 1) % points.length]
    return !((a[0] === p[0] && p[0] === b[0]) || (a[1] === p[1] && p[1] === b[1]))
  })
}

/** 직교 다각형을 안쪽으로 d만큼 들인다. 각 꼭짓점을 양쪽 변의 안쪽 법선 합만큼 옮기면 된다. */
export function insetLoop(loop: Point[], d: number): Point[] {
  const n = loop.length
  return loop.map((p, i) => {
    const prev = loop[(i - 1 + n) % n]
    const next = loop[(i + 1) % n]
    const [ax, ay] = [Math.sign(p[0] - prev[0]), Math.sign(p[1] - prev[1])]
    const [bx, by] = [Math.sign(next[0] - p[0]), Math.sign(next[1] - p[1])]
    // 시계 방향 진행 (dx, dy)의 안쪽 법선은 (-dy, dx)
    return [p[0] + d * (-ay - by), p[1] + d * (ax + bx)] as Point
  })
}

export function loopsToPath(loops: Point[][]): string {
  return loops.map((loop) => `M${loop.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L')} Z`).join(' ')
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** 조각 외곽 path. inset만큼 안으로 들여 이웃 조각과 틈을 둔다. */
export function piecePath(cells: Shape, inset = 0): string {
  return loopsToPath(outlineLoops(cells).map((l) => (inset ? insetLoop(l, inset) : l)))
}

export type Side = 'top' | 'right' | 'bottom' | 'left'

/** 바깥으로 드러난 변들을 같은 줄끼리 이어 붙인 구간. 광택·투과 띠를 이어진 선으로 그릴 때 쓴다. */
export function exposedRuns(cells: Shape, side: Side): { start: Point; end: Point }[] {
  const filled = new Set(cells.map(key))
  const has = (x: number, y: number) => filled.has(`${x},${y}`)
  const [nx, ny] = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }[side]
  const horizontal = side === 'top' || side === 'bottom'
  const exposed = cells
    .filter(([x, y]) => !has(x + nx, y + ny))
    .sort((a, b) => (horizontal ? a[1] - b[1] || a[0] - b[0] : a[0] - b[0] || a[1] - b[1]))
  const runs: { start: Point; end: Point }[] = []
  for (const [x, y] of exposed) {
    const last = runs.at(-1)
    if (last && horizontal && last.end[1] === y && last.end[0] === x) last.end = [x + 1, y]
    else if (last && !horizontal && last.end[0] === x && last.end[1] === y) last.end = [x, y + 1]
    else runs.push(horizontal ? { start: [x, y], end: [x + 1, y] } : { start: [x, y], end: [x, y + 1] })
  }
  return runs
}
