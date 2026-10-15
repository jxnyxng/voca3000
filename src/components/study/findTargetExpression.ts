interface ExampleParts {
  before: string
  match: string
  after: string
}

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[a-z0-9'-]/i.test(character)
}

function findExactTarget(example: string, target: string): ExampleParts | null {
  const normalizedExample = example.toLocaleLowerCase('en-US')
  const normalizedTarget = target.toLocaleLowerCase('en-US')
  let start = normalizedExample.indexOf(normalizedTarget)

  while (start >= 0) {
    const end = start + target.length
    if (
      isJapaneseExpression(target)
      || (!isWordCharacter(example[start - 1]) && !isWordCharacter(example[end]))
    ) {
      return {
        before: example.slice(0, start),
        match: example.slice(start, end),
        after: example.slice(end),
      }
    }
    start = normalizedExample.indexOf(normalizedTarget, start + 1)
  }

  return null
}

function isJapaneseExpression(value: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(value)
}

export function findTargetExpression(
  example: string,
  targetOrTargets: string | readonly string[],
): ExampleParts | null {
  const targets = (Array.isArray(targetOrTargets) ? targetOrTargets : [targetOrTargets])
    .filter((target) => target.length > 0)
    .sort((left, right) => right.length - left.length)

  for (const target of targets) {
    const exactMatch = findExactTarget(example, target)
    if (exactMatch) return exactMatch
  }

  // Japanese dictionary forms are commonly conjugated in examples. Mask the
  // longest visible stem only; never replace or hide the complete sentence.
  let longestStemMatch: ExampleParts | null = null
  for (const target of targets.filter(isJapaneseExpression)) {
    for (let length = target.length - 1; length >= 1; length -= 1) {
      const stem = target.slice(0, length)
      const start = example.indexOf(stem)
      if (start < 0) continue
      if (longestStemMatch === null || stem.length > longestStemMatch.match.length) {
        longestStemMatch = {
          before: example.slice(0, start),
          match: example.slice(start, start + stem.length),
          after: example.slice(start + stem.length),
        }
      }
      break
    }
  }

  return longestStemMatch
}
