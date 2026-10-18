import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toggleMastered, type VocaDatabase } from '../../db'
import { builtinContentId, progressRecordId } from '../../types/content'
import type { WordItem } from '../../types/word'

export function useWordListMastery(
  visibleWords: readonly WordItem[],
  database: VocaDatabase,
) {
  const [masteryError, setMasteryError] = useState<string | null>(null)
  const [pendingMasteryIds, setPendingMasteryIds] = useState<ReadonlySet<string>>(() => new Set())
  const visibleProgressIds = visibleWords.map((word) =>
    progressRecordId(builtinContentId(word.language ?? 'en', word.day), word.id),
  )
  const visibleProgressIdsKey = visibleProgressIds.join('\u0000')
  const visibleProgress = useLiveQuery(
    () => database.progress.bulkGet(visibleProgressIds),
    [database, visibleProgressIdsKey],
    [],
  )
  const masteredWordIds = useMemo(
    () => new Set(visibleProgress.flatMap((record) => record?.isMastered ? [record.wordId] : [])),
    [visibleProgress],
  )

  const toggleListMastery = useCallback(async (wordId: string): Promise<void> => {
    if (pendingMasteryIds.has(wordId)) return
    setMasteryError(null)
    setPendingMasteryIds((current) => new Set(current).add(wordId))
    try {
      const word = visibleWords.find((candidate) => candidate.id === wordId)
      if (!word) throw new Error(`Unknown visible word: ${wordId}`)
      const contentId = builtinContentId(word.language ?? 'en', word.day)
      await toggleMastered(contentId, wordId, database)
    } catch {
      setMasteryError('암기 상태를 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setPendingMasteryIds((current) => {
        const next = new Set(current)
        next.delete(wordId)
        return next
      })
    }
  }, [database, pendingMasteryIds, visibleWords])

  const resetMasteryError = useCallback(() => setMasteryError(null), [])

  return {
    masteryError,
    pendingMasteryIds,
    masteredWordIds,
    toggleListMastery,
    resetMasteryError,
  }
}
