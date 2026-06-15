export function getByPath(data: unknown, path: string): unknown {
  if (!path) {
    return data
  }

  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined
    }

    if (typeof acc !== 'object') {
      return undefined
    }

    const record = acc as Record<string, unknown>
    return record[key]
  }, data)
}

export function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.').filter(Boolean)
  if (keys.length === 0) {
    return
  }

  let cursor: Record<string, unknown> = target
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index]
    const currentValue = cursor[key]

    if (typeof currentValue !== 'object' || currentValue === null) {
      cursor[key] = {}
    }

    cursor = cursor[key] as Record<string, unknown>
  }

  cursor[keys.at(-1) as string] = value
}
