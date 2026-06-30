import type { ExecutionContext, PipelineEdge, PipelineNode } from '@/modules/pipeline/domain/types'

export interface ExecutionGraph {
  nodes: PipelineNode[]
  edges: PipelineEdge[]
}

export interface ExecutionState {
  currentPath: string[]
  currentNodeId: string
  parentNodeId?: string
}

export type ExecutorResult = {
  nextBranch?: 'true' | 'false'
  details?: unknown
  message?: string
  dataOut?: unknown
  childrenNodeIds?: string[]
  exitMode?: 'next' | 'break' | 'continue'
  scopedData?: Record<string, unknown>
}

export type NodeExecutor = (
  node: PipelineNode,
  context: ExecutionContext,
  graph?: ExecutionGraph,
  executionState?: ExecutionState,
) => Promise<ExecutorResult>
