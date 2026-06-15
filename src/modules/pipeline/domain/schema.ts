import { z } from 'zod'
import { Position } from '@vue-flow/core'

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
})

const startConfigSchema = z.object({
  note: z.string().optional(),
})

const apiConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST']),
  headersRaw: z.string(),
  bodyRaw: z.string(),
  outputPath: z.string().min(1),
})

const conditionConfigSchema = z.object({
  leftPath: z.string().min(1),
  operator: z.enum(['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'exists']),
  aggregation: z.enum(['any', 'all', 'none']).default('any'),
  rightType: z.enum(['string', 'number', 'boolean', 'null']),
  rightValue: z.string(),
})

const filterConfigSchema = z.object({
  sourcePath: z.string().min(1),
  itemPath: z.string(),
  operator: z.enum(['equals', 'notEquals', 'greaterThan', 'lessThan', 'contains', 'exists']),
  rightType: z.enum(['string', 'number', 'boolean', 'null']),
  rightValue: z.string(),
  outputPath: z.string().min(1),
  outputPathRejected: z.string().min(1).default('result.rejected'),
})

const transformConfigSchema = z.object({
  mode: z.enum(['pickPath', 'assignLiteral']),
  sourcePath: z.string(),
  targetPath: z.string().min(1),
  literalValue: z.string(),
})

const outputConfigSchema = z.object({
  outputPath: z.string().min(1),
})

const nodeDataSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start'), label: z.string(), name: z.string().optional(), config: startConfigSchema }),
  z.object({ type: z.literal('api'), label: z.string(), name: z.string().optional(), config: apiConfigSchema }),
  z.object({ type: z.literal('condition'), label: z.string(), name: z.string().optional(), config: conditionConfigSchema }),
  z.object({ type: z.literal('filter'), label: z.string(), name: z.string().optional(), config: filterConfigSchema }),
  z.object({ type: z.literal('transform'), label: z.string(), name: z.string().optional(), config: transformConfigSchema }),
  z.object({ type: z.literal('output'), label: z.string(), name: z.string().optional(), config: outputConfigSchema }),
])

const nodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().default('default'),
  position: positionSchema,
  data: nodeDataSchema,
  sourcePosition: z.nativeEnum(Position).default(Position.Right),
  targetPosition: z.nativeEnum(Position).default(Position.Left),
})

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  data: z.object({ branch: z.enum(['true', 'false', 'filtered', 'rejected']).optional() }).optional(),
})

const variableSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  value: z.string(),
  type: z.enum(['string', 'number', 'json', 'object']).optional(),
})

export const pipelineDefinitionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.number().int().positive(),
  updatedAt: z.string(),
  nodes: z.array(nodeSchema).min(1),
  edges: z.array(edgeSchema),
  variables: z.array(variableSchema).default([]),
})

export type PipelineDefinitionSchema = z.infer<typeof pipelineDefinitionSchema>
