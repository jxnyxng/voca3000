import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteCustomSong, deleteDatabase, getCustomSongs, saveCustomSong, toggleMastered, updateQuizHighScore, VocaDatabase } from '../db'
import { createCustomSongFromLyrics } from '../utils/customSong'
import { studyWords } from './fixtures/study'

const now = '2026-10-18T00:00:00.000Z'

describe('custom song parsing', () => {
  it('extracts known vocabulary in lyric order and generates internal IDs', () => {
    const song = createCustomSongFromLyrics({
      title: 'Blue Hour', artist: 'Example Artist', language: 'en',
      lyrics: 'First I commute, then I get ready for the blue hour.', vocabulary: studyWords, now,
    })
    expect(song.contentId).toMatch(/^custom:song:song-[a-f0-9]{16}$/)
    expect(song.words.map(({ word }) => word)).toEqual(['commute', 'get ready'])
    expect(song.words.map(({ id }) => id)).toEqual(['item-1', 'item-2'])
    expect(song.createdAt).toBe(now)
  })

  it('does not store raw lyrics and rejects songs without known vocabulary', () => {
    const song = createCustomSongFromLyrics({ title: 'Song', artist: 'Artist', language: 'en', lyrics: 'commute', vocabulary: studyWords })
    expect(song).not.toHaveProperty('lyrics')
    expect(() => createCustomSongFromLyrics({ title: 'Song', artist: 'Artist', language: 'en', lyrics: 'xyzzy', vocabulary: studyWords })).toThrow(/일치하는 기존 어휘/)
  })

  it('creates text vocabulary with only a user-defined title', () => {
    const content = createCustomSongFromLyrics({ title: '출근길 영상', language: 'en', lyrics: 'I commute every day.', vocabulary: studyWords, now })
    expect(content.title).toBe('출근길 영상')
    expect(content.artist).toBeUndefined()
    expect(content.words.map(({ word }) => word)).toContain('commute')
  })

  it('extracts individual vocabulary from annotated groups and keeps each group as context', () => {
    const japaneseVocabulary = [
      { ...studyWords[0]!, id: 'j0001', word: '毎日', meaning: '매일', pronunciation: 'まいにち', language: 'ja' as const },
      { ...studyWords[1]!, id: 'j0002', word: '雪', meaning: '눈', pronunciation: 'ゆき', language: 'ja' as const },
    ]
    const song = createCustomSongFromLyrics({
      title: 'Winter Song', artist: 'Artist', language: 'ja', vocabulary: japaneseVocabulary,
      lyrics: `君の毎日に 僕は似合わないかな
키미노 마이니치니 보쿠와 니아와나이카나
너의 매일에 나는 어울리지 않는 걸까

白い空から 雪が落ちた
시로이 소라카라 유키가 오치타
하얀 하늘에서 눈이 내렸어

君の毎日に 僕は似合わないかな
키미노 마이니치니 보쿠와 니아와나이카나
너의 매일에 나는 어울리지 않는 걸까`,
    })
    expect(song.words).toHaveLength(2)
    expect(song.words[0]).toMatchObject({
      id: 'item-1',
      word: '毎日',
      pronunciation: 'まいにち',
      meaning: '매일',
      exampleEn: '君の毎日に 僕は似合わないかな',
      examplePronunciation: '키미노 마이니치니 보쿠와 니아와나이카나',
      exampleKo: '너의 매일에 나는 어울리지 않는 걸까',
      language: 'ja',
    })
  })
})

describe('custom song storage', () => {
  let database: VocaDatabase
  beforeEach(() => { database = new VocaDatabase(`Voca3000CustomSongTestDB-${crypto.randomUUID()}`) })
  afterEach(async () => { await deleteDatabase(database) })

  it('stores songs separately from learning progress', async () => {
    const song = createCustomSongFromLyrics({ title: 'Song', artist: 'Artist', language: 'en', lyrics: 'commute', vocabulary: studyWords, now })
    await saveCustomSong(song, database)
    expect((await getCustomSongs(database))[0]?.title).toBe('Song')
    expect(await database.progress.count()).toBe(0)
  })

  it('deletes a song and all of its learning records atomically', async () => {
    const song = createCustomSongFromLyrics({ title: 'Song', artist: 'Artist', language: 'en', lyrics: 'commute', vocabulary: studyWords, now })
    await saveCustomSong(song, database)
    await toggleMastered(song.contentId, song.words[0]!.id, database)
    await updateQuizHighScore(song.contentId, 'ko-to-en', 90, database)

    await deleteCustomSong(song.contentId, database)

    expect(await database.customContents.get(song.contentId)).toBeUndefined()
    expect(await database.progress.where('contentId').equals(song.contentId).count()).toBe(0)
    expect(await database.daySessions.get(song.contentId)).toBeUndefined()
  })
})
