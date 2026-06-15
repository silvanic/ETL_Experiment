import type { PipelineVariable } from '@/modules/pipeline/domain/types'

export const VARIABLE_PREFIX = '#'

const VARIABLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]*$/

export function isValidVariableName(name: string): boolean {
  return VARIABLE_NAME_REGEX.test(name.trim())
}

export function toVariableToken(name: string): string {
  return `${VARIABLE_PREFIX}${name}`
}

export function buildVariableMap(variables: PipelineVariable[]): Record<string, string> {
  return variables.reduce<Record<string, string>>((acc, variable) => {
    const key = variable.name.trim()
    if (!key) {
      return acc
    }

    acc[key] = variable.value
    return acc
  }, {})
}

export function resolveValueWithVariables(value: string, variableMap: Record<string, string>): string {
  if (!value.startsWith(VARIABLE_PREFIX)) {
    return value
  }

  const variableName = value.slice(VARIABLE_PREFIX.length)
  return variableMap[variableName] ?? value
}

export function extractVariableReferences(value: string): string[] {
  const regex = /#([a-zA-Z][a-zA-Z0-9_-]*)/g
  const matches: string[] = []
  let match

  while ((match = regex.exec(value)) !== null) {
    matches.push(match[1])
  }

  return matches
}

export function findUnresolvedVariables(value: string, variableMap: Record<string, string>): string[] {
  const refs = extractVariableReferences(value)
  return refs.filter((ref) => !(ref in variableMap))
}
