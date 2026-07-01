import { createInitialPipeline } from '@/modules/pipeline/domain/defaults'
import { pipelineDefinitionSchema } from '@/modules/pipeline/domain/schema'
import type { PipelineDefinition } from '@/modules/pipeline/domain/types'

const LEGACY_STORAGE_KEY = 'etl-experiment.pipeline.v1'
const PIPELINE_INDEX_KEY = 'etl-experiment.pipelines.index.v1'
const CURRENT_PIPELINE_ID_KEY = 'etl-experiment.pipelines.current.v1'
const PIPELINE_ENTRY_PREFIX = 'etl-experiment.pipelines.entry.v1.'

export interface SavedPipelineSummary {
  id: string
  name: string
  updatedAt: string
}

function getEntryKey(id: string): string {
  return `${PIPELINE_ENTRY_PREFIX}${id}`
}

function readIndex(): SavedPipelineSummary[] {
  const raw = localStorage.getItem(PIPELINE_INDEX_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((item): item is SavedPipelineSummary => {
        return Boolean(
          item
            && typeof item === 'object'
            && typeof item.id === 'string'
            && typeof item.name === 'string'
            && typeof item.updatedAt === 'string',
        )
      })
      .filter((item) => localStorage.getItem(getEntryKey(item.id)) !== null)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch {
    return []
  }
}

function writeIndex(next: SavedPipelineSummary[]): void {
  localStorage.setItem(PIPELINE_INDEX_KEY, JSON.stringify(next))
}

function saveCurrentPipelineId(id: string): void {
  localStorage.setItem(CURRENT_PIPELINE_ID_KEY, id)
}

function readCurrentPipelineId(): string | null {
  return localStorage.getItem(CURRENT_PIPELINE_ID_KEY)
}

function removeSavedPipelineReference(pipelineId: string, removeEntry = false): void {
  if (removeEntry) {
    localStorage.removeItem(getEntryKey(pipelineId))
  }

  const currentIndex = readIndex()
  const nextIndex = currentIndex.filter((item) => item.id !== pipelineId)

  if (nextIndex.length !== currentIndex.length) {
    writeIndex(nextIndex)
  }

  if (readCurrentPipelineId() === pipelineId) {
    localStorage.removeItem(CURRENT_PIPELINE_ID_KEY)
  }
}

function loadLegacyPipeline(): PipelineDefinition | null {
  const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    return pipelineDefinitionSchema.parse(parsed)
  } catch {
    return null
  }
}

export function listSavedPipelines(): SavedPipelineSummary[] {
  return readIndex()
}

export function loadSavedPipeline(pipelineId: string): PipelineDefinition | null {
  const entryKey = getEntryKey(pipelineId)
  const raw = localStorage.getItem(entryKey)
  if (!raw) {
    removeSavedPipelineReference(pipelineId)
    return null
  }

  try {
    const parsed = JSON.parse(raw)
    const definition = pipelineDefinitionSchema.parse(parsed)

    // Persist canonical format after schema transforms/migrations.
    const canonicalRaw = JSON.stringify(definition)
    if (canonicalRaw !== raw) {
      localStorage.setItem(entryKey, canonicalRaw)
    }

    saveCurrentPipelineId(definition.id)
    return definition
  } catch {
    removeSavedPipelineReference(pipelineId, true)
    return null
  }
}

export function loadPipeline(): PipelineDefinition {
  const currentId = readCurrentPipelineId()
  if (currentId) {
    const current = loadSavedPipeline(currentId)
    if (current) {
      return current
    }
  }

  const saved = listSavedPipelines()
  if (saved.length > 0) {
    const first = loadSavedPipeline(saved[0].id)
    if (first) {
      return first
    }
  }

  const legacy = loadLegacyPipeline()
  if (legacy) {
    savePipeline(legacy)
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return legacy
  }

  return createInitialPipeline()
}

export function savePipeline(definition: PipelineDefinition): void {
  const nextSummary: SavedPipelineSummary = {
    id: definition.id,
    name: definition.name,
    updatedAt: definition.updatedAt,
  }

  localStorage.setItem(getEntryKey(definition.id), JSON.stringify(definition))
  saveCurrentPipelineId(definition.id)

  const currentIndex = readIndex()
  const withoutCurrent = currentIndex.filter((item) => item.id !== definition.id)
  writeIndex([nextSummary, ...withoutCurrent].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
}

export function deleteSavedPipeline(pipelineId: string): void {
  removeSavedPipelineReference(pipelineId, true)
}

export function deleteAllSavedPipelines(): void {
  const allPipelines = readIndex()
  for (const pipeline of allPipelines) {
    removeSavedPipelineReference(pipeline.id, true)
  }
}
