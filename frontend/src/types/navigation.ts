export const APP_TABS = ['study', 'ko-to-en', 'en-to-ko', 'incorrect'] as const

export type AppTab = (typeof APP_TABS)[number]
