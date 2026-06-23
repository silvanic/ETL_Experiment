import { Position } from '@vue-flow/core'
import type { PipelineDefinition } from '@/modules/pipeline/domain/types'

export interface PipelineTemplate {
  id: string
  icon: string
  nameKey: string
  descriptionKey: string
  create: () => PipelineDefinition
}

// ─── Template 1 : Hello API ──────────────────────────────────────────────────

function createHelloApiTemplate(): PipelineDefinition {
  const startId = crypto.randomUUID()
  const apiId = crypto.randomUUID()
  const outputId = crypto.randomUUID()

  return {
    id: crypto.randomUUID(),
    name: 'Hello API',
    version: 1,
    updatedAt: new Date().toISOString(),
    variables: [],
    nodes: [
      {
        id: startId,
        type: 'input',
        position: { x: 80, y: 180 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'start', label: '', config: { note: 'jsonplaceholder.typicode.com — API de test publique gratuite' } },
      },
      {
        id: apiId,
        type: 'default',
        position: { x: 320, y: 180 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'api',
          label: '',
          config: {
            url: 'https://jsonplaceholder.typicode.com/todos/1',
            method: 'GET',
            headers: [{ key: 'Accept', value: 'application/json' }],
            bodyRaw: '',
            outputPath: 'response',
          },
        },
      },
      {
        id: outputId,
        type: 'default',
        position: { x: 560, y: 180 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'output', label: '', config: { outputPath: 'response' } },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: startId, target: apiId },
      { id: crypto.randomUUID(), source: apiId, target: outputId },
    ],
  }
}

// ─── Template 2 : Fetch + Condition ─────────────────────────────────────────

function createFetchWithConditionTemplate(): PipelineDefinition {
  const startId = crypto.randomUUID()
  const apiId = crypto.randomUUID()
  const conditionId = crypto.randomUUID()
  const outputTrueId = crypto.randomUUID()
  const outputFalseId = crypto.randomUUID()

  return {
    id: crypto.randomUUID(),
    name: 'Fetch + Condition',
    version: 1,
    updatedAt: new Date().toISOString(),
    variables: [],
    nodes: [
      {
        id: startId,
        type: 'input',
        position: { x: 80, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'start', label: '', config: { note: '' } },
      },
      {
        id: apiId,
        type: 'default',
        position: { x: 320, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'api',
          label: '',
          config: {
            url: 'https://jsonplaceholder.typicode.com/todos/1',
            method: 'GET',
            headers: [{ key: 'Accept', value: 'application/json' }],
            bodyRaw: '',
            outputPath: 'response',
          },
        },
      },
      {
        id: conditionId,
        type: 'default',
        position: { x: 560, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'condition',
          label: '',
          config: {
            leftPath: 'response.completed',
            operator: 'equals',
            aggregation: 'any',
            rightType: 'boolean',
            rightValue: 'true',
          },
        },
      },
      {
        id: outputTrueId,
        type: 'default',
        position: { x: 800, y: 140 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'output', label: '', name: 'Tâche terminée', config: { outputPath: 'response' } },
      },
      {
        id: outputFalseId,
        type: 'default',
        position: { x: 800, y: 320 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'output', label: '', name: 'Tâche en cours', config: { outputPath: 'response' } },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: startId, target: apiId },
      { id: crypto.randomUUID(), source: apiId, target: conditionId },
      { id: crypto.randomUUID(), source: conditionId, target: outputTrueId, data: { branch: 'true' } },
      { id: crypto.randomUUID(), source: conditionId, target: outputFalseId, data: { branch: 'false' } },
    ],
  }
}

// ─── Template 3 : Filtrer et transformer une liste ───────────────────────────

