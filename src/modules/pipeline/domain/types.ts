import type { Position } from '@vue-flow/core'

export type NodeType = 'start' | 'api' | 'setVariable' | 'condition' | 'filter' | 'transform' | 'map' | 'output'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'greaterThan'
  | 'lessThan'
  | 'contains'
  | 'exists'
export type ConditionAggregation = 'any' | 'all' | 'none'

export type ConditionBranch = 'true' | 'false'
export type FilterBranch = 'filtered' | 'rejected'

export interface StartNodeConfig {
  note?: string
}

export interface ApiNodeConfig {
  url: string
  method: HttpMethod
  headers: Array<{ key: string; value: string }>
  bodyRaw: string
  outputPath: string
}

export interface ConditionNodeConfig {
  leftPath: string
  operator: ConditionOperator
  aggregation: ConditionAggregation
  rightType: 'string' | 'number' | 'boolean' | 'null'
  rightValue: string
}

export interface FilterNodeConfig {
  sourcePath: string
  itemPath: string
  operator: ConditionOperator
  rightType: 'string' | 'number' | 'boolean' | 'null'
  rightValue: string
  outputPath: string
  outputPathRejected: string
}

export interface TransformNodeConfig {
  mode: 'pickPath' | 'assignLiteral'
  sourcePath: string
  targetPath: string
  literalValue: string
}

export interface MapNodeConfig {
  sourcePath: string
  outputPath: string
  mappings: Array<{
    targetField: string
    literalValue: string
    fallbackValue?: string
  }>
}

export interface OutputNodeConfig {
  outputPath: string
}

export interface SetVariableNodeConfig {
  extractions: Array<{
    extractPath: string
    variableName: string
  }>
}

export type NodeConfigMap = {
  start: StartNodeConfig
  api: ApiNodeConfig
  setVariable: SetVariableNodeConfig
  condition: ConditionNodeConfig
  filter: FilterNodeConfig
  transform: TransformNodeConfig
  map: MapNodeConfig
  output: OutputNodeConfig
}

export type NodeConfig = NodeConfigMap[NodeType]

export interface PipelineNodeData<T extends NodeType = NodeType> {
  type: T
  label: string
  name?: string
  config: NodeConfigMap[T]
}

export interface PipelineNode<T extends NodeType = NodeType> {
  id: string
  type: string
  position: { x: number; y: number }
  data: PipelineNodeData<T>
  draggable?: boolean
  sourcePosition?: Position
  targetPosition?: Position
}

export interface PipelineEdge {
  id: string
  source: string
  target: string
  label?: string
  data?: { branch?: ConditionBranch | FilterBranch }
}

export interface PipelineVariable {
  id: string
  name: string
  value: string
  type?: 'string' | 'number' | 'json' | 'object'
}

export interface PipelineEnvironment {
  id: string
  name: string
  variableOverrides: Record<string, string>
}

export interface PipelineDefinition {
  id: string
  name: string
  version: number
  nodes: PipelineNode[]
  edges: PipelineEdge[]
  variables: PipelineVariable[]
  environments?: PipelineEnvironment[]
  activeEnvironmentId?: string
  updatedAt: string
}

export interface ExecutionLog {
  at: string
  nodeId: string
  nodeType: NodeType
  nodeName?: string
  level: 'info' | 'error'
  message: string
  details?: unknown
  durationMs?: number
}

export interface ExecutionRun {
  id: string
  startedAt: string
  finishedAt: string
  success: boolean
  logs: ExecutionLog[]
  errorMessage?: string
}

export interface ExecutionContext {
  data: Record<string, unknown>
  logs: ExecutionLog[]
}

export interface RunResult {
  success: boolean
  context: ExecutionContext
}
