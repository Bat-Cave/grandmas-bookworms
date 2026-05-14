type ColorRange = {
  hueMin: number // 0–360
  hueMax: number // 0–360
  saturationMin: number // 0–100
  saturationMax: number // 0–100
  lightnessMin: number // 0–100
  lightnessMax: number // 0–100
}

const DEFAULT_RANGE: ColorRange = {
  hueMin: 0,
  hueMax: 360,
  saturationMin: 55,
  saturationMax: 75,
  lightnessMin: 45,
  lightnessMax: 60,
}

export function stringToColor(
  input: string,
  range: Partial<ColorRange> = {},
): string {
  const config: ColorRange = { ...DEFAULT_RANGE, ...range }
  const hash = hashString(input)

  const h = map(hash, 0, 360, config.hueMin, config.hueMax)
  const s = map(hash >> 8, 0, 360, config.saturationMin, config.saturationMax)
  const l = map(hash >> 16, 0, 360, config.lightnessMin, config.lightnessMax)

  return hslToHex(h % 360, clamp(s, 0, 100), clamp(l, 0, 100))
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
    hash |= 0
  }
  return Math.abs(hash)
}

function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const normalized = (value % (inMax - inMin)) / (inMax - inMin)
  return outMin + normalized * (outMax - outMin)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100

  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))

  const r = Math.round(255 * f(0))
  const g = Math.round(255 * f(8))
  const b = Math.round(255 * f(4))

  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function getHexHue(hex: string): number {
  // 1. Clean the string and expand shorthand (e.g., "03f" -> "0033ff")
  let cleaned = hex.replace(/^#/, '')
  if (cleaned.length === 3) {
    cleaned = cleaned
      .split('')
      .map((char) => char + char)
      .join('')
  }

  // 2. Parse channels into integers (0-255)
  const r = parseInt(cleaned.substring(0, 2), 16)
  const g = parseInt(cleaned.substring(2, 4), 16)
  const b = parseInt(cleaned.substring(4, 6), 16)

  // 3. Normalize RGB values to fractions of 1
  const rNorm = r / 255
  const gNorm = g / 255
  const bNorm = b / 255

  const max = Math.max(rNorm, gNorm, bNorm)
  const min = Math.min(rNorm, gNorm, bNorm)
  const delta = max - min

  let h = 0

  // 4. Calculate hue based on which channel is dominant
  if (delta === 0) {
    h = 0 // Achromatic (gray, black, white)
  } else {
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / delta + (gNorm < bNorm ? 6 : 0)
        break
      case gNorm:
        h = (bNorm - rNorm) / delta + 2
        break
      case bNorm:
        h = (rNorm - gNorm) / delta + 4
        break
    }
    h = Math.round(h * 60) // Convert to degrees
  }

  return h
}

export function getHueDifference(h1: number, h2: number): number {
  const diff = ((h2 - h1 + 180) % 360) - 180
  return diff < -180 ? diff + 360 : diff
}

export function getAbsoluteHueDifference(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2) % 360
  return diff > 180 ? 360 - diff : diff
}