function createFilterAndMapTemplate(): PipelineDefinition {
  const startId = crypto.randomUUID()
  const apiId = crypto.randomUUID()
  const filterId = crypto.randomUUID()
  const mapId = crypto.randomUUID()
  const outputId = crypto.randomUUID()

  return {
    id: crypto.randomUUID(),
    name: 'Filtrer et transformer une liste',
    version: 1,
    updatedAt: new Date().toISOString(),
    variables: [],
    nodes: [
      {
        id: startId,
        type: 'input',
        position: { x: 80, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'start', label: '', config: { note: '' } },
      },
      {
        id: apiId,
        type: 'default',
        position: { x: 320, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'api',
          label: '',
          config: {
            url: 'https://jsonplaceholder.typicode.com/todos',
            method: 'GET',
            headers: [{ key: 'Accept', value: 'application/json' }],
            bodyRaw: '',
            outputPath: 'response',
          },
        },
      },
      {
        id: filterId,
        type: 'default',
        position: { x: 560, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'filter',
          label: '',
          config: {
            sourcePath: 'response',
            itemPath: 'completed',
            operator: 'equals',
            rightType: 'boolean',
            rightValue: 'true',
            outputPath: 'completed',
            outputPathRejected: 'pending',
          },
        },
      },
      {
        id: mapId,
        type: 'default',
        position: { x: 800, y: 160 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'map',
          label: '',
          config: {
            sourcePath: 'completed',
            outputPath: 'result',
            mappings: [
              { targetField: 'id', literalValue: '{id}', fallbackValue: '0' },
              { targetField: 'title', literalValue: '{title}', fallbackValue: 'N/A' },
            ],
          },
        },
      },
      {
        id: outputId,
        type: 'default',
        position: { x: 1040, y: 160 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'output', label: '', config: { outputPath: 'result' } },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: startId, target: apiId },
      { id: crypto.randomUUID(), source: apiId, target: filterId },
      { id: crypto.randomUUID(), source: filterId, target: mapId, data: { branch: 'filtered' } },
      { id: crypto.randomUUID(), source: mapId, target: outputId },
    ],
  }
}

// ─── Template 4 : Extraire et transformer ────────────────────────────────────

function createExtractAndTransformTemplate(): PipelineDefinition {
  const startId = crypto.randomUUID()
  const apiId = crypto.randomUUID()
  const setVarId = crypto.randomUUID()
  const api2Id = crypto.randomUUID()
  const transformId = crypto.randomUUID()
  const outputId = crypto.randomUUID()

  return {
    id: crypto.randomUUID(),
    name: 'Variables & Chaînage API',
    version: 1,
    updatedAt: new Date().toISOString(),
    variables: [],
    nodes: [
      {
        id: startId,
        type: 'input',
        position: { x: 80, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'start', label: '', config: { note: '' } },
      },
      {
        id: apiId,
        type: 'default',
        position: { x: 320, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'api',
          label: '',
          config: {
            url: 'https://jsonplaceholder.typicode.com/users/1',
            method: 'GET',
            headers: [{ key: 'Accept', value: 'application/json' }],
            bodyRaw: '',
            outputPath: 'user',
          },
        },
      },
      {
        id: setVarId,
        type: 'default',
        position: { x: 560, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'setVariable',
          label: '',
          config: {
            extractions: [
              { extractPath: 'user.id', variableName: 'userId' },
            ],
          },
        },
      },
      {
        id: api2Id,
        type: 'default',
        position: { x: 800, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'api',
          label: '',
          config: {
            url: 'https://jsonplaceholder.typicode.com/todos?userId={{userId}}',
            method: 'GET',
            headers: [{ key: 'Accept', value: 'application/json' }],
            bodyRaw: '',
            outputPath: 'todos',
          },
        },
      },
      {
        id: transformId,
        type: 'default',
        position: { x: 1040, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          type: 'transform',
          label: '',
          config: {
            mode: 'pickPath',
            sourcePath: 'todos',
            targetPath: 'result.todos',
            literalValue: '',
          },
        },
      },
      {
        id: outputId,
        type: 'default',
        position: { x: 1280, y: 230 },
        draggable: true,
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: { type: 'output', label: '', config: { outputPath: 'result' } },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: startId, target: apiId },
      { id: crypto.randomUUID(), source: apiId, target: setVarId },
      { id: crypto.randomUUID(), source: setVarId, target: api2Id },
      { id: crypto.randomUUID(), source: api2Id, target: transformId },
      { id: crypto.randomUUID(), source: transformId, target: outputId },
    ],
  }
}

// ─── Catalogue des templates ─────────────────────────────────────────────────

export const pipelineTemplates: PipelineTemplate[] = [
  {
    id: 'hello-api',
    icon: '🌐',
    nameKey: 'pipelineEditor.templates.helloApi.name',
    descriptionKey: 'pipelineEditor.templates.helloApi.description',
    create: createHelloApiTemplate,
  },
  {
    id: 'fetch-condition',
    icon: '🔀',
    nameKey: 'pipelineEditor.templates.fetchCondition.name',
    descriptionKey: 'pipelineEditor.templates.fetchCondition.description',
    create: createFetchWithConditionTemplate,
  },
  {
    id: 'filter-map',
    icon: '🔍',
    nameKey: 'pipelineEditor.templates.filterMap.name',
    descriptionKey: 'pipelineEditor.templates.filterMap.description',
    create: createFilterAndMapTemplate,
  },
  {
    id: 'variables-chaining',
    icon: '🔗',
    nameKey: 'pipelineEditor.templates.variablesChaining.name',
    descriptionKey: 'pipelineEditor.templates.variablesChaining.description',
    create: createExtractAndTransformTemplate,
  },
]
