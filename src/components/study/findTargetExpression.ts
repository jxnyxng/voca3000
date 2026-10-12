interface ExampleParts {
  before: string
  match: string
  after: string
}

function isWordCharacter(character: string | undefined): boolean {
  return character !== undefined && /[a-z0-9'-]/i.test(character)
}

export function findTargetExpression(example: string, target: string): ExampleParts | null {
  const normalizedExample = example.toLocaleLowerCase('en-US')
  const normalizedTarget = target.toLocaleLowerCase('en-US')
  let start = normalizedExample.indexOf(normalizedTarget)

  while (start >= 0) {
    const end = start + target.length
    if (!isWordCharacter(example[start - 1]) && !isWordCharacter(example[end])) {
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
