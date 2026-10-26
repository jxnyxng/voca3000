import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MasteryStatusIcon } from '../components/study/MasteryStatusIcon'

describe('MasteryStatusIcon', () => {
  it('reports completion after the mastered check animation', async () => {
    const onComplete = vi.fn()
    const { rerender } = render(
      <MasteryStatusIcon mastered={false} onMasteredAnimationComplete={onComplete} />,
    )

    rerender(<MasteryStatusIcon mastered onMasteredAnimationComplete={onComplete} />)
    expect(onComplete).not.toHaveBeenCalled()
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce(), { timeout: 1500 })
  })
})
