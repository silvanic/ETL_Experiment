/**
 * Tokenise un chemin en segments, en gérant la notation à crochets.
 * Exemples :
 * - "items[*].name" → ["items", "[*]", "name"]
 * - "items[0].name" → ["items", "0", "name"]
 */
function tokenizePath(path: string): string[] {
  const segments: string[] = []
  let current = ''

  for (let i = 0; i < path.length; i += 1) {
    const char = path[i]

    if (char === '.') {
      if (current) {
        segments.push(current)
        current = ''
      }
      continue
    }

    if (char === '[') {
      if (current) {
        segments.push(current)
        current = ''
      }

      const closeIndex = path.indexOf(']', i + 1)
      if (closeIndex === -1) {
        current += char
        continue
      }

      const token = path.slice(i + 1, closeIndex).trim()
      if (token) {
        segments.push(token === '*' ? '[*]' : token)
      }

      i = closeIndex
      continue
    }

    current += char
  }

  if (current) {
    segments.push(current)
  }

  return segments.filter(Boolean)
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

  if (Array.isArray(data) && /^\d+$/.test(head)) {
    const index = Number(head)
    return getBySegments(data[index], rest)
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
