import { useCallback, useEffect, useRef, useState } from 'react'

const SPEECH_ERROR_MESSAGE = '발음을 재생하지 못했어요. 다시 시도해 주세요.'

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  return window.speechSynthesis
}

function selectVoice(voices: readonly SpeechSynthesisVoice[], language: 'en-US' | 'ja-JP'): SpeechSynthesisVoice | null {
  const prefix = language.slice(0, 2).toLowerCase()
  return voices.find(({ lang }) => lang.toLowerCase() === language.toLowerCase())
    ?? voices.find(({ lang }) => lang.toLowerCase().startsWith(`${prefix}-`))
    ?? null
}

export interface SpeechControls {
  speak: (text: string) => void
  stop: () => void
  isPlaying: boolean
  isSupported: boolean
  error: string | null
}

export function useSpeech(language: 'en-US' | 'ja-JP' = 'en-US'): SpeechControls {
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
      utterance.lang = language
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
  }, [language, synthesis])

  useEffect(() => {
    if (!synthesis) return

    const refreshVoices = (): void => {
      voiceRef.current = selectVoice(synthesis.getVoices(), language)
    }
    refreshVoices()
    synthesis.addEventListener('voiceschanged', refreshVoices)

    return () => {
      synthesis.removeEventListener('voiceschanged', refreshVoices)
      utteranceRef.current = null
      synthesis.cancel()
    }
  }, [language, synthesis])

  return { speak, stop, isPlaying, isSupported, error }
}
