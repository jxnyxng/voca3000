import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackupModal } from '../components/common/BackupModal'
import { APP_VERSION } from '../constants/app'
import { deleteDatabase, VocaDatabase } from '../db'
import type { VocaBackupPayload } from '../types/backup'

const now = '2026-10-13T00:00:00.000Z'
const knownWordIds = new Set(['w0001'])

function payload(): VocaBackupPayload {
  return {
    schemaVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: now,
    totalMasteredCount: 1,
    data: {
      progress: [{
        wordId: 'w0001',
        isMastered: true,
        correctCountKoToEn: 1,
        incorrectCountKoToEn: 0,
        correctCountEnToKo: 0,
        incorrectCountEnToKo: 0,
        lastResultKoToEn: 'correct',
        lastStudiedAt: now,
      }],
      daySessions: [{
        day: 1,
        completedStudy: true,
        koToEnHighScore: 100,
        enToKoHighScore: 0,
      }],
    },
  }
}

function fileWithText(name: string, text: string): File {
  const file = new File([text], name, { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue(text) })
  return file
}

let database: VocaDatabase
let databaseNumber = 0

beforeEach(() => {
  databaseNumber += 1
  database = new VocaDatabase(`Voca3000BackupModalTestDB-${databaseNumber}`)
})

afterEach(async () => {
  vi.restoreAllMocks()
  await deleteDatabase(database)
})

function renderModal(overrides: Partial<React.ComponentProps<typeof BackupModal>> = {}) {
  const props: React.ComponentProps<typeof BackupModal> = {
    database,
    getKnownWordIds: vi.fn().mockResolvedValue(knownWordIds),
    onClose: vi.fn(),
    ...overrides,
  }
  return { ...render(<BackupModal {...props} />), props }
}

describe('BackupModal', () => {
  it('downloads a dated JSON backup and reports success', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn(() => 'blob:backup')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    await database.progress.put(payload().data.progress[0]!)
    renderModal()

    await user.click(screen.getByRole('button', { name: '백업 다운로드' }))
    expect(await screen.findByRole('status')).toHaveTextContent('다운로드했어요')
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    const clickedAnchor = click.mock.contexts[0]
    expect(clickedAnchor).toBeInstanceOf(HTMLAnchorElement)
    if (clickedAnchor instanceof HTMLAnchorElement) {
      expect(clickedAnchor.download).toBe('voca3000-backup-2026-10-13.json')
    }
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:backup')
  })

  it('validates first and restores only after explicit overwrite confirmation', async () => {
    const user = userEvent.setup()
    await database.progress.put({ ...payload().data.progress[0]!, wordId: 'old-word', isMastered: false })
    renderModal()
    const input = screen.getByLabelText('백업 파일 선택')
    await user.upload(input, fileWithText('valid.json', JSON.stringify(payload())))

    expect(await screen.findByText('현재 학습 기록을 모두 덮어씁니다.')).toBeInTheDocument()
    expect(await database.progress.get('old-word')).toBeDefined()
    await user.click(screen.getByRole('button', { name: '이 백업으로 덮어쓰기' }))

    expect(await screen.findByRole('status')).toHaveTextContent('복원했어요')
    expect(await database.progress.get('old-word')).toBeUndefined()
    expect(await database.progress.get('w0001')).toMatchObject({ isMastered: true })
    expect(await database.daySessions.get(1)).toMatchObject({ koToEnHighScore: 100 })
  })

  it('distinguishes JSON, version, and validation errors without changing data', async () => {
    const user = userEvent.setup()
    await database.progress.put(payload().data.progress[0]!)
    renderModal()
    const input = screen.getByLabelText('백업 파일 선택')

    await user.upload(input, fileWithText('broken.json', '{broken'))
    expect(await screen.findByRole('alert')).toHaveTextContent('올바른 JSON')
    await user.upload(input, fileWithText('version.json', JSON.stringify({ ...payload(), schemaVersion: 2 })))
    expect(await screen.findByRole('alert')).toHaveTextContent('지원하지 않는 백업 버전')
    await user.upload(input, fileWithText('invalid.json', JSON.stringify({ schemaVersion: 1 })))
    expect(await screen.findByRole('alert')).toHaveTextContent('백업 데이터가 올바르지 않아')
    expect(await database.progress.get('w0001')).toBeDefined()
  })

  it('traps focus, closes with Escape, and restores focus to the opener', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>백업 열기</button>
          {open ? <BackupModal database={database} getKnownWordIds={async () => knownWordIds} onClose={() => setOpen(false)} /> : null}
        </>
      )
    }
    render(<Harness />)
    const opener = screen.getByRole('button', { name: '백업 열기' })
    await user.click(opener)

    const close = screen.getByRole('button', { name: '백업 및 복원 닫기' })
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByLabelText('백업 파일 선택')).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(opener).toHaveFocus()
  })
})
