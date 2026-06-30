export type HelpNodeKey = 'start' | 'api' | 'setVariable' | 'condition' | 'filter' | 'transform' | 'map' | 'iterate' | 'subflow' | 'output'
export type HelpExampleId = 'example1' | 'example2' | 'example3' | 'example4' | 'example5'
export type HelpExampleSlug = 'request-condition-transform' | 'list-wildcard-transform' | 'dummyjson-auth-profile' | 'iterate-current-item' | 'subflow-once'

export interface HelpFieldDef {
  labelKey: string
  descKey: string
}

export interface HelpField {
  label: string
  value: string
}

export interface HelpBranch {
  label: string
  fields: HelpField[]
}

export interface HelpStep {
  type: 'start' | 'api' | 'setVariable' | 'condition' | 'transform' | 'iterate' | 'subflow' | 'output'
  title: string
  noConfig?: boolean
  fields?: HelpField[]
  branches?: { true: HelpBranch; false: HelpBranch }
}

export const helpNodeKeys: HelpNodeKey[] = ['start', 'api', 'setVariable', 'condition', 'filter', 'transform', 'map', 'iterate', 'subflow', 'output']

export function isHelpNodeKey(value: string): value is HelpNodeKey {
  return helpNodeKeys.includes(value as HelpNodeKey)
}

export function isHelpExampleId(value: string): value is HelpExampleId {
  return value === 'example1' || value === 'example2' || value === 'example3' || value === 'example4' || value === 'example5'
}

export function isHelpExampleSlug(value: string): value is HelpExampleSlug {
  return value === 'request-condition-transform'
    || value === 'list-wildcard-transform'
    || value === 'dummyjson-auth-profile'
    || value === 'iterate-current-item'
    || value === 'subflow-once'
}

export function resolveHelpExampleSlug(value: string): HelpExampleSlug | null {
  if (isHelpExampleSlug(value)) {
    return value
  }

  if (value === 'example1') {
    return 'request-condition-transform'
  }

  if (value === 'example2') {
    return 'list-wildcard-transform'
  }

  if (value === 'example3') {
    return 'dummyjson-auth-profile'
  }

  if (value === 'example4') {
    return 'iterate-current-item'
  }

  if (value === 'example5') {
    return 'subflow-once'
  }

  return null
}

export const helpNodeFieldDefs: Record<HelpNodeKey, HelpFieldDef[]> = {
  start: [],
  api: [
    { labelKey: 'inspector.fields.method', descKey: 'pipelineEditor.help.nodes.api.fields.method' },
    { labelKey: 'inspector.fields.url', descKey: 'pipelineEditor.help.nodes.api.fields.url' },
    { labelKey: 'inspector.fields.headersJson', descKey: 'pipelineEditor.help.nodes.api.fields.headersRaw' },
    { labelKey: 'inspector.fields.bodyJson', descKey: 'pipelineEditor.help.nodes.api.fields.bodyRaw' },
    { labelKey: 'inspector.fields.outputPath', descKey: 'pipelineEditor.help.nodes.api.fields.outputPath' },
  ],
  setVariable: [
    { labelKey: 'inspector.fields.extractions', descKey: 'pipelineEditor.help.nodes.setVariable.fields.extractions' },
    { labelKey: 'inspector.fields.valueExtractPath', descKey: 'pipelineEditor.help.nodes.setVariable.fields.extractPath' },
    { labelKey: 'inspector.fields.variableName', descKey: 'pipelineEditor.help.nodes.setVariable.fields.variableName' },
  ],
  condition: [
    { labelKey: 'inspector.fields.leftPath', descKey: 'pipelineEditor.help.nodes.condition.fields.leftPath' },
    { labelKey: 'inspector.fields.operator', descKey: 'pipelineEditor.help.nodes.condition.fields.operator' },
    { labelKey: 'inspector.fields.aggregation', descKey: 'pipelineEditor.help.nodes.condition.fields.aggregation' },
    { labelKey: 'inspector.fields.rightType', descKey: 'pipelineEditor.help.nodes.condition.fields.rightType' },
    { labelKey: 'inspector.fields.rightValue', descKey: 'pipelineEditor.help.nodes.condition.fields.rightValue' },
  ],
  filter: [
    { labelKey: 'inspector.fields.sourcePath', descKey: 'pipelineEditor.help.nodes.filter.fields.sourcePath' },
    { labelKey: 'inspector.fields.itemPath', descKey: 'pipelineEditor.help.nodes.filter.fields.itemPath' },
    { labelKey: 'inspector.fields.operator', descKey: 'pipelineEditor.help.nodes.filter.fields.operator' },
    { labelKey: 'inspector.fields.rightType', descKey: 'pipelineEditor.help.nodes.filter.fields.rightType' },
    { labelKey: 'inspector.fields.rightValue', descKey: 'pipelineEditor.help.nodes.filter.fields.rightValue' },
    { labelKey: 'inspector.fields.outputPath', descKey: 'pipelineEditor.help.nodes.filter.fields.outputPath' },
    { labelKey: 'inspector.fields.outputPathRejected', descKey: 'pipelineEditor.help.nodes.filter.fields.outputPathRejected' },
  ],
  transform: [
    { labelKey: 'inspector.fields.mode', descKey: 'pipelineEditor.help.nodes.transform.fields.mode' },
    { labelKey: 'inspector.fields.sourcePath', descKey: 'pipelineEditor.help.nodes.transform.fields.sourcePath' },
    { labelKey: 'inspector.fields.targetPath', descKey: 'pipelineEditor.help.nodes.transform.fields.targetPath' },
    { labelKey: 'inspector.fields.literalValue', descKey: 'pipelineEditor.help.nodes.transform.fields.literalValue' },
  ],
  map: [
    { labelKey: 'inspector.fields.sourcePath', descKey: 'pipelineEditor.help.nodes.map.fields.sourcePath' },
    { labelKey: 'inspector.fields.outputPath', descKey: 'pipelineEditor.help.nodes.map.fields.outputPath' },
    { labelKey: 'inspector.fields.targetField', descKey: 'pipelineEditor.help.nodes.map.fields.targetField' },
    { labelKey: 'inspector.fields.literalValue', descKey: 'pipelineEditor.help.nodes.map.fields.literalValue' },
    { labelKey: 'inspector.fields.fallbackValue', descKey: 'pipelineEditor.help.nodes.map.fields.fallbackValue' },
  ],
  iterate: [
    { labelKey: 'inspector.fields.sourcePath', descKey: 'pipelineEditor.help.nodes.iterate.fields.sourcePath' },
  ],
  subflow: [],
  output: [
    { labelKey: 'inspector.fields.outputPath', descKey: 'pipelineEditor.help.nodes.output.fields.outputPath' },
  ],
}

