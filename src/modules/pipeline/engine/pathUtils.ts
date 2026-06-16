/**
 * Tokenise un chemin en segments, en séparant les wildcards `[*]`.
 * Exemple : "items[*].name" → ["items", "[*]", "name"]
 */
function tokenizePath(path: string): string[] {
  return path
    .split('.')
    .flatMap((seg) => {
      if (seg.endsWith('[*]')) {
        const key = seg.slice(0, -3)
        return key ? [key, '[*]'] : ['[*]']
      }
      return [seg]
    })
    .filter(Boolean)
}

function getBySegments(data: unknown, segments: string[]): unknown {
  if (segments.length === 0) {
    return data
  }

  const [head, ...rest] = segments

  if (head === '[*]') {
    if (!Array.isArray(data)) {
      return undefined
    }
    return data.map((item) => getBySegments(item, rest))
  }

  if (data === null || data === undefined || typeof data !== 'object') {
    return undefined
  }

  return getBySegments((data as Record<string, unknown>)[head], rest)
}

function setBySegments(
  target: Record<string, unknown>,
  segments: string[],
  value: unknown,
): void {
  if (segments.length === 0) {
    return
  }

  const [head, ...rest] = segments

  if (rest.length === 0) {
    target[head] = value
    return
  }

  if (rest[0] === '[*]') {
    const arr = target[head]
    if (Array.isArray(arr)) {
      const afterWildcard = rest.slice(1)
      for (const item of arr) {
        if (item !== null && typeof item === 'object') {
          setBySegments(item as Record<string, unknown>, afterWildcard, value)
        }
      }
    }
    return
  }

  const currentValue = target[head]
  if (typeof currentValue !== 'object' || currentValue === null) {
    target[head] = {}
  }

  setBySegments(target[head] as Record<string, unknown>, rest, value)
}

export function getByPath(data: unknown, path: string): unknown {
  if (!path) {
    return data
  }
  return getBySegments(data, tokenizePath(path))
}

export function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = tokenizePath(path)
  if (segments.length === 0) {
    return
  }
  setBySegments(target, segments, value)
}
