import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthPanel } from '../components/auth/AuthPanel'
import { deleteAccount, fetchAuthState, logout } from '../services/auth'

describe('authentication client', () => {
  it('parses anonymous and authenticated responses', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ authenticated: false, user: null }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        authenticated: true,
        user: { id: 7, email: 'user@example.com', displayName: 'User', profileImageUrl: null, membershipTier: 'FREE' },
      }), { status: 200 }))

    await expect(fetchAuthState()).resolves.toMatchObject({ status: 'anonymous' })
    await expect(fetchAuthState()).resolves.toMatchObject({ status: 'authenticated', user: { id: 7 } })
    expect(fetchMock).toHaveBeenCalledWith('/api/me', expect.objectContaining({ credentials: 'include' }))
  })

  it('sends the server-issued CSRF token for logout and deletion', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'csrf-token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ headerName: 'X-XSRF-TOKEN', token: 'csrf-token-2' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await logout()
    await deleteAccount()

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/logout', expect.objectContaining({
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': 'csrf-token' },
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/me', expect.objectContaining({
      method: 'DELETE',
      headers: { 'X-XSRF-TOKEN': 'csrf-token-2' },
    }))
  })
})

describe('AuthPanel', () => {
  it('requires a second explicit action before deleting the server account', async () => {
    const user = userEvent.setup()
    const onDeleteAccount = vi.fn().mockResolvedValue(true)
    render(<AuthPanel
      enabled
      state={{
        status: 'authenticated',
        user: { id: 1, email: 'user@example.com', displayName: '사용자', profileImageUrl: null, membershipTier: 'FREE' },
        error: null,
      }}
      pending={false}
      onLogout={vi.fn().mockResolvedValue(true)}
      onDeleteAccount={onDeleteAccount}
    />)

    await user.click(screen.getByRole('button', { name: '회원 탈퇴' }))
    expect(onDeleteAccount).not.toHaveBeenCalled()
    expect(screen.getByText('서버 계정을 삭제할까요?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(onDeleteAccount).toHaveBeenCalledOnce()
  })
})
