import type { QuizMode, WordItem } from '../types/word'

export type TextMatcherErrorCode = 'EMPTY_ANSWER_SET' | 'ANSWER_COLLISION' | 'INVALID_MODE'

export class TextMatcherError extends Error {
  readonly code: TextMatcherErrorCode

  constructor(code: TextMatcherErrorCode, detail: string) {
    super(detail)
    this.name = 'TextMatcherError'
    this.code = code
  }
}

export interface QuizEvaluation {
  isCorrect: boolean
  normalizedInput: string
  acceptedAnswers: ReadonlySet<string>
}

export function normalizeKorean(text: string): string {
  if (!text) return ''

  return text
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[~!?.,;:'"`(){}·…\s]/g, '')
    .replaceAll('[', '')
    .replaceAll(']', '')
}

export function normalizeEnglish(text: string): string {
  if (!text) return ''

  return text
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, '')
    .replace(/\s+/g, ' ')
}

export function normalizeJapanese(text: string): string {
  if (!text) return ''
  return text.normalize('NFKC').trim().toLowerCase().replace(/[\s。、！？!?.,・「」『』（）()]/g, '')
}

function requireMode(mode: QuizMode): void {
  if (mode !== 'ko-to-en' && mode !== 'en-to-ko') {
    throw new TextMatcherError('INVALID_MODE', `Unsupported quiz mode: ${String(mode)}.`)
  }
}

export function buildAcceptedAnswerSet(word: WordItem, mode: QuizMode): Set<string> {
  requireMode(mode)
  const answers =
    mode === 'ko-to-en'
      ? [
          word.word,
          ...word.acceptableAnswersEn,
          ...(word.language === 'ja' ? [word.pronunciation] : []),
        ]
      : [word.meaning, ...word.acceptableAnswersKo]
  const normalize = mode === 'ko-to-en'
    ? word.language === 'ja' ? normalizeJapanese : normalizeEnglish
    : normalizeKorean
  const acceptedAnswers = new Set(answers.map(normalize).filter((answer) => answer !== ''))

  if (acceptedAnswers.size === 0) {
    throw new TextMatcherError(
      'EMPTY_ANSWER_SET',
      `Word ${word.id} has no usable answers for ${mode}.`,
    )
  }

  return acceptedAnswers
}

function withoutFinalHada(value: string): string {
  return value.endsWith('하다') ? value.slice(0, -2) : value
}

function matchesWithOptionalHada(input: string, acceptedAnswers: ReadonlySet<string>): boolean {
  const inputWithoutHada = withoutFinalHada(input)
  if (inputWithoutHada.length < 2) {
    return false
  }

  return [...acceptedAnswers].some((answer) => {
    const answerWithoutHada = withoutFinalHada(answer)
    return answerWithoutHada.length >= 2 && inputWithoutHada === answerWithoutHada
  })
}

export function evaluateQuizAnswer(
  input: string,
  word: WordItem,
  mode: QuizMode,
): QuizEvaluation {
  requireMode(mode)
  const acceptedAnswers = buildAcceptedAnswerSet(word, mode)
  const normalizedInput = mode === 'ko-to-en'
    ? word.language === 'ja' ? normalizeJapanese(input) : normalizeEnglish(input)
    : normalizeKorean(input)

  if (normalizedInput === '') {
    return { isCorrect: false, normalizedInput, acceptedAnswers }
  }

  if (mode === 'en-to-ko' && normalizedInput.length < 2) {
    return { isCorrect: false, normalizedInput, acceptedAnswers }
  }

  const isExactMatch = acceptedAnswers.has(normalizedInput)
  const isCorrect =
    isExactMatch ||
    (mode === 'en-to-ko' && matchesWithOptionalHada(normalizedInput, acceptedAnswers))

  return { isCorrect, normalizedInput, acceptedAnswers }
}

export function assertNoAnswerCollisions(words: readonly WordItem[], mode: QuizMode): void {
  requireMode(mode)
  const owners = new Map<string, string>()

  words.forEach((word) => {
    buildAcceptedAnswerSet(word, mode).forEach((answer) => {
      const owner = owners.get(answer)
      if (owner !== undefined && owner !== word.id) {
        throw new TextMatcherError(
          'ANSWER_COLLISION',
          `Normalized ${mode} answer "${answer}" is shared by ${owner} and ${word.id}.`,
        )
      }
      owners.set(answer, word.id)
    })
  })
}
