import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteDatabase, VocaDatabase } from '../db'
import { useWordProgress } from '../hooks/useWordProgress'

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000HookTestDB-${databaseNumber}`)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteDatabase(database)
})

describe('useWordProgress', () => {
  it('loads an empty Day and exposes live progress updates', async () => {
    const { result } = renderHook(() =>
      useWordProgress({ wordIds: ['w0001', 'w0002'], day: 1, database }),
    )

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.masteredCount).toBe(0)
    expect(result.current.progressByWordId.size).toBe(0)

    await act(async () => {
      await result.current.toggleMastered('w0001')
    })

    await waitFor(() => expect(result.current.masteredCount).toBe(1))
    expect(result.current.progressByWordId.get('w0001')?.isMastered).toBe(true)
  })

  it('provides live Day session and quiz result updates', async () => {
    const { result } = renderHook(() =>
      useWordProgress({ wordIds: ['w0001'], day: 1, database }),
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.recordQuizResult('w0001', 'ko-to-en', false)
      await result.current.markStudyCompleted()
      await result.current.updateQuizHighScore('ko-to-en', 87)
    })

    await waitFor(() => {
      expect(result.current.progressByWordId.get('w0001')?.lastResultKoToEn).toBe('incorrect')
      expect(result.current.daySession).toMatchObject({
        completedStudy: true,
        koToEnHighScore: 87,
      })
    })
  })

  it('does not expose stale progress while the requested word list changes', async () => {
    await database.progress.put({
      wordId: 'w0001',
      isMastered: true,
      correctCountKoToEn: 0,
      incorrectCountKoToEn: 0,
      correctCountEnToKo: 0,
      incorrectCountEnToKo: 0,
      lastStudiedAt: '2026-10-12T00:00:00.000Z',
    })
    const { result, rerender } = renderHook(
      ({ wordIds }) => useWordProgress({ wordIds, day: 1, database }),
      { initialProps: { wordIds: ['w0001'] } },
    )
    await waitFor(() => expect(result.current.masteredCount).toBe(1))

    rerender({ wordIds: ['w0002'] })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.progressByWordId.size).toBe(0)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.masteredCount).toBe(0)
  })

  it('returns read errors and retries without hiding the failure', async () => {
    const bulkGet = vi
      .spyOn(database.progress, 'bulkGet')
      .mockRejectedValue(new Error('read failed'))
    const { result } = renderHook(() =>
      useWordProgress({ wordIds: ['w0001'], day: 1, database }),
    )

    await waitFor(() => expect(result.current.error?.message).toBe('read failed'))
    expect(result.current.isLoading).toBe(false)

    bulkGet.mockRestore()
    await act(async () => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('propagates write failures so the UI can roll back optimistic state', async () => {
    const { result } = renderHook(() =>
      useWordProgress({ wordIds: ['w0001'], day: 1, database }),
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    vi.spyOn(database.progress, 'put').mockRejectedValueOnce(new Error('write failed'))

    await expect(result.current.toggleMastered('w0001')).rejects.toThrow('write failed')
    expect(result.current.masteredCount).toBe(0)
  })
})
