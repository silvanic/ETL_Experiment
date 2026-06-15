import type {
  ApiNodeConfig,
  ConditionNodeConfig,
  OutputNodeConfig,
  PipelineNode,
  TransformNodeConfig,
} from '@/modules/pipeline/domain/types'

export function isApiNode(node: PipelineNode): boolean {
  return node.data.type === 'api'
}

export function isConditionNode(node: PipelineNode): boolean {
  return node.data.type === 'condition'
}

export function isTransformNode(node: PipelineNode): boolean {
  return node.data.type === 'transform'
}

export function isOutputNode(node: PipelineNode): boolean {
  return node.data.type === 'output'
}

export function asApiConfig(node: PipelineNode): ApiNodeConfig {
  return node.data.config as ApiNodeConfig
}

export function asConditionConfig(node: PipelineNode): ConditionNodeConfig {
  return node.data.config as ConditionNodeConfig
}

export function asTransformConfig(node: PipelineNode): TransformNodeConfig {
  return node.data.config as TransformNodeConfig
}

export function asOutputConfig(node: PipelineNode): OutputNodeConfig {
  return node.data.config as OutputNodeConfig
}
