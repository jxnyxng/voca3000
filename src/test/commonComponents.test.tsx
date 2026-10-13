import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AppErrorBoundary } from '../components/common/AppErrorBoundary'
import { EmptyState } from '../components/common/EmptyState'
import { ErrorState } from '../components/common/ErrorState'
import { Header } from '../components/common/Header'
import { LoadingState } from '../components/common/LoadingState'
import { ProgressBar } from '../components/common/ProgressBar'

describe('common status components', () => {
  it('exposes numeric and textual progress and clamps invalid visual values', () => {
    render(<ProgressBar value={35} max={30} label="학습 진도" />)

    const progress = screen.getByRole('progressbar', { name: '학습 진도' })
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '30')
    expect(progress).toHaveAttribute('aria-valuenow', '30')
    expect(progress).toHaveAttribute('aria-valuetext', '30개 중 30개 완료')
    expect(screen.getByText('30 / 30')).toBeInTheDocument()
  })

  it('announces loading without relying on animation', () => {
    render(<LoadingState message="Day 데이터를 불러오는 중" />)

    expect(screen.getByRole('status')).toHaveTextContent('Day 데이터를 불러오는 중')
  })

  it('renders optional empty and error recovery actions', () => {
    const onEmptyAction = vi.fn()
    const onRetry = vi.fn()
    const { rerender } = render(
      <EmptyState
        title="학습할 단어가 없어요"
        description="다른 Day를 선택해 주세요."
        actionLabel="첫 Day 보기"
        onAction={onEmptyAction}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '첫 Day 보기' }))
    expect(onEmptyAction).toHaveBeenCalledOnce()

    rerender(<ErrorState message="연결을 확인해 주세요." onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('연결을 확인해 주세요.')
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})

describe('Header', () => {
  it('shows Day context, non-color completion text, progress, and an accessible backup button', () => {
    const onBackup = vi.fn()
    const onHome = vi.fn()
    render(
      <Header
        day={1}
        category="Daily Life"
        completedStudy
        masteredCount={12}
        totalCount={30}
        onBackup={onBackup}
        onHome={onHome}
      />,
    )

    expect(screen.getByText('Day 01')).toBeInTheDocument()
    expect(screen.getByText('학습 완료')).toBeInTheDocument()
    expect(screen.getByText('12 / 30')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '학습 데이터 백업 및 복원' }))
    expect(onBackup).toHaveBeenCalledOnce()
    expect(screen.queryByText('백업·복원')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '학습 데이터 백업 및 복원' })).toHaveClass('size-9')
    fireEvent.click(screen.getByRole('button', { name: '언어 선택으로 돌아가기' }))
    expect(onHome).toHaveBeenCalledOnce()
  })

  it('disables the backup placeholder until a handler is provided', () => {
    render(
      <Header
        day={1}
        category="Daily Life"
        completedStudy={false}
        masteredCount={0}
        totalCount={30}
      />,
    )

    expect(screen.getByRole('button', { name: '학습 데이터 백업 및 복원' })).toBeDisabled()
    expect(screen.getByText('학습 전')).toBeInTheDocument()
  })
})

describe('AppErrorBoundary', () => {
  it('shows a recoverable fallback when a child render fails', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    function BrokenComponent(): never {
      throw new Error('render failed')
    }

    render(
      <AppErrorBoundary>
        <BrokenComponent />
      </AppErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('화면을 표시하지 못했어요')
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
