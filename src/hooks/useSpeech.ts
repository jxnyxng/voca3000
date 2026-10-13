import { useCallback, useEffect, useRef, useState } from 'react'

const SPEECH_ERROR_MESSAGE = '발음을 재생하지 못했어요. 다시 시도해 주세요.'

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

function selectEnglishVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return voices.find(({ lang }) => lang.toLowerCase() === 'en-us')
    ?? voices.find(({ lang }) => lang.toLowerCase().startsWith('en-'))
    ?? null
}

export interface SpeechControls {
  speak: (text: string) => void
  stop: () => void
  isPlaying: boolean
  isSupported: boolean
  error: string | null
}

export function useSpeech(): SpeechControls {
  const [synthesis] = useState(getSpeechSynthesis)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isSupported = synthesis !== null && typeof SpeechSynthesisUtterance !== 'undefined'

  const stop = useCallback(() => {
    utteranceRef.current = null
    setIsPlaying(false)
    synthesis?.cancel()
  }, [synthesis])

  const speak = useCallback((text: string) => {
    if (!synthesis || typeof SpeechSynthesisUtterance === 'undefined') return

    utteranceRef.current = null
    synthesis.cancel()
    setIsPlaying(false)
    setError(null)

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.92
      if (voiceRef.current) utterance.voice = voiceRef.current
      utterance.onstart = () => {
        if (utteranceRef.current === utterance) setIsPlaying(true)
      }
      utterance.onend = () => {
        if (utteranceRef.current !== utterance) return
        utteranceRef.current = null
        setIsPlaying(false)
      }
      utterance.onerror = () => {
        if (utteranceRef.current !== utterance) return
        utteranceRef.current = null
        setIsPlaying(false)
        setError(SPEECH_ERROR_MESSAGE)
      }
      utteranceRef.current = utterance
      synthesis.speak(utterance)
    } catch {
      utteranceRef.current = null
      setIsPlaying(false)
      setError(SPEECH_ERROR_MESSAGE)
    }
  }, [synthesis])

  useEffect(() => {
    if (!synthesis) return

    const refreshVoices = (): void => {
      voiceRef.current = selectEnglishVoice(synthesis.getVoices())
    }
    refreshVoices()
    synthesis.addEventListener('voiceschanged', refreshVoices)

    return () => {
      synthesis.removeEventListener('voiceschanged', refreshVoices)
      utteranceRef.current = null
      synthesis.cancel()
    }
  }, [synthesis])

  return { speak, stop, isPlaying, isSupported, error }
}
