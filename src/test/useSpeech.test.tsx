import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpeech } from '../hooks/useSpeech'

class MockUtterance {
  readonly text: string
  lang = ''
  rate = 1
  voice: SpeechSynthesisVoice | null = null
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: (() => void) | null = null

  constructor(text: string) {
    this.text = text
  }
}

function voice(lang: string): SpeechSynthesisVoice {
  return { default: false, lang, localService: true, name: lang, voiceURI: lang }
}

function installSpeech(voices: SpeechSynthesisVoice[] = []) {
  const listeners = new Set<EventListenerOrEventListenerObject>()
  const synthesis = {
    cancel: vi.fn(),
    speak: vi.fn(),
    getVoices: vi.fn(() => voices),
    addEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener)),
  }
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis })
  Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance })
  return { synthesis, listeners }
}

afterEach(() => {
  Reflect.deleteProperty(window, 'speechSynthesis')
  Reflect.deleteProperty(globalThis, 'SpeechSynthesisUtterance')
})

describe('useSpeech', () => {
  it('reports unsupported environments without throwing', () => {
    const { result } = renderHook(() => useSpeech())
    expect(result.current.isSupported).toBe(false)
    expect(() => result.current.speak('hello')).not.toThrow()
  })

  it('refreshes voices and prioritizes en-US before other English voices', () => {
    const enGb = voice('en-GB')
    const enUs = voice('en-US')
    const { synthesis, listeners } = installSpeech([enGb])
    const { result } = renderHook(() => useSpeech())

    synthesis.getVoices.mockReturnValue([enGb, enUs])
    for (const listener of listeners) {
      if (typeof listener === 'function') listener(new Event('voiceschanged'))
      else listener.handleEvent(new Event('voiceschanged'))
    }
    act(() => result.current.speak('hello'))

    const utterance = synthesis.speak.mock.calls[0]![0] as MockUtterance
    expect(utterance.voice).toBe(enUs)
    expect(utterance.lang).toBe('en-US')
    expect(utterance.rate).toBe(0.92)
  })

  it('cancels before consecutive playback and ignores stale utterance events', () => {
    const { synthesis } = installSpeech()
    const { result } = renderHook(() => useSpeech())

    act(() => result.current.speak('first'))
    const first = synthesis.speak.mock.calls[0]![0] as MockUtterance
    act(() => first.onstart?.())
    expect(result.current.isPlaying).toBe(true)

    act(() => result.current.speak('second'))
    const second = synthesis.speak.mock.calls[1]![0] as MockUtterance
    act(() => {
      second.onstart?.()
      first.onend?.()
    })
    expect(result.current.isPlaying).toBe(true)
    expect(synthesis.cancel).toHaveBeenCalledTimes(2)
    act(() => second.onend?.())
    expect(result.current.isPlaying).toBe(false)
  })

  it('returns an accessible error state and cleans up on unmount', () => {
    const { synthesis } = installSpeech()
    const { result, unmount } = renderHook(() => useSpeech())
    act(() => result.current.speak('hello'))
    const utterance = synthesis.speak.mock.calls[0]![0] as MockUtterance
    act(() => utterance.onerror?.())
    expect(result.current.error).toContain('재생하지 못했어요')

    unmount()
    expect(synthesis.removeEventListener).toHaveBeenCalledWith('voiceschanged', expect.any(Function))
    expect(synthesis.cancel).toHaveBeenCalledTimes(2)
  })
})
