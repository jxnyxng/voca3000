import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SyncIssueNotice } from '../components/common/SyncIssueNotice'

describe('SyncIssueNotice', () => {
  it('renders nothing while background synchronization is healthy', () => {
    const { container } = render(<SyncIssueNotice issue={null} onRetry={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('explains that local learning data is safe and allows a retry after a lasting failure', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<SyncIssueNotice issue="unavailable" onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('이 기기에 안전하게 보관')
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('offers login again when the server session has expired', () => {
    render(<SyncIssueNotice issue="auth-required" onRetry={vi.fn()} />)
    expect(screen.getByRole('link', { name: '다시 로그인' })).toHaveAttribute('href', '/oauth2/authorization/google')
  })
})
