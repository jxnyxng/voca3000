import { useCallback, useEffect, useState } from 'react'
import { deleteAccount, fetchAuthState, logout } from '../services/auth'
import type { AuthState } from '../types/auth'

const ANONYMOUS: AuthState = { status: 'anonymous', user: null, error: null }
const ERROR_MESSAGE = '로그인 상태를 확인하지 못했어요. 학습은 계속 이용할 수 있어요.'

export function useAuth(enabled: boolean) {
  const [state, setState] = useState<AuthState>(enabled
    ? { status: 'loading', user: null, error: null }
    : ANONYMOUS)
  const [pending, setPending] = useState(false)

  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!enabled) return
    try {
      setState(await fetchAuthState(signal))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setState({ status: 'anonymous', user: null, error: ERROR_MESSAGE })
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    async function load() {
      try {
        setState(await fetchAuthState(controller.signal))
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({ status: 'anonymous', user: null, error: ERROR_MESSAGE })
      }
    }
    void load()
    return () => controller.abort()
  }, [enabled])

  const run = useCallback(async (operation: () => Promise<void>) => {
    setPending(true)
    try {
      await operation()
      setState(ANONYMOUS)
      return true
    } catch {
      setState((current) => current.status === 'loading'
        ? { status: 'anonymous', user: null, error: '요청을 처리하지 못했어요. 다시 시도해 주세요.' }
        : { ...current, error: '요청을 처리하지 못했어요. 다시 시도해 주세요.' })
      return false
    } finally {
      setPending(false)
    }
  }, [])

  return {
    state,
    pending,
    refresh: () => refresh(),
    logout: () => run(logout),
    deleteAccount: () => run(deleteAccount),
  }
}
