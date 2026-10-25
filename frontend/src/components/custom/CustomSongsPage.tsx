import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, FileText, ScanText, Trash2 } from 'lucide-react'
import { deleteCustomSong, getCustomSongs, saveCustomSong, type VocaDatabase } from '../../db'
import type { CustomSongContent } from '../../types/content'
import type { StudyLanguage, WordItem } from '../../types/word'
import { createCustomSongFromLyrics, CustomSongValidationError } from '../../utils/customSong'
import { CustomSongLearning } from './CustomSongLearning'
import { BrandLogo } from '../common/BrandLogo'

interface CustomSongsPageProps {
  database: VocaDatabase
  selectedContentId?: string
  loadVocabulary: (language: StudyLanguage) => Promise<readonly WordItem[]>
  onSelectSong: (contentId: string) => void
  onCustomHome: () => void
  onHome: () => void
}

export function CustomSongsPage({ database, selectedContentId, loadVocabulary, onSelectSong, onCustomHome, onHome }: CustomSongsPageProps) {
  const songs = useLiveQuery(() => getCustomSongs(database), [database], [])
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState<StudyLanguage>('en')
  const [lyrics, setLyrics] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const removeSong = async (song: CustomSongContent): Promise<void> => {
    if (!window.confirm(`‘${song.title}’과 학습 기록을 모두 삭제할까요?`)) return
    setError(null)
    try {
      await deleteCustomSong(song.contentId, database)
      setMessage(`${song.title}을(를) 삭제했어요.`)
    } catch {
      setError('텍스트 단어장을 삭제하지 못했어요. 다시 시도해 주세요.')
    }
  }

  const selectedSong = songs.find(({ contentId }) => contentId === selectedContentId)
  if (selectedSong) {
    return <CustomSongLearning song={selectedSong} database={database} onBack={onCustomHome} />
  }

  const createSong = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)
    setError(null)
    try {
      const vocabulary = await loadVocabulary(language)
      const content = createCustomSongFromLyrics({ title, language, lyrics, vocabulary })
      const existing = await database.customContents.get(content.contentId)
      await saveCustomSong({ ...content, createdAt: existing?.createdAt ?? content.createdAt }, database)
      setLyrics('')
      setMessage(`${content.title}에서 학습 표현 ${content.words.length}개를 만들었어요.`)
      onSelectSong(content.contentId)
    } catch (cause) {
      setError(cause instanceof CustomSongValidationError ? cause.userMessage : '단어장을 만들지 못했어요. 다시 시도해 주세요.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-dvh bg-toss-bg px-4 py-4 sm:px-6 lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex w-full max-w-5xl flex-col lg:h-full">
        <header className="flex items-center justify-between gap-4">
          <button type="button" className="inline-flex items-center gap-2 text-lg" onClick={onHome} aria-label="워드득 홈">
            <ArrowLeft className="size-5" aria-hidden="true" /> <BrandLogo compact />
          </button>
          <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-600">내 텍스트</span>
        </header>

        <section className="mt-4 grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1.12fr_0.88fr]">
          <form className="flex min-h-0 flex-col rounded-toss-card bg-toss-surface p-5 shadow-toss-float" onSubmit={(event) => void createSong(event)}>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-violet-50 text-violet-600"><ScanText className="size-5" aria-hidden="true" /></span>
              <div><h1 className="text-xl font-extrabold text-toss-text">내 텍스트에서 회화 단어 찾기</h1><p className="mt-1 text-sm text-toss-muted">입력한 원문은 분석 후 저장하지 않아요.</p></div>
            </div>
            <div className="mt-4 grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] content-start gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="grid content-start gap-1.5 text-sm font-semibold text-toss-text">제목<input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="나중에 알아볼 수 있는 제목" className="h-11 rounded-toss-button border border-toss-border px-3 font-normal outline-none focus:border-toss-blue" /></label>
              <label className="grid content-start gap-1.5 text-sm font-semibold text-toss-text">언어<select value={language} onChange={(event) => setLanguage(event.target.value as StudyLanguage)} className="h-11 rounded-toss-button border border-toss-border px-3 font-normal outline-none focus:border-toss-blue"><option value="en">영어</option><option value="ja">일본어</option></select></label>
              <label className="grid min-h-0 grid-rows-[auto_auto_minmax(8rem,1fr)] gap-1.5 text-sm font-semibold text-toss-text sm:col-span-2">분석할 텍스트<span className="font-normal leading-5 text-toss-muted">영어 또는 일본어 원문만 입력해도 돼요. 찾은 단어에는 기존 단어장의 예문과 해석이 제공됩니다. 입력한 문맥을 예문으로 사용하려면 원문·한글 발음·한국어 해석을 3줄씩 입력해 주세요.</span><textarea required maxLength={50_000} rows={7} value={lyrics} onChange={(event) => setLyrics(event.target.value)} placeholder={'I need to get ready for work.\n\n또는\n\n君の毎日に 僕は似合わないかな\n키미노 마이니치니 보쿠와 니아와나이카나\n너의 매일에 나는 어울리지 않는 걸까'} className="h-full min-h-32 w-full resize-none rounded-toss-button border border-toss-border p-3 font-normal leading-6 outline-none focus:border-toss-blue" /></label>
            </div>
            <button type="submit" disabled={isSaving} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-toss-button bg-violet-600 px-5 font-bold text-white disabled:opacity-50"><ScanText className="size-5" aria-hidden="true" />{isSaving ? '텍스트를 분석하는 중…' : '회화 단어 찾기'}</button>
            {message ? <p role="status" className="mt-4 text-sm font-semibold text-toss-success">{message}</p> : null}
            {error ? <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
          </form>

          <section className="min-h-0 rounded-toss-card bg-toss-surface p-5 shadow-toss lg:flex lg:flex-col" aria-labelledby="custom-song-list-title">
            <div className="flex items-center gap-3"><FileText className="size-5 text-violet-600" aria-hidden="true" /><h2 id="custom-song-list-title" className="text-xl font-extrabold text-toss-text">내 텍스트 단어장</h2><span className="ml-auto text-sm font-semibold text-toss-muted">{songs.length}개</span></div>
            {songs.length === 0 ? <p className="mt-6 rounded-toss-button bg-toss-bg px-4 py-8 text-center text-sm text-toss-muted">아직 만든 텍스트 단어장이 없어요.</p> : <ul className="mt-4 grid gap-3 overflow-y-auto">{songs.map((song) => <li key={song.contentId} className="flex items-center gap-2 rounded-toss-button border border-toss-border p-2"><button type="button" onClick={() => onSelectSong(song.contentId)} className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left transition-colors hover:bg-toss-bg"><strong className="block truncate text-toss-text">{song.title}</strong><span className="mt-1 block truncate text-sm text-toss-muted">{song.language === 'ja' ? '일본어' : '영어'} · {song.words.length}개 회화 표현</span></button><button type="button" onClick={() => void removeSong(song)} className="grid size-11 shrink-0 place-items-center rounded-full text-toss-muted transition-colors hover:bg-red-50 hover:text-red-600" aria-label={`${song.title} 삭제`}><Trash2 className="size-4" aria-hidden="true" /></button></li>)}</ul>}
          </section>
        </section>
      </div>
    </main>
  )
}
