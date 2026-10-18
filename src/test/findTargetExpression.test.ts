import { describe, expect, it } from 'vitest'
import { findTargetExpression } from '../components/study/findTargetExpression'

describe('findTargetExpression', () => {
  it('matches case-insensitively at phrase boundaries and skips embedded text', () => {
    expect(findTargetExpression('We GET READY now.', 'get ready')).toEqual({
      before: 'We ',
      match: 'GET READY',
      after: ' now.',
    })
    expect(findTargetExpression('The target was retargeted.', 'target')).toEqual({
      before: 'The ',
      match: 'target',
      after: ' was retargeted.',
    })
    expect(findTargetExpression('It was retargeted.', 'target')).toBeNull()
  })

  it('finds only the visible Japanese answer stem when the dictionary form is conjugated', () => {
    expect(findTargetExpression('説明を聞いて理由が分かりました。', ['分かる', 'わかる'])).toEqual({
      before: '説明を聞いて理由が',
      match: '分か',
      after: 'りました。',
    })
    expect(findTargetExpression('ゆっくり話していただけますか。', ['話す', 'はなす'])).toEqual({
      before: 'ゆっくり',
      match: '話',
      after: 'していただけますか。',
    })
  })
})
