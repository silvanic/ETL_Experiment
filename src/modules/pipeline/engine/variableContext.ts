import type { ExecutionContext } from '@/modules/pipeline/domain/types'

const VARIABLE_CONTEXT_KEY = '__variables'

export function getContextVariableMap(context: ExecutionContext): Record<string, string> {
  const source = context.data[VARIABLE_CONTEXT_KEY]
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    return {}
  }

  return Object.entries(source as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    },
    {},
  )
}
