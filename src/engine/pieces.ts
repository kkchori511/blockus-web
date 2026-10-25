// 블로커스 21개 조각 정의와 회전·뒤집기 변형.
// 좌표는 [x, y] (x: 열, y: 행), 원점은 왼쪽 위.

export type Point = readonly [x: number, y: number]
export type Shape = readonly Point[]

export const PIECE_IDS = [
  'I1',
  'I2',
  'I3',
  'V3',
  'I4',
  'L4',
  'T4',
  'O4',
  'Z4',
  'F5',
  'I5',
  'L5',
  'N5',
  'P5',
  'T5',
  'U5',
  'V5',
  'W5',
  'X5',
  'Y5',
  'Z5',
] as const

export type PieceId = (typeof PIECE_IDS)[number]

const PATTERNS: Record<PieceId, string[]> = {
  I1: ['#'],
  I2: ['##'],
  I3: ['###'],
  V3: ['#.', '##'],
  I4: ['####'],
  L4: ['#..', '###'],
  T4: ['.#.', '###'],
  O4: ['##', '##'],
  Z4: ['##.', '.##'],
  F5: ['.##', '##.', '.#.'],
  I5: ['#####'],
  L5: ['#...', '####'],
  N5: ['##..', '.###'],
  P5: ['##', '##', '#.'],
  T5: ['###', '.#.', '.#.'],
  U5: ['#.#', '###'],
  V5: ['#..', '#..', '###'],
  W5: ['#..', '##.', '.##'],
  X5: ['.#.', '###', '.#.'],
  Y5: ['.#..', '####'],
  Z5: ['##.', '.#.', '.##'],
}

function parsePattern(rows: string[]): Shape {
  const cells: Point[] = []
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') cells.push([x, y])
  })
  return cells
}

/** 최소 좌표를 (0,0)으로 옮기고 정렬해 같은 모양이면 같은 배열이 되게 한다. */
export function normalize(shape: Shape): Shape {
  const minX = Math.min(...shape.map(([x]) => x))
  const minY = Math.min(...shape.map(([, y]) => y))
  return shape
    .map(([x, y]) => [x - minX, y - minY] as Point)
    .sort((a, b) => a[1] - b[1] || a[0] - b[0])
}

export function shapeKey(shape: Shape): string {
  return shape.map(([x, y]) => `${x},${y}`).join(';')
}

/** 시계 방향 90° 회전을 rotation번 한 뒤, flipped면 좌우로 뒤집는다. */
export function transform(shape: Shape, rotation: number, flipped: boolean): Shape {
  let cells = shape
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i++) cells = cells.map(([x, y]) => [-y, x] as Point)
  if (flipped) cells = cells.map(([x, y]) => [-x, y] as Point)
  return normalize(cells)
}

function uniqueOrientations(shape: Shape): Shape[] {
  const seen = new Map<string, Shape>()
  for (const flipped of [false, true]) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const t = transform(shape, rotation, flipped)
      const key = shapeKey(t)
      if (!seen.has(key)) seen.set(key, t)
    }
  }
  return [...seen.values()]
}

export interface PieceDef {
  id: PieceId
  shape: Shape
  size: number
  orientations: Shape[]
}

export const PIECES: Record<PieceId, PieceDef> = Object.fromEntries(
  PIECE_IDS.map((id) => {
    const shape = normalize(parsePattern(PATTERNS[id]))
    return [id, { id, shape, size: shape.length, orientations: uniqueOrientations(shape) }]
  }),
) as Record<PieceId, PieceDef>

export const TOTAL_CELLS = PIECE_IDS.reduce((sum, id) => sum + PIECES[id].size, 0)

export function cellCount(ids: readonly PieceId[]): number {
  return ids.reduce((sum, id) => sum + PIECES[id].size, 0)
}
