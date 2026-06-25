import { executorByType } from '@/modules/pipeline/engine/nodeExecutors'
import { t } from '@/i18n'
import { buildVariableMap } from '@/modules/pipeline/domain/variables'
import type {
  ConditionBranch,
  ExecutionContext,
  ExecutionLog,
  PipelineDefinition,
  PipelineEdge,
  PipelineNode,
  RunResult,
} from '@/modules/pipeline/domain/types'

const MULTI_BRANCH_TYPES = new Set<string>(['filter'])

function createLog(
  node: PipelineNode,
  level: ExecutionLog['level'],
  message: string,
  details?: unknown,
  durationMs?: number,
): ExecutionLog {
  return {
    at: new Date().toISOString(),
    nodeId: node.id,
    nodeType: node.data.type,
    nodeName: node.data.name?.trim() || node.data.label,
    level,
    message,
    details,
    durationMs,
  }
}

const TRACED_TYPES_IN = new Set<string>(['filter'])
const TRACED_TYPES_OUT = new Set<string>(['api', 'filter', 'map'])

function snapshotData(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('__')))
}

function findStartNode(nodes: PipelineNode[]): PipelineNode {
  const start = nodes.find((node) => node.data.type === 'start')
  if (!start) {
    throw new Error(t('engine.run.invalidStartNode'))
  }

  return start
}

function getOutgoingEdges(edges: PipelineEdge[], sourceId: string): PipelineEdge[] {
  return edges.filter((edge) => edge.source === sourceId)
}

function pickNextEdge(node: PipelineNode, outgoing: PipelineEdge[], branch?: ConditionBranch): PipelineEdge | undefined {
  if (node.data.type !== 'condition') {
    return outgoing[0]
  }

  return outgoing.find((edge) => edge.data?.branch === branch)
}

function getNodeById(nodes: PipelineNode[], id: string): PipelineNode {
  const node = nodes.find((candidate) => candidate.id === id)
  if (!node) {
    throw new Error(t('engine.run.invalidNodeById', { id }))
  }

  return node
}

export async function runPipeline(definition: PipelineDefinition): Promise<RunResult> {
  const activeEnvironment = definition.environments?.find(
    (environment) => environment.id === definition.activeEnvironmentId,
  )

  const context: ExecutionContext = {
    data: {
      __variables: buildVariableMap(definition.variables, activeEnvironment?.variableOverrides),
    },
    logs: [],
  }

  let success = true
  const queue: PipelineNode[] = [findStartNode(definition.nodes)]
  let guard = 0

  while (queue.length > 0 && guard < 100) {
    guard += 1
    const currentNode = queue.shift()!
    const executor = executorByType[currentNode.data.type]

    
    try {
      
      if(currentNode.data.type === 'start') {
        context.logs.push(createLog(currentNode, 'info', t('engine.start.begin')))
      }

      const tracedIn = TRACED_TYPES_IN.has(currentNode.data.type)
      if (tracedIn) {
        context.logs.push(createLog(currentNode, 'info', t('engine.run.dataIn'), snapshotData(context.data)))
      }

      
      const executorStart = performance.now()
      const { nextBranch, details, message, dataOut } = await executor(currentNode, context)
      const durationMs = Math.round(performance.now() - executorStart)

      if(currentNode.data.type !== 'start') {
        context.logs.push(
          createLog(currentNode, 'info', message ?? t('engine.run.executionCompleted'), details, durationMs),
        )
      }

      const tracedOut = TRACED_TYPES_OUT.has(currentNode.data.type)
      if (tracedOut) {
        context.logs.push(
          createLog(currentNode, 'info', t('engine.run.dataOut'), dataOut ?? snapshotData(context.data)),
        )
      }
      
      const outgoing = getOutgoingEdges(definition.edges, currentNode.id)
      if (outgoing.length === 0) {
        continue
      }

      if (MULTI_BRANCH_TYPES.has(currentNode.data.type)) {
        for (const edge of outgoing) {
          queue.push(getNodeById(definition.nodes, edge.target))
        }
      } else {
        const nextEdge = pickNextEdge(currentNode, outgoing, nextBranch)
        if (!nextEdge) {
          context.logs.push(
            createLog(
              currentNode,
              'info',
              nextBranch
                ? t('engine.run.noEdgeForBranch', { branch: nextBranch })
                : t('engine.run.noOutgoingEdge'),
            ),
          )
          continue
        }
        queue.push(getNodeById(definition.nodes, nextEdge.target))
      }
    } catch (error) {
      success = false
      context.logs.push(createLog(currentNode, 'error', t('engine.run.executionFailed'), String(error)))
      break
    }
  }

  if (guard >= 100) {
    success = false
    context.logs.push({
      at: new Date().toISOString(),
      nodeId: 'system',
      nodeType: 'start',
      level: 'error',
      message: t('engine.run.infiniteLoopStopped'),
    })
  }

  return {
    success,
    context,
  }
}
