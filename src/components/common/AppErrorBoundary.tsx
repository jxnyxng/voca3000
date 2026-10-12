import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './ErrorState'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application rendering error.', error, info.componentStack)
  }

  private reload = (): void => {
    window.location.reload()
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
          <ErrorState
            title="화면을 표시하지 못했어요"
            message="페이지를 새로고침해 주세요. 저장된 학습 기록은 브라우저에 그대로 남아 있어요."
            onRetry={this.reload}
          />
        </main>
      )
    }

    return this.props.children
  }
}
