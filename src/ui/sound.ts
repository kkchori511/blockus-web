// 효과음. 음원 파일 없이 Web Audio로 짧은 소리를 합성한다.
// 브라우저는 사용자 조작 전에는 소리를 막으므로 첫 터치·클릭 때 오디오를 깨운다.

export type SoundName = 'place' | 'pick' | 'pass' | 'out' | 'undo' | 'tick' | 'gameOver'

const MUTE_KEY = 'blokus:muted'

let ctx: AudioContext | null = null
let muted = readMuted()

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function isMuted() {
  return muted
}

export function setMuted(value: boolean) {
  muted = value
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    // 저장이 막혀도 이번 실행 동안은 적용된다
  }
}

/** 첫 사용자 조작에서 한 번 부른다 */
export function unlockAudio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

function tone(freq: number, start: number, duration: number, { type = 'sine' as OscillatorType, gain = 0.15, endFreq }: { type?: OscillatorType; gain?: number; endFreq?: number } = {}) {
  if (!ctx) return
  const t = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration)
  osc.connect(g).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + duration + 0.02)
}

/** 플라스틱이 판에 끼워지는 짧은 '딸깍': 잡음 한 번 + 높은 톤 */
function click(start = 0, gain = 0.35) {
  if (!ctx) return
  const t = ctx.currentTime + start
  const len = Math.floor(ctx.sampleRate * 0.03)
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  const src = ctx.createBufferSource()
  src.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 2400
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(filter).connect(g).connect(ctx.destination)
  src.start(t)
}

export function play(name: SoundName) {
  if (muted || !ctx) return
  switch (name) {
    case 'place':
      click()
      tone(1200, 0, 0.06, { type: 'triangle', gain: 0.08 })
      tone(620, 0.03, 0.12, { gain: 0.08 })
      break
    case 'pick':
      tone(880, 0, 0.05, { type: 'triangle', gain: 0.05 })
      break
    case 'pass':
      tone(440, 0, 0.14, { gain: 0.1 })
      tone(330, 0.12, 0.2, { gain: 0.1 })
      break
    case 'out':
      tone(520, 0, 0.35, { type: 'triangle', gain: 0.1, endFreq: 260 })
      break
    case 'undo':
      tone(500, 0, 0.16, { type: 'triangle', gain: 0.08, endFreq: 900 })
      break
    case 'tick':
      tone(1500, 0, 0.04, { type: 'square', gain: 0.03 })
      break
    case 'gameOver':
      ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.4, { type: 'triangle', gain: 0.1 }))
      break
  }
}
