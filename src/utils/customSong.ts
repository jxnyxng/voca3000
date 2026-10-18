import { customSongContentId, type CustomSongContent } from '../types/content'
import type { StudyLanguage, WordItem } from '../types/word'
import { normalizeEnglish, normalizeJapanese } from './textMatcher'

export type CustomSongErrorCode = 'INVALID_FIELD' | 'NO_MATCHES'

export class CustomSongValidationError extends Error {
  readonly userMessage: string
  readonly code: CustomSongErrorCode
  readonly path: string

  constructor(code: CustomSongErrorCode, path: string, detail: string) {
    super(`${path}: ${detail}`)
    this.name = 'CustomSongValidationError'
    this.code = code
    this.path = path
    this.userMessage = code === 'NO_MATCHES'
      ? '기존 단어장에서 학습할 표현을 찾지 못했어요. 언어와 가사를 확인해 주세요.'
      : '곡 정보를 모두 올바르게 입력해 주세요.'
  }
}

interface CreateCustomSongOptions {
  title: string
  artist: string
  language: StudyLanguage
  lyrics: string
  vocabulary: readonly WordItem[]
  now?: string
}

function required(value: string, path: string, maxLength: number): string {
  const result = value.trim()
  if (result === '' || result.length > maxLength) {
    throw new CustomSongValidationError('INVALID_FIELD', path, `1자 이상 ${maxLength}자 이하여야 합니다.`)
  }
  return result
}

function stableSongId(title: string, artist: string, language: StudyLanguage): string {
  const input = `${language}\u0000${title.toLocaleLowerCase()}\u0000${artist.toLocaleLowerCase()}`
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
  }
  return `song-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}

function parseAnnotatedLyrics(
  lyrics: string,
  language: StudyLanguage,
  vocabulary: readonly WordItem[],
): WordItem[] | null {
  const lines = lyrics.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 3 || lines.length % 3 !== 0) return null
  const hasHangul = (value: string) => /[가-힣]/.test(value)
  const hasTargetText = language === 'ja'
    ? (value: string) => /[\u3040-\u30ff\u3400-\u9fff]/.test(value)
    : (value: string) => /[a-z]/i.test(value)
  const groups = Array.from({ length: lines.length / 3 }, (_, index) => ({
    text: lines[index * 3]!,
    pronunciation: lines[index * 3 + 1]!,
    meaning: lines[index * 3 + 2]!,
  }))
  if (groups.some(({ text, pronunciation, meaning }) =>
    !hasTargetText(text) || !hasHangul(pronunciation) || !hasHangul(meaning))) return null

  const normalize = language === 'ja' ? normalizeJapanese : normalizeEnglish
  const candidates = vocabulary.filter((word) => (word.language ?? 'en') === language)
  const seenWords = new Set<string>()
  const matchedWords = groups.flatMap(({ text, pronunciation, meaning }, groupIndex) => {
    const normalizedText = normalize(text)
    return candidates.flatMap((word) => {
      const normalizedWord = normalize(word.word)
      const position = normalizedText.indexOf(normalizedWord)
      if (position < 0 || seenWords.has(normalizedWord)) return []
      seenWords.add(normalizedWord)
      return [{
        word: {
          ...word,
          day: 1,
          language,
          exampleEn: text,
          ...(language === 'ja' ? { examplePronunciation: pronunciation } : {}),
          exampleKo: meaning,
        },
        order: groupIndex * 100_000 + position,
      }]
    })
  }).sort((left, right) => left.order - right.order)

  return matchedWords.map(({ word }, index) => ({ ...word, id: `item-${index + 1}` }))
}

export function createCustomSongFromLyrics({
  title: rawTitle,
  artist: rawArtist,
  language,
  lyrics: rawLyrics,
  vocabulary,
  now = new Date().toISOString(),
}: CreateCustomSongOptions): CustomSongContent {
  const title = required(rawTitle, 'title', 200)
  const artist = required(rawArtist, 'artist', 200)
  const lyrics = required(rawLyrics, 'lyrics', 50_000)
  const annotatedWords = parseAnnotatedLyrics(lyrics, language, vocabulary)
  const normalize = language === 'ja' ? normalizeJapanese : normalizeEnglish
  const normalizedLyrics = normalize(lyrics)
  const matches = vocabulary
    .filter((word) => (word.language ?? 'en') === language)
    .flatMap((word) => {
      const position = normalizedLyrics.indexOf(normalize(word.word))
      return position < 0 ? [] : [{ word, position }]
    })
    .sort((left, right) => left.position - right.position)

  if ((annotatedWords === null && matches.length === 0) || annotatedWords?.length === 0) {
    throw new CustomSongValidationError('NO_MATCHES', 'lyrics', '일치하는 기존 어휘가 없습니다.')
  }

  const sourceId = stableSongId(title, artist, language)
  return {
    contentId: customSongContentId(sourceId),
    schemaVersion: 1,
    type: 'song',
    sourceId,
    title,
    artist,
    language,
    words: annotatedWords ?? matches.map(({ word }, index) => ({ ...word, id: `item-${index + 1}`, day: 1, language })),
    createdAt: now,
    updatedAt: now,
  }
}
