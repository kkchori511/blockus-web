// 버튼용 선 아이콘(24×24). 글꼴에 따라 모양이 달라지는 유니코드 기호 대신 쓴다.

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const UndoIcon = () => (
  <svg {...base}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </svg>
)

export const RotateIcon = () => (
  <svg {...base}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </svg>
)

export const FlipIcon = () => (
  <svg {...base}>
    <path d="M12 3v18" strokeDasharray="2 3" />
    <path d="M8 7 3 17h5z" />
    <path d="M16 7l5 10h-5z" />
  </svg>
)

export const ChevronLeftIcon = () => (
  <svg {...base}>
    <path d="m15 18-6-6 6-6" />
  </svg>
)

export const ChevronRightIcon = () => (
  <svg {...base}>
    <path d="m9 18 6-6-6-6" />
  </svg>
)

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
)
