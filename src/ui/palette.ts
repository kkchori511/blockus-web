import type { Color } from '../engine'

export interface ColorTone {
  name: string
  base: string
  light: string
  dark: string
  /** 플레이어 영역 배경 */
  panel: string
  /** 플레이어 영역 테두리·강조 */
  accent: string
}

/** 플라스틱 조각 전용 색. 패널 색보다 채도가 높다(투명 재질은 흰 보드와 섞여 옅어지기 때문). */
export interface PlasticTone {
  base: string
  /** 두꺼운 가장자리, 바닥 두께 */
  dark: string
  /** 빛이 투과하는 얇은 띠 */
  light: string
}

export const PLASTIC: Record<Color, PlasticTone> = {
  0: { base: '#0758ff', dark: '#072b91', light: '#48a7ff' },
  1: { base: '#ffca05', dark: '#a96b00', light: '#ffe96b' },
  2: { base: '#f41418', dark: '#8f0712', light: '#ff6651' },
  3: { base: '#009b40', dark: '#005b29', light: '#47dc7c' },
}

export const PALETTE: Record<Color, ColorTone> = {
  0: { name: '파랑', base: '#1d63e0', light: '#7fb0ff', dark: '#0b3a9c', panel: '#dbe8fd', accent: '#2f6fe4' },
  1: { name: '노랑', base: '#f2b705', light: '#ffe27a', dark: '#b07c00', panel: '#fdf1cf', accent: '#e0a800' },
  2: { name: '빨강', base: '#e0312b', light: '#ff8a7f', dark: '#9c1410', panel: '#fbdcdb', accent: '#e0453f' },
  3: { name: '초록', base: '#1b9a47', light: '#77dc95', dark: '#0b6a2c', panel: '#d8f1df', accent: '#23a352' },
}
