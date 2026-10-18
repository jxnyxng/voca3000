export type QuizPhase =
  | 'answering'
  | 'evaluating'
  | 'feedback-correct'
  | 'feedback-incorrect'
  | 'waiting-confirmation'
  | 'completed'

export interface QuizAttempt {
  wordId: string
  answer: string
  isCorrect: boolean
  correctAnswer: string
}

export interface QuizState {
  phase: QuizPhase
  currentIndex: number
  correctCount: number
  attempts: QuizAttempt[]
  inputError: string | null
  persistenceError: Error | null
  isNewHighScore: boolean
}

export type QuizAction =
  | { type: 'input-rejected'; message: string }
  | { type: 'evaluation-started' }
  | { type: 'result-persistence-failed'; error: Error }
  | { type: 'correct-feedback-started'; attempt: QuizAttempt }
  | { type: 'incorrect-feedback-started'; attempt: QuizAttempt }
  | { type: 'confirmation-requested' }
  | { type: 'question-advanced'; nextIndex: number }
  | { type: 'session-completed'; isNewHighScore: boolean }
  | { type: 'completion-persistence-failed'; error: Error }
  | { type: 'restarted' }

export function createInitialQuizState(): QuizState {
  return {
    phase: 'answering',
    currentIndex: 0,
    correctCount: 0,
    attempts: [],
    inputError: null,
    persistenceError: null,
    isNewHighScore: false,
  }
}

export function quizSessionReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'input-rejected':
      return { ...state, inputError: action.message }
    case 'evaluation-started':
      return { ...state, phase: 'evaluating', inputError: null, persistenceError: null }
    case 'result-persistence-failed':
      return { ...state, phase: 'answering', persistenceError: action.error }
    case 'correct-feedback-started':
      return {
        ...state,
        phase: 'feedback-correct',
        correctCount: state.correctCount + 1,
        attempts: [...state.attempts, action.attempt],
      }
    case 'incorrect-feedback-started':
      return {
        ...state,
        phase: 'feedback-incorrect',
        attempts: [...state.attempts, action.attempt],
      }
    case 'confirmation-requested':
      return { ...state, phase: 'waiting-confirmation' }
    case 'question-advanced':
      return {
        ...state,
        phase: 'answering',
        currentIndex: action.nextIndex,
        inputError: null,
        persistenceError: null,
      }
    case 'session-completed':
      return {
        ...state,
        phase: 'completed',
        persistenceError: null,
        isNewHighScore: action.isNewHighScore,
      }
    case 'completion-persistence-failed':
      return { ...state, persistenceError: action.error }
    case 'restarted':
      return createInitialQuizState()
  }
}
