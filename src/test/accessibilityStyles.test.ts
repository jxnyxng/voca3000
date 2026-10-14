/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const styles = readFileSync('src/index.css', 'utf8')

function colorToken(name: string): string {
  const value = styles.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]
  if (!value) throw new Error(`Missing color token: ${name}`)
  return value
}

function relativeLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    )
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('accessibility design tokens', () => {
  it('scopes the red and white visual theme to Japanese study', () => {
    expect(styles).toContain('.theme-japanese')
    expect(styles).toContain('--color-toss-blue: #b51224')
    expect(styles).toContain('--color-toss-ice-blue: #fff0f2')
  })

  it.each(['toss-blue', 'toss-muted', 'toss-success', 'toss-error'])(
    'keeps %s readable as normal-sized text on white',
    (token) => {
      expect(contrastRatio(colorToken(token), '#ffffff')).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('allows long user and learning content to wrap on narrow screens', () => {
    expect(styles).toMatch(/overflow-wrap:\s*anywhere/)
  })

  it('reserves scrollbar space so long panels do not shift the centered layout', () => {
    expect(styles).toMatch(/scrollbar-gutter:\s*stable/)
  })

  it('communicates clickable and disabled controls with the cursor', () => {
    expect(styles).toMatch(/button:not\(:disabled\)[\s\S]*cursor:\s*pointer/)
    expect(styles).toMatch(/button:disabled[\s\S]*cursor:\s*not-allowed/)
  })
})
