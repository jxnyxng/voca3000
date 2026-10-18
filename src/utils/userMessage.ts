import { WordRepositoryError } from '../services/wordRepository'

export function userMessage(error: Error): string {
  return error instanceof WordRepositoryError
    ? error.userMessage
    : '데이터를 불러오지 못했어요. 다시 시도해 주세요.'
}
