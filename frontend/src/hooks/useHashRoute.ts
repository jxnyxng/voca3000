import { useCallback, useEffect, useState } from 'react'
import type { AppTab } from '../types/navigation'

export type AppLanguageRoute = 'home' | 'profile' | 'english' | 'japanese' | 'custom'

export interface AppRoute {
  language: AppLanguageRoute
  day: number
  tab: AppTab
  customSongId?: string
}

const TAB_TO_PATH: Record<AppTab, string> = {
  study: 'study',
  'ko-to-en': 'quiz-from-korean',
  'en-to-ko': 'quiz-to-korean',
  incorrect: 'incorrect',
}

export function readRoute(): AppRoute {
  if (typeof window === 'undefined') return { language: 'home', day: 1, tab: 'study' }
  const parts = window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  const language = parts[0]
  if (language === 'profile') return { language, day: 1, tab: 'study' }
  if (language === 'custom') {
    const encodedSongId = parts[1] === 'song' ? parts[2] : undefined
    if (encodedSongId) {
      try {
        return { language, day: 1, tab: 'study', customSongId: decodeURIComponent(encodedSongId) }
      } catch {
        return { language, day: 1, tab: 'study' }
      }
    }
    return { language, day: 1, tab: 'study' }
  }
  if (language !== 'english' && language !== 'japanese') {
    return { language: 'home', day: 1, tab: 'study' }
  }
  const parsedDay = parts[1] === 'day' ? Number(parts[2]) : 1
  const day = Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 100 ? parsedDay : 1
  const tabPath = parts[3]
  const tab = (Object.entries(TAB_TO_PATH).find(([, path]) => path === tabPath)?.[0] ?? 'study') as AppTab
  return { language, day, tab }
}

export function routeHash(route: AppRoute): string {
  if (route.language === 'home') return '#/'
  if (route.language === 'profile') return '#/profile'
  if (route.language === 'custom') {
    return route.customSongId ? `#/custom/song/${encodeURIComponent(route.customSongId)}` : '#/custom'
  }
  return `#/${route.language}/day/${route.day}/${TAB_TO_PATH[route.tab]}`
}

export function useHashRoute() {
  const [route, setRoute] = useState<AppRoute>(readRoute)

  const navigate = useCallback((nextRoute: AppRoute, replace = false): void => {
    const hash = routeHash(nextRoute)
    if (replace) window.history.replaceState(null, '', hash)
    else window.history.pushState(null, '', hash)
    setRoute(nextRoute)
  }, [])

  useEffect(() => {
    const handleHistoryNavigation = (): void => setRoute(readRoute())
    window.addEventListener('popstate', handleHistoryNavigation)
    window.addEventListener('hashchange', handleHistoryNavigation)
    return () => {
      window.removeEventListener('popstate', handleHistoryNavigation)
      window.removeEventListener('hashchange', handleHistoryNavigation)
    }
  }, [])

  return { route, navigate }
}
