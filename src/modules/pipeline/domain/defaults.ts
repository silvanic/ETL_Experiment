import { Position } from '@vue-flow/core'
import type {
  ApiNodeConfig,
  ConditionNodeConfig,
  FilterNodeConfig,
  NodeConfigMap,
  NodeType,
  PipelineDefinition,
  PipelineNode,
  TransformNodeConfig,
} from '@/modules/pipeline/domain/types'
import { t } from '@/i18n'

const defaultApiConfig: ApiNodeConfig = {
  url: 'https://jsonplaceholder.typicode.com/users',
  method: 'GET',
  headersRaw: '{\n  "Accept": "application/json"\n}',
  bodyRaw: '{\n  "sample": true\n}',
  outputPath: 'api.result',
}

const defaultConditionConfig: ConditionNodeConfig = {
  leftPath: 'api.result.0.id',
  operator: 'greaterThan',
  aggregation: 'any',
  rightType: 'number',
  rightValue: '0',
}

const defaultTransformConfig: TransformNodeConfig = {
  mode: 'pickPath',
  sourcePath: 'api.result.0.name',
  targetPath: 'result.firstUserName',
  literalValue: 'N/A',
}

const defaultFilterConfig: FilterNodeConfig = {
  sourcePath: 'api.result',
  itemPath: 'id',
  operator: 'greaterThan',
  rightType: 'number',
  rightValue: '0',
  outputPath: 'result.filtered',
  outputPathRejected: 'result.rejected',
}

const defaultByType: NodeConfigMap = {
  start: { note: '' },
  api: defaultApiConfig,
  condition: defaultConditionConfig,
  filter: defaultFilterConfig,
  transform: defaultTransformConfig,
  output: { outputPath: 'result' },
}

export function getDefaultConfig<T extends NodeType>(type: T): NodeConfigMap[T] {
  return structuredClone(defaultByType[type])
}

export function createNode(type: NodeType, x: number, y: number): PipelineNode {
  const labels: Record<NodeType, string> = {
    start: t('defaults.nodeLabel.start'),
    api: t('defaults.nodeLabel.api'),
    condition: t('defaults.nodeLabel.condition'),
    filter: t('defaults.nodeLabel.filter'),
    transform: t('defaults.nodeLabel.transform'),
    output: t('defaults.nodeLabel.output'),
  }

  let typeNode = "default";
  if(["start"].includes(type)) {
    typeNode = "input";
  }

  return {
    id: crypto.randomUUID(),
    type: typeNode,
    position: { x, y },
    draggable: true,
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    data: {
      type,
      label: labels[type],
      config: getDefaultConfig(type),
    },
  }
}

export function createInitialPipeline(): PipelineDefinition {
  const start = createNode('start', 80, 180)

  return {
    id: crypto.randomUUID(),
    name: t('defaults.pipelineName'),
    version: 1,
    updatedAt: new Date().toISOString(),
    nodes: [start],
    variables: [],
    edges: [],
  }
}