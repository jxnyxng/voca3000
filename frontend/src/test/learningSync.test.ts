import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VocaDatabase } from '../db'
import { useLearningSync } from '../hooks/useLearningSync'
import { downloadLearningData, LearningSyncError, uploadLearningData } from '../services/learningSync'

describe('learning sync', () => {
  const databases: VocaDatabase[] = []

  afterEach(async () => {
    vi.useRealTimers()
    await Promise.all(databases.map(async (database) => {
      database.close()
      await database.delete()
    }))
  })

  it('preserves the response status when sync authentication has expired', async () => {
    const database = new VocaDatabase(`sync-auth-${crypto.randomUUID()}`)
    databases.push(database)
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 401 }))

    await expect(downloadLearningData(database)).rejects.toEqual(
      expect.objectContaining<Partial<LearningSyncError>>({ name: 'LearningSyncError', status: 401 }),
    )
  })

  it('uploads a local snapshot with the server CSRF token', async () => {
    const database = new VocaDatabase(`sync-upload-${crypto.randomUUID()}`)
    databases.push(database)
    await database.daySessions.put({ contentId: 'builtin:en:day-1', completedStudy: true, koToEnHighScore: 80, enToKoHighScore: 70 })
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'token' })))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await uploadLearningData(database)

    const request = fetchMock.mock.calls[1]
    expect(request[0]).toBe('/api/sync')
    expect(request[1]).toEqual(expect.objectContaining({ method: 'PUT', headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'token' }) }))
    expect(JSON.parse(String(request[1]?.body)).daySessions).toHaveLength(1)
  })

  it('merges server records without deleting local-only learning records', async () => {
    const database = new VocaDatabase(`sync-download-${crypto.randomUUID()}`)
    databases.push(database)
    await database.daySessions.put({ contentId: 'old', completedStudy: false, koToEnHighScore: 0, enToKoHighScore: 0 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      progress: [],
      daySessions: [{ contentId: 'new', completedStudy: true, koToEnHighScore: 90, enToKoHighScore: 85 }],
    })))

    await downloadLearningData(database)

    expect(await database.daySessions.orderBy('contentId').toArray()).toEqual([
      { contentId: 'new', completedStudy: true, koToEnHighScore: 90, enToKoHighScore: 85 },
      { contentId: 'old', completedStudy: false, koToEnHighScore: 0, enToKoHighScore: 0 },
    ])
  })

  it('keeps irreversible completion and highest scores while merging', async () => {
    const database = new VocaDatabase(`sync-merge-${crypto.randomUUID()}`)
    databases.push(database)
    await database.daySessions.put({
      contentId: 'builtin:en:day-1', completedStudy: true,
      koToEnHighScore: 90, enToKoHighScore: 40,
    })
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({
      progress: [],
      daySessions: [{
        contentId: 'builtin:en:day-1', completedStudy: false,
        koToEnHighScore: 50, enToKoHighScore: 80,
      }],
    })))

    await downloadLearningData(database)

    expect(await database.daySessions.get('builtin:en:day-1')).toMatchObject({
      completedStudy: true, koToEnHighScore: 90, enToKoHighScore: 80,
    })
  })

  it('stays quiet for transient failures and warns only after repeated retries', async () => {
    vi.useFakeTimers()
    const database = new VocaDatabase(`sync-retry-${crypto.randomUUID()}`)
    databases.push(database)
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network unavailable'))

    const { result } = renderHook(() => useLearningSync(database, 1))
    await act(async () => { await Promise.resolve() })
    expect(result.current.issue).toBeNull()

    await act(async () => { await vi.advanceTimersByTimeAsync(5_000) })
    expect(result.current.issue).toBeNull()

    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
    expect(result.current.issue).toBe('unavailable')
  })

  it('warns immediately when the session has expired and clears after a successful retry', async () => {
    const database = new VocaDatabase(`sync-session-${crypto.randomUUID()}`)
    databases.push(database)
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))

    const { result } = renderHook(() => useLearningSync(database, 1))
    await waitFor(() => expect(result.current.issue).toBe('auth-required'))

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ progress: [], daySessions: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    act(() => result.current.retry())

    await waitFor(() => expect(result.current.issue).toBeNull())
  })
})
