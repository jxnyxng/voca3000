import { useCallback, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toggleMastered, type VocaDatabase } from '../../db'

export function useWordListMastery(
  visibleWordIds: readonly string[],
  database: VocaDatabase,
) {
  const [masteryError, setMasteryError] = useState<string | null>(null)
  const [pendingMasteryIds, setPendingMasteryIds] = useState<ReadonlySet<string>>(() => new Set())
  const visibleWordIdsKey = visibleWordIds.join('\u0000')
  const visibleProgress = useLiveQuery(
    () => database.progress.bulkGet([...visibleWordIds]),
    [database, visibleWordIdsKey],
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
      await toggleMastered(wordId, database)
    } catch {
      setMasteryError('암기 상태를 저장하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setPendingMasteryIds((current) => {
        const next = new Set(current)
        next.delete(wordId)
        return next
      })
    }
  }, [database, pendingMasteryIds])

  const resetMasteryError = useCallback(() => setMasteryError(null), [])

  return {
    masteryError,
    pendingMasteryIds,
    masteredWordIds,
    toggleListMastery,
    resetMasteryError,
  }
}