export function buildExampleOneSteps(t: (key: string) => string): HelpStep[] {
  return [
    {
      type: 'start',
      title: t('pipelineEditor.help.nodes.start.title'),
      noConfig: true,
    },
    {
      type: 'api',
      title: t('pipelineEditor.help.nodes.api.title'),
      fields: [
        { label: t('inspector.fields.method'), value: 'GET' },
        { label: 'URL', value: 'https://jsonplaceholder.typicode.com/todos/1' },
        { label: t('inspector.fields.headersJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
        { label: t('inspector.fields.bodyJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
        { label: t('inspector.fields.outputPath'), value: '$.todo' },
      ],
    },
    {
      type: 'condition',
      title: t('pipelineEditor.help.nodes.condition.title'),
      fields: [
        { label: t('inspector.fields.leftPath'), value: '$.todo.completed' },
        { label: t('inspector.fields.operator'), value: t('inspector.options.conditionOperator.equals') },
        { label: t('inspector.fields.aggregation'), value: t('inspector.options.conditionAggregation.any') },
        { label: t('inspector.fields.rightType'), value: t('inspector.options.rightType.boolean') },
        { label: t('inspector.fields.rightValue'), value: 'true' },
      ],
      branches: {
        true: {
          label: t('pipelineEditor.help.exampleSteps.branchTrue'),
          fields: [
            { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.pickPath') },
            { label: t('inspector.fields.sourcePath'), value: '$.todo.title' },
            { label: t('inspector.fields.targetPath'), value: '$.result' },
          ],
        },
        false: {
          label: t('pipelineEditor.help.exampleSteps.branchFalse'),
          fields: [
            { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.assignLiteral') },
            { label: t('inspector.fields.literalValue'), value: t('pipelineEditor.help.exampleSteps.taskNotDone') },
            { label: t('inspector.fields.targetPath'), value: '$.result' },
          ],
        },
      },
    },
    {
      type: 'output',
      title: t('pipelineEditor.help.nodes.output.title'),
      fields: [{ label: t('inspector.fields.outputPath'), value: '$.result' }],
    },
  ]
}

export function buildExampleTwoSteps(t: (key: string) => string): HelpStep[] {
  return [
    {
      type: 'start',
      title: t('pipelineEditor.help.nodes.start.title'),
      noConfig: true,
    },
    {
      type: 'api',
      title: t('pipelineEditor.help.nodes.api.title'),
      fields: [
        { label: t('inspector.fields.method'), value: 'GET' },
        { label: 'URL', value: 'https://jsonplaceholder.typicode.com/users' },
        { label: t('inspector.fields.headersJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
        { label: t('inspector.fields.bodyJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
        { label: t('inspector.fields.outputPath'), value: '$.users' },
      ],
    },
    {
      type: 'transform',
      title: t('pipelineEditor.help.nodes.transform.title'),
      fields: [
        { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.assignLiteral') },
        { label: t('inspector.fields.literalValue'), value: 'true' },
        { label: t('inspector.fields.targetPath'), value: '$.users[*].active' },
      ],
    },
    {
      type: 'output',
      title: t('pipelineEditor.help.nodes.output.title'),
      fields: [{ label: t('inspector.fields.outputPath'), value: '$.users' }],
    },
  ]
}

export function buildExampleThreeSteps(t: (key: string) => string): HelpStep[] {
  return [
    {
      type: 'start',
      title: t('pipelineEditor.help.nodes.start.title'),
      noConfig: true,
    },
    {
      type: 'api',
      title: t('pipelineEditor.help.nodes.api.title'),
      fields: [
        { label: t('inspector.fields.method'), value: 'POST' },
        { label: 'URL', value: 'https://dummyjson.com/auth/login' },
        { label: t('inspector.fields.headersJson'), value: '[{"key":"Content-Type","value":"application/json"}]' },
        { label: t('inspector.fields.bodyJson'), value: '{"username":"emilys","password":"emilyspass"}' },
        { label: t('inspector.fields.outputPath'), value: 'auth' },
      ],
    },
    {
      type: 'setVariable',
      title: t('pipelineEditor.help.nodes.setVariable.title'),
      fields: [
        { label: t('inspector.fields.valueExtractPath'), value: 'auth.accessToken' },
        { label: t('inspector.fields.variableName'), value: 'authToken' },
      ],
    },
    {
      type: 'api',
      title: t('pipelineEditor.help.nodes.api.title'),
      fields: [
        { label: t('inspector.fields.method'), value: 'GET' },
        { label: 'URL', value: 'https://dummyjson.com/auth/me' },
        { label: t('inspector.fields.headersJson'), value: '[{"key":"Authorization","value":"Bearer #authToken"}]' },
        { label: t('inspector.fields.bodyJson'), value: t('pipelineEditor.help.exampleSteps.empty') },
        { label: t('inspector.fields.outputPath'), value: 'profile' },
      ],
    },
    {
      type: 'transform',
      title: t('pipelineEditor.help.nodes.transform.title'),
      fields: [
        { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.assignLiteral') },
        { label: t('inspector.fields.targetPath'), value: 'profile.source' },
        { label: t('inspector.fields.literalValue'), value: 'dummyjson-auth-profile-template' },
      ],
    },
    {
      type: 'output',
      title: t('pipelineEditor.help.nodes.output.title'),
      fields: [{ label: t('inspector.fields.outputPath'), value: 'profile' }],
    },
  ]
}

export function buildExampleFourSteps(t: (key: string) => string): HelpStep[] {
  return [
    {
      type: 'start',
      title: t('pipelineEditor.help.nodes.start.title'),
      noConfig: true,
    },
    {
      type: 'api',
      title: t('pipelineEditor.help.nodes.api.title'),
      fields: [
        { label: t('inspector.fields.method'), value: 'GET' },
        { label: 'URL', value: 'https://jsonplaceholder.typicode.com/todos' },
        { label: t('inspector.fields.outputPath'), value: 'todos' },
      ],
    },
    {
      type: 'iterate',
      title: t('pipelineEditor.help.nodes.iterate.title'),
      fields: [
        { label: t('inspector.fields.sourcePath'), value: 'todos' },
      ],
    },
    {
      type: 'transform',
      title: t('pipelineEditor.help.nodes.transform.title'),
      fields: [
        { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.pickPath') },
        { label: t('inspector.fields.sourcePath'), value: '__currentItem' },
        { label: t('inspector.fields.targetPath'), value: 'result.currentItem' },
      ],
    },
    {
      type: 'transform',
      title: t('pipelineEditor.help.nodes.transform.title'),
      fields: [
        { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.pickPath') },
        { label: t('inspector.fields.sourcePath'), value: '__currentIndex' },
        { label: t('inspector.fields.targetPath'), value: 'result.currentIndex' },
      ],
    },
    {
      type: 'output',
      title: t('pipelineEditor.help.nodes.output.title'),
      fields: [{ label: t('inspector.fields.outputPath'), value: 'result' }],
    },
  ]
}

export function buildExampleFiveSteps(t: (key: string) => string): HelpStep[] {
  return [
    {
      type: 'start',
      title: t('pipelineEditor.help.nodes.start.title'),
      noConfig: true,
    },
    {
      type: 'subflow',
      title: t('pipelineEditor.help.nodes.subflow.title'),
      noConfig: true,
    },
    {
      type: 'transform',
      title: t('pipelineEditor.help.nodes.transform.title'),
      fields: [
        { label: t('inspector.fields.mode'), value: t('inspector.options.transformMode.assignLiteral') },
        { label: t('inspector.fields.literalValue'), value: 'ok' },
        { label: t('inspector.fields.targetPath'), value: 'result.subflowStatus' },
      ],
    },
    {
      type: 'output',
      title: t('pipelineEditor.help.nodes.output.title'),
      fields: [{ label: t('inspector.fields.outputPath'), value: 'result.subflowStatus' }],
    },
  ]
}

/**
 * Maps help example slugs to their corresponding template IDs
 * so users can load examples directly into the editor
 */
export function resolveTemplateIdFromExampleSlug(slug: HelpExampleSlug | null): string | null {
  switch (slug) {
    case 'request-condition-transform':
      return 'doc-request-condition-transform'
    case 'list-wildcard-transform':
      return 'doc-list-wildcard-transform'
    case 'dummyjson-auth-profile':
      return 'dummyjson-auth-profile'
    case 'iterate-current-item':
      return 'doc-iterate-current-item'
    case 'subflow-once':
      return 'doc-subflow-once'
    default:
      return null
  }
}
