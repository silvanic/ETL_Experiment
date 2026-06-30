import { executorByType } from '@/modules/pipeline/engine/nodeExecutors'
import { t } from '@/i18n'
import { buildVariableMap } from '@/modules/pipeline/domain/variables'
import type { ExecutionGraph } from '@/modules/pipeline/engine/executorTypes'
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

function getScopeNodes(nodes: PipelineNode[], parentNodeId?: string): PipelineNode[] {
  return nodes.filter((node) => node.parentNode === parentNodeId)
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
    executionStack: [],
  }

  const graph: ExecutionGraph = {
    nodes: definition.nodes,
    edges: definition.edges,
  }

  let success = true
  let guard = 0
  const MAX_EXECUTION_STEPS = 2000

  const executeScope = async (
    startNode: PipelineNode,
    parentNodeId: string | undefined,
    initialPath: string[],
  ): Promise<void> => {
    const queue: Array<{ node: PipelineNode; path: string[] }> = [{ node: startNode, path: initialPath }]

    while (queue.length > 0 && guard < MAX_EXECUTION_STEPS && success) {
      guard += 1
      const { node: currentNode, path: currentPath } = queue.shift()!

      if (currentNode.parentNode !== parentNodeId) {
        continue
      }

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
        const {
          nextBranch,
          details,
          message,
          dataOut,
          childrenNodeIds,
          scopedData,
        } = await executor(currentNode, context, graph, {
          currentPath,
          currentNodeId: currentNode.id,
          parentNodeId,
        })
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

        if (currentNode.data.type === 'iterate' || currentNode.data.type === 'subflow') {
          const iterateItems = Array.isArray(scopedData?.iterateItems)
            ? scopedData.iterateItems
            : []
          const childScopeNodes = getScopeNodes(definition.nodes, currentNode.id)
          const scopedChildNodes = childrenNodeIds && childrenNodeIds.length > 0
            ? childScopeNodes.filter((child) => childrenNodeIds.includes(child.id))
            : childScopeNodes

          if (currentNode.data.type === 'iterate' && scopedChildNodes.length > 0 && iterateItems.length > 0) {
            const childStartNode = findStartNode(scopedChildNodes)
            const previousCurrentItem = context.data.__currentItem
            const previousCurrentIndex = context.data.__currentIndex

            for (let index = 0; index < iterateItems.length; index += 1) {
              const item = iterateItems[index]
              context.executionStack?.push({
                nodeId: currentNode.id,
                parentNodeId,
                enterTime: Date.now(),
                scopedData: {
                  __currentItem: item,
                  __currentIndex: index,
                },
              })

              context.data.__currentItem = item
              context.data.__currentIndex = index

              await executeScope(childStartNode, currentNode.id, [...currentPath, childStartNode.id])
              context.executionStack?.pop()

              if (!success) {
                break
              }
            }

            if (previousCurrentItem === undefined) {
              delete context.data.__currentItem
            } else {
              context.data.__currentItem = previousCurrentItem
            }

            if (previousCurrentIndex === undefined) {
              delete context.data.__currentIndex
            } else {
              context.data.__currentIndex = previousCurrentIndex
            }
          }

          if (currentNode.data.type === 'subflow' && scopedChildNodes.length > 0) {
            const childStartNode = findStartNode(scopedChildNodes)
            context.executionStack?.push({
              nodeId: currentNode.id,
              parentNodeId,
              enterTime: Date.now(),
            })

            await executeScope(childStartNode, currentNode.id, [...currentPath, childStartNode.id])
            context.executionStack?.pop()
          }
        }

        const outgoing = getOutgoingEdges(definition.edges, currentNode.id).filter((edge) => {
          const targetNode = definition.nodes.find((candidate) => candidate.id === edge.target)
          return targetNode?.parentNode === parentNodeId
        })
        if (outgoing.length === 0) {
          continue
        }

        if (MULTI_BRANCH_TYPES.has(currentNode.data.type)) {
          for (const edge of outgoing) {
            queue.push({
              node: getNodeById(definition.nodes, edge.target),
              path: [...currentPath, edge.target],
            })
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

          queue.push({
            node: getNodeById(definition.nodes, nextEdge.target),
            path: [...currentPath, nextEdge.target],
          })
        }
      } catch (error) {
        success = false
        context.logs.push(createLog(currentNode, 'error', t('engine.run.executionFailed'), String(error)))
        break
      }
    }
  }

  const rootNodes = getScopeNodes(definition.nodes)
  const rootStartNode = findStartNode(rootNodes)
  await executeScope(rootStartNode, undefined, [rootStartNode.id])

  if (guard >= MAX_EXECUTION_STEPS) {
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
