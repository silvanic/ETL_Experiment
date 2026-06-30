<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import { useI18n } from 'vue-i18n'
import type { ExecutionLog, PipelineNode } from '@/modules/pipeline/domain/types'

interface LogGroup {
	nodeId: string
	nodeName?: string
	nodeType: string
	logs: ExecutionLog[]
	hasError: boolean
	durationMs?: number
}

interface ContainerTimelineEntry {
	id: string
	kind: 'container'
	containerNodeId: string
	containerNodeName: string
	containerType: 'iterate' | 'subflow'
	rawLogs: ExecutionLog[]
	groups: LogGroup[]
	hasError: boolean
	totalEvents: number
	totalDurationMs: number
}

interface ContainerExecutionSection {
	id: string
	index: number
	isEntry: boolean
	groups: LogGroup[]
	hasError: boolean
	totalEvents: number
	totalDurationMs: number
}

interface NodeTimelineEntry {
	id: string
	kind: 'node'
	nodeId: string
	nodeName?: string
	nodeType: string
	groups: LogGroup[]
	hasError: boolean
	totalEvents: number
	totalDurationMs: number
}

type LogTimelineEntry = ContainerTimelineEntry | NodeTimelineEntry

interface Props {
	logs?: ExecutionLog[]
}

const store = usePipelineEditorStore()
const { t } = useI18n()
const props = defineProps<Props>()

const consoleLogs = computed(() => props.logs ?? store.logs)
const hasLogs = computed(() => consoleLogs.value.length > 0)
const eventCountLabel = computed(() => t('runConsole.eventCount', { count: consoleLogs.value.length }))
const autoCollapseGroups = computed(() => consoleLogs.value.length >= 300)
const collapsedContainerPanels = ref<Record<string, boolean>>({})
const collapsedIterationPanels = ref<Record<string, boolean>>({})
const collapsedGroupPanels = ref<Record<string, boolean>>({})

const activeEnvironmentName = computed(() => {
  return store.activeEnvironment?.name ?? 'N/A'
})

const environmentVariables = computed(() => {
  return Object.entries(store.effectiveVariableMap).map(([name, value]) => ({
    name,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }))
})

const nodesById = computed(() => {
	const index = new Map<string, PipelineNode>()
	for (const node of store.nodes) {
		index.set(node.id, node)
	}

	return index
})

function isContainerNodeType(type: string): type is 'iterate' | 'subflow' {
	return type === 'iterate' || type === 'subflow'
}

const containerStartNodeIdsByParent = computed(() => {
	const map = new Map<string, Set<string>>()
	for (const node of store.nodes) {
		if (!node.parentNode || node.data.type !== 'start') {
			continue
		}

		const parentNode = nodesById.value.get(node.parentNode)
		if (!parentNode || !isContainerNodeType(parentNode.data.type)) {
			continue
		}

		if (!map.has(node.parentNode)) {
			map.set(node.parentNode, new Set<string>())
		}

		map.get(node.parentNode)?.add(node.id)
	}

	return map
})

function pushLogIntoGroups(groups: LogGroup[], log: ExecutionLog): void {
	const last = groups[groups.length - 1]
	if (last && last.nodeId === log.nodeId) {
		last.logs.push(log)
		if (log.level === 'error') {
			last.hasError = true
		}
		if (log.durationMs !== undefined) {
			last.durationMs = (last.durationMs ?? 0) + log.durationMs
		}
		return
	}

	groups.push({
		nodeId: log.nodeId,
		nodeName: log.nodeName,
		nodeType: log.nodeType,
		logs: [log],
		hasError: log.level === 'error',
		durationMs: log.durationMs,
	})
}

function pushLogIntoTimelineEntry(entry: LogTimelineEntry, log: ExecutionLog): void {
	if (entry.kind === 'container') {
		entry.rawLogs.push(log)
	}

	pushLogIntoGroups(entry.groups, log)
	entry.totalEvents += 1
	entry.totalDurationMs += log.durationMs ?? 0
	if (log.level === 'error') {
		entry.hasError = true
	}
}

function resolveContainerAncestor(log: ExecutionLog): { nodeId: string; nodeType: 'iterate' | 'subflow' } | null {
	const lookup = nodesById.value
	if (isContainerNodeType(log.nodeType)) {
		return {
			nodeId: log.nodeId,
			nodeType: log.nodeType,
		}
	}

	let currentNode = lookup.get(log.nodeId)
	const visited = new Set<string>()

	while (currentNode?.parentNode) {
		if (visited.has(currentNode.parentNode)) {
			break
		}

		visited.add(currentNode.parentNode)
		const parentNode = lookup.get(currentNode.parentNode)
		if (!parentNode) {
			break
		}

		if (isContainerNodeType(parentNode.data.type)) {
			return {
				nodeId: parentNode.id,
				nodeType: parentNode.data.type,
			}
		}

		currentNode = parentNode
	}

	return null
}

const timelineEntries = computed<LogTimelineEntry[]>(() => {
	const entries: LogTimelineEntry[] = []

	for (let index = 0; index < consoleLogs.value.length; index += 1) {
		const log = consoleLogs.value[index]
		const containerAncestor = resolveContainerAncestor(log)
		const lastEntry = entries[entries.length - 1]

		if (containerAncestor) {
			if (
				lastEntry?.kind === 'container'
				&& lastEntry.containerNodeId === containerAncestor.nodeId
				&& lastEntry.containerType === containerAncestor.nodeType
			) {
				pushLogIntoTimelineEntry(lastEntry, log)
				continue
			}

			const containerNode = nodesById.value.get(containerAncestor.nodeId)
			const nextEntry: ContainerTimelineEntry = {
				id: `container:${containerAncestor.nodeType}:${containerAncestor.nodeId}:${index}`,
				kind: 'container',
				containerNodeId: containerAncestor.nodeId,
				containerType: containerAncestor.nodeType,
				containerNodeName: containerNode?.data.name?.trim() || containerNode?.data.label || containerAncestor.nodeId,
				rawLogs: [],
				groups: [],
				hasError: false,
				totalEvents: 0,
				totalDurationMs: 0,
			}
			pushLogIntoTimelineEntry(nextEntry, log)
			entries.push(nextEntry)
			continue
		}

		if (lastEntry?.kind === 'node' && lastEntry.nodeId === log.nodeId) {
			pushLogIntoTimelineEntry(lastEntry, log)
			continue
		}

		const nextEntry: NodeTimelineEntry = {
			id: `node:${log.nodeId}:${index}`,
			kind: 'node',
			nodeId: log.nodeId,
			nodeName: log.nodeName,
			nodeType: log.nodeType,
			groups: [],
			hasError: false,
			totalEvents: 0,
			totalDurationMs: 0,
		}
		pushLogIntoTimelineEntry(nextEntry, log)
		entries.push(nextEntry)
	}

	return entries
})

function buildContainerExecutionSections(entry: ContainerTimelineEntry): ContainerExecutionSection[] {
	const startNodeIds = containerStartNodeIdsByParent.value.get(entry.containerNodeId)
	const sections: Array<{ id: string; index: number; isEntry: boolean; logs: ExecutionLog[] }> = []
	const entryLogs: ExecutionLog[] = []
	let currentSection: { index: number; logs: ExecutionLog[] } | null = null
	let iterationIndex = 0

	for (const log of entry.rawLogs) {
		const isIterationStart = log.nodeType === 'start' && startNodeIds?.has(log.nodeId)

		if (isIterationStart) {
			iterationIndex += 1
			currentSection = {
				index: iterationIndex,
				logs: [],
			}
			sections.push({
				id: `${entry.id}:execution:${iterationIndex}`,
				index: iterationIndex,
				isEntry: false,
				logs: currentSection.logs,
			})
		}

		if (!currentSection) {
			entryLogs.push(log)
			continue
		}

		currentSection.logs.push(log)
	}

	if (entryLogs.length > 0) {
		sections.unshift({
			id: `${entry.id}:entry`,
			index: 0,
			isEntry: true,
			logs: entryLogs,
		})
	}

	return sections.map((section) => {
		const groups: LogGroup[] = []
		let totalDurationMs = 0
		let hasError = false

		for (const log of section.logs) {
			pushLogIntoGroups(groups, log)
			totalDurationMs += log.durationMs ?? 0
			if (log.level === 'error') {
				hasError = true
			}
		}

		return {
			id: section.id,
			index: section.index,
			isEntry: section.isEntry,
			groups,
			hasError,
			totalEvents: section.logs.length,
			totalDurationMs,
		}
	})
}

const containerExecutionSectionsByEntryId = computed<Record<string, ContainerExecutionSection[]>>(() => {
	const result: Record<string, ContainerExecutionSection[]> = {}
	for (const entry of timelineEntries.value) {
		if (entry.kind !== 'container') {
			continue
		}

		result[entry.id] = buildContainerExecutionSections(entry)
	}

	return result
})

function isContainerCollapsed(entryId: string): boolean {
	const state = collapsedContainerPanels.value[entryId]
	if (state === undefined) {
		return true
	}

	return state
}

function containerAccordionValue(entryId: string): string | undefined {
	return isContainerCollapsed(entryId) ? undefined : 'open'
}

function onContainerAccordionUpdate(entryId: string, value: string | string[] | null | undefined): void {
	const isOpen = Array.isArray(value) ? value.includes('open') : value === 'open'
	collapsedContainerPanels.value = {
		...collapsedContainerPanels.value,
		[entryId]: !isOpen,
	}
}

function isIterationCollapsed(sectionId: string): boolean {
	const state = collapsedIterationPanels.value[sectionId]
	if (state === undefined) {
		return true
	}

	return state
}

function iterationAccordionValue(sectionId: string): string | undefined {
	return isIterationCollapsed(sectionId) ? undefined : 'open'
}

function onIterationAccordionUpdate(sectionId: string, value: string | string[] | null | undefined): void {
	const isOpen = Array.isArray(value) ? value.includes('open') : value === 'open'
	collapsedIterationPanels.value = {
		...collapsedIterationPanels.value,
		[sectionId]: !isOpen,
	}
}

function isGroupCollapsed(groupId: string): boolean {
	const state = collapsedGroupPanels.value[groupId]
	if (state === undefined) {
		return autoCollapseGroups.value
	}

	return state
}

function groupAccordionValue(groupId: string): string | undefined {
	return isGroupCollapsed(groupId) ? undefined : 'open'
}

function onGroupAccordionUpdate(groupId: string, value: string | string[] | null | undefined): void {
	const isOpen = Array.isArray(value) ? value.includes('open') : value === 'open'
	collapsedGroupPanels.value = {
		...collapsedGroupPanels.value,
		[groupId]: !isOpen,
	}
}

function isEntryContainerGroup(entry: ContainerTimelineEntry, section: ContainerExecutionSection, group: LogGroup): boolean {
	return section.isEntry && group.nodeType === entry.containerType
}

function executionSectionLabel(entry: ContainerTimelineEntry, section: ContainerExecutionSection): string {
	if (section.isEntry) {
		return t('runConsole.entryLabel')
	}

	if (entry.containerType === 'iterate') {
		return t('runConsole.iterationLabel', { index: section.index })
	}

	return t('runConsole.executionLabel', { index: section.index })
}

const totalDurationMs = computed(() =>
	consoleLogs.value.reduce((sum, log) => sum + (log.durationMs ?? 0), 0)
)

function formatDetails(details: unknown): string {
	if (typeof details === 'string') {
		return details
	}

	try {
		return JSON.stringify(details, null, 2)
	} catch {
		return String(details)
	}
}

function translatedNodeType(nodeType: string): string {
	if (nodeType === 'start') return t('defaults.nodeLabel.start')
	if (nodeType === 'api') return t('defaults.nodeLabel.api')
	if (nodeType === 'setVariable') return t('defaults.nodeLabel.setVariable')
	if (nodeType === 'condition') return t('defaults.nodeLabel.condition')
	if (nodeType === 'filter') return t('defaults.nodeLabel.filter')
	if (nodeType === 'transform') return t('defaults.nodeLabel.transform')
	if (nodeType === 'map') return t('defaults.nodeLabel.map')
	if (nodeType === 'iterate') return t('defaults.nodeLabel.iterate')
	if (nodeType === 'subflow') return t('defaults.nodeLabel.subflow')
	if (nodeType === 'output') return t('defaults.nodeLabel.output')
	return nodeType
}
</script>

<template>
	<div class="console-container">
		<div class="console-header">
			<h2>{{ t('runConsole.title') }}</h2>
			<Tag :value="eventCountLabel" severity="contrast" />
		</div>
		<p v-if="hasLogs" class="console-subtitle">{{ t('runConsole.subtitleWithLogs') }}</p>
		<p v-else class="console-subtitle">{{ t('runConsole.subtitleEmpty') }}</p>

		<Panel v-if="environmentVariables.length > 0" toggleable class="console-panel environment-panel">
			<template #header>
				<div class="panel-header-content">
					<span>{{ t('runConsole.environment') }}</span>
					<Tag :value="String(environmentVariables.length)" severity="secondary" />
				</div>
			</template>
			<div class="environment-active">
				<span class="label">{{ t('runConsole.activeEnvironment') }}:</span>
				<span class="value">{{ activeEnvironmentName }}</span>
			</div>
			<ul class="environment-list">
				<li v-for="env in environmentVariables" :key="env.name" class="environment-item">
					<code class="env-name">{{ env.name }}</code>
					<span class="env-separator">:</span>
					<code class="env-value">{{ env.value }}</code>
				</li>
			</ul>
		</Panel>

		<div v-if="hasLogs" class="groups">
			<template v-for="entry in timelineEntries" :key="entry.id">
				<Accordion
					v-if="entry.kind === 'container'"
					lazy
					:value="containerAccordionValue(entry.id)"
					@update:value="onContainerAccordionUpdate(entry.id, $event)"
					class="accordion-shell"
				>
					<AccordionPanel
						value="open"
						class="console-panel iterate-section"
						:class="[
							entry.hasError ? 'is-error' : 'is-info',
							entry.containerType === 'iterate' ? 'is-iterate' : 'is-subflow',
						]"
					>
						<AccordionHeader>
							<div class="panel-header-content">
								<div class="iterate-title-row">
									<span class="group-name">{{ entry.containerNodeName }}</span>
									<span class="group-type">({{ translatedNodeType(entry.containerType) }})</span>
									<span v-if="entry.totalDurationMs > 0" class="duration">{{ entry.totalDurationMs }}ms</span>
									<code class="group-id">{{ entry.containerNodeId.slice(0, 8) }}</code>
								</div>
								<div class="iterate-metrics-row">
									<Tag
										:value="String(entry.totalEvents)"
										:severity="entry.hasError ? 'danger' : 'secondary'"
									/>
								</div>
							</div>
						</AccordionHeader>
						<AccordionContent>

							<ul class="execution-sections">
								<li
									v-for="section in containerExecutionSectionsByEntryId[entry.id]"
									:key="section.id"
								>
									<Accordion
										lazy
										:value="iterationAccordionValue(section.id)"
										@update:value="onIterationAccordionUpdate(section.id, $event)"
										class="accordion-shell"
									>
										<AccordionPanel
											value="open"
											class="console-panel iteration-panel"
											:class="section.hasError ? 'is-error' : 'is-info'"
										>
											<AccordionHeader>
												<div class="panel-header-content">
													<span class="group-name">{{ executionSectionLabel(entry, section) }}</span>
													<div v-if="section.totalDurationMs > 0" class="iteration-summary">
														<span class="duration">{{ section.totalDurationMs }}ms</span>
													</div>
													<Tag
														:value="String(section.totalEvents)"
														:severity="section.hasError ? 'danger' : 'secondary'"
														class="group-count"
													/>
												</div>
											</AccordionHeader>
											<AccordionContent>
												<ul class="section-groups">
													<li
														v-for="group in section.groups"
														:key="`${section.id}-${group.nodeId}-${group.logs[0].at}`"
													>
														<template v-if="isEntryContainerGroup(entry, section, group)">
															<ul class="logs logs-inline">
																<li
																	v-for="log in group.logs"
																	:key="`${log.at}-${log.message}`"
																	:class="['log-item', log.level === 'error' ? 'is-error' : 'is-info']"
																>
																	<div class="meta">
																		<span>{{ new Date(log.at).toLocaleTimeString() }}</span>
																	</div>
																	<p>{{ log.message }}</p>
																	<details v-if="log.details !== undefined" class="details-block">
																		<summary class="details-toggle">{{ t('runConsole.showDetails') }}</summary>
																		<pre>{{ formatDetails(log.details) }}</pre>
																	</details>
																</li>
															</ul>
														</template>
														<Accordion
															v-else
															lazy
															:value="groupAccordionValue(`${section.id}-${group.nodeId}-${group.logs[0].at}`)"
															@update:value="onGroupAccordionUpdate(`${section.id}-${group.nodeId}-${group.logs[0].at}`, $event)"
															class="accordion-shell"
														>
															<AccordionPanel
																value="open"
																class="console-panel group-panel"
																:class="group.hasError ? 'is-error' : 'is-info'"
															>
																<AccordionHeader>
																	<div class="panel-header-content">
																		<span v-if="group.nodeName" class="group-name">{{ group.nodeName }}</span>
																		<span v-if="group.nodeName !== translatedNodeType(group.nodeType)" class="group-type">({{ translatedNodeType(group.nodeType) }})</span>
																		<span v-if="group.durationMs !== undefined" class="duration">{{ group.durationMs }}ms</span>
																		<code class="group-id">{{ group.nodeId.slice(0, 8) }}</code>
																		<Tag
																			:value="String(group.logs.length)"
																			:severity="group.hasError ? 'danger' : 'secondary'"
																			class="group-count"
																		/>
																	</div>
																</AccordionHeader>
																<AccordionContent>
																	<ul class="logs">
																		<li
																			v-for="log in group.logs"
																			:key="`${log.at}-${log.message}`"
																			:class="['log-item', log.level === 'error' ? 'is-error' : 'is-info']"
																		>
																			<div class="meta">
																				<span>{{ new Date(log.at).toLocaleTimeString() }}</span>
																			</div>
																			<p>{{ log.message }}</p>
																			<details v-if="log.details !== undefined" class="details-block">
																				<summary class="details-toggle">{{ t('runConsole.showDetails') }}</summary>
																				<pre>{{ formatDetails(log.details) }}</pre>
																			</details>
																		</li>
																	</ul>
																</AccordionContent>
															</AccordionPanel>
														</Accordion>
													</li>
												</ul>
											</AccordionContent>
										</AccordionPanel>
									</Accordion>
								</li>
							</ul>
						</AccordionContent>
					</AccordionPanel>
				</Accordion>

				<Accordion
					v-else
					lazy
					:value="groupAccordionValue(entry.id)"
					@update:value="onGroupAccordionUpdate(entry.id, $event)"
					class="accordion-shell"
				>
					<AccordionPanel
						value="open"
						class="console-panel group-panel"
						:class="entry.hasError ? 'is-error' : 'is-info'"
					>
						<AccordionHeader>
							<div class="panel-header-content">
								<span v-if="entry.nodeName" class="group-name">{{ entry.nodeName }}</span>
								<span v-if="entry.nodeName !== translatedNodeType(entry.nodeType)" class="group-type">({{ translatedNodeType(entry.nodeType) }})</span>
								<span v-if="entry.totalDurationMs > 0" class="duration">{{ entry.totalDurationMs }}ms</span>
								<code class="group-id">{{ entry.nodeId.slice(0, 8) }}</code>
								<Tag
									:value="String(entry.totalEvents)"
									:severity="entry.hasError ? 'danger' : 'secondary'"
									class="group-count"
								/>
							</div>
						</AccordionHeader>
						<AccordionContent>
							<ul class="logs">
								<li
									v-for="log in entry.groups[0].logs"
									:key="`${log.at}-${log.message}`"
									:class="['log-item', log.level === 'error' ? 'is-error' : 'is-info']"
								>
									<div class="meta">
										<span>{{ new Date(log.at).toLocaleTimeString() }}</span>
									</div>
									<p>{{ log.message }}</p>
									<details v-if="log.details !== undefined" class="details-block">
										<summary class="details-toggle">{{ t('runConsole.showDetails') }}</summary>
										<pre>{{ formatDetails(log.details) }}</pre>
									</details>
								</li>
							</ul>
						</AccordionContent>
					</AccordionPanel>
				</Accordion>
			</template>
		</div>
		<Message v-else severity="info" :closable="false">{{ t('runConsole.emptyMessage') }}</Message>
		<Message v-if="hasLogs" severity="secondary" size="large" :closable="false" class="total-duration">
			<span>{{ t('runConsole.totalDuration') }}</span>
			<span class="duration">{{ totalDurationMs }}ms</span>
		</Message>
	</div>
</template>

<style scoped>
.console-container {
	margin: 0;
	padding: 1.25rem;
	height: 100%;
	display: flex;
	flex-direction: column;
	background: var(--panel);
	border: 1px solid var(--border);
	border-radius: 14px;
	box-shadow: var(--shadow);
}

.console-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	margin-bottom: 0.5rem;
}

h2 {
	margin: 0;
	font-size: 1rem;
}

.console-subtitle {
	margin: 0 0 1rem 0;
	color: var(--text-soft);
	font-size: 0.9rem;
}

.console-panel {
	border: 1px solid var(--border);
	border-radius: 10px;
	overflow: hidden;
	background: var(--panel);
}

.accordion-shell {
	background: transparent;
	margin-left:5px;
}

.accordion-shell :deep(.p-accordionpanel) {
	margin: 0;
	border: none;
	background: transparent;
}

.accordion-shell :deep(.p-accordionheader) {
	border: none;
	padding: 0;
	background: transparent;
}

.accordion-shell :deep(.p-accordionheader .panel-header-content) {
	padding: 0.55rem 0.75rem 0.55rem 0.95rem;
}

.accordion-shell :deep(.p-accordionheader-toggle-icon) {
	margin-left: 0.5rem;
	color: var(--text-soft);
}

.accordion-shell :deep(.p-accordioncontent) {
	padding: 0;
	border: none;
	background: transparent;
}

.accordion-shell :deep(.p-accordioncontent-content) {
	padding: 0;
	background: transparent;
}

.console-panel :deep(.p-panel-header) {
	padding: 0.55rem 0.75rem;
	background: color-mix(in srgb, var(--panel) 90%, var(--code-bg));
	border-bottom: 1px solid var(--border);
}

.console-panel :deep(.p-panel-content) {
	padding: 0.6rem 0.75rem;
}

.panel-header-content {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	width: 100%;
}

.iterate-title-row {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	min-width: 0;
}

.iterate-metrics-row {
	display: flex;
	align-items: center;
	gap: 0.45rem;
	margin-left: auto;
}

.environment-active {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.6rem 0.8rem;
	font-size: 0.8rem;
	border-bottom: 1px solid var(--border);
}

.environment-active .label {
	font-weight: 600;
	color: var(--text-soft);
}

.environment-active .value {
	font-weight: 600;
	color: var(--accent);
}

.environment-list {
	list-style: none;
	margin: 0;
	padding: 0.6rem 0.8rem;
	display: grid;
	gap: 0.4rem;
}

.environment-item {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-size: 0.8rem;
}

.env-name {
	font-weight: 600;
	color: var(--accent);
}

.env-separator {
	color: var(--text-soft);
}

.env-value {
	color: var(--text);
	word-break: break-all;
}

.groups {
	margin: 0;
	padding: 0 0.1rem;
	display: grid;
	gap: 0.95rem;
	flex: 1;
	overflow: auto;
}

.section-groups {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 0.85rem;
}

.execution-sections {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 0.75rem;
}

.iteration-summary {
	display: flex;
	justify-content: flex-end;
}

.iterate-section.is-info {
	border-left: 4px solid color-mix(in srgb, var(--accent) 70%, var(--panel));
}

.iterate-section.is-error {
	border-left: 4px solid color-mix(in srgb, var(--danger) 70%, var(--panel));
}

.iterate-section.is-iterate.is-info {
	border-left-color: var(--flow-iterate-panel-border);
	--container-info-border: var(--flow-iterate-panel-border);
}

.iterate-section.is-subflow.is-info {
	border-left-color: var(--flow-subflow-panel-border);
	--container-info-border: var(--flow-subflow-panel-border);
}

.iterate-section {
	--container-info-border: var(--accent);
}

.group-panel.is-info {
	border-left: 3px solid var(--accent);
}

.group-panel.is-error {
	border-left: 3px solid var(--danger);
}

.iteration-panel.is-info {
	border-left: 3px solid color-mix(in srgb, var(--accent) 75%, var(--panel));
}

.iterate-section :deep(.iteration-panel.is-info) {
	border-left-color: color-mix(in srgb, var(--container-info-border) 75%, var(--panel));
}

.iterate-section :deep(.group-panel.is-info) {
	border-left-color: var(--container-info-border);
}

.iterate-section :deep(.log-item.is-info) {
	border-left-color: var(--container-info-border);
}

.iterate-section :deep(.duration) {
	color: var(--container-info-border);
	background: color-mix(in srgb, var(--container-info-border) 12%, transparent);
	border-color: color-mix(in srgb, var(--container-info-border) 35%, transparent);
}

.iterate-section :deep(.group-id) {
	color: color-mix(in srgb, var(--container-info-border) 72%, var(--text-soft));
}

.iteration-panel.is-error {
	border-left: 3px solid color-mix(in srgb, var(--danger) 75%, var(--panel));
}

.group-type {
	font-size: 0.85rem;
	text-transform: capitalize;
}

.group-name {
	font-weight: 700;
	font-size: 0.85rem;
}

.group-id {
	font-size: 0.75rem;
	color: var(--text-soft);
}

.group-count {
	margin-left: auto;
}

.logs {
	list-style: none;
	margin: 0;
	padding: 0 0.7rem 0.6rem;
	display: grid;
	gap: 0.4rem;
}

.logs-inline {
	padding-left: 0.2rem;
	padding-right: 0.2rem;
}

.log-item {
	border: 1px solid var(--border);
	border-radius: 8px;
	padding: 0.45rem 0.6rem;
	background: var(--panel);
}

.log-item.is-error {
	border-left: 3px solid var(--danger);
}

.log-item.is-info {
	border-left: 3px solid var(--accent);
}

.meta {
	display: flex;
	gap: 0.5rem;
	align-items: center;
	color: var(--text-soft);
	font-size: 0.75rem;
	margin-bottom: 0.2rem;
}

.duration {
	font-variant-numeric: tabular-nums;
	font-weight: 600;
	font-size: 0.72rem;
	color: var(--accent);
	background: color-mix(in srgb, var(--accent) 12%, transparent);
	border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
	border-radius: 4px;
	padding: 0 0.35rem;
}

.group-id,
.environment-active .value,
pre {
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.total-duration {
	display: flex;
	justify-content: space-between;
	margin-top: 0.75rem;
}

.total-duration .duration {
	font-size: 1rem;
	padding: 0.1rem 0.5rem;
}

p {
	margin: 0;
	font-size: 0.85rem;
}

.details-block {
	margin-top: 0.4rem;
}

.details-toggle {
	font-size: 0.75rem;
	color: var(--text-soft);
	cursor: pointer;
	user-select: none;
	list-style: none;
}

.details-toggle::-webkit-details-marker {
	display: none;
}

.details-toggle::before {
	content: '▶';
	font-size: 0.55rem;
	margin-right: 0.3rem;
	transition: transform 0.15s;
	display: inline-block;
}

details.details-block[open] .details-toggle::before {
	transform: rotate(90deg);
}

pre {
	margin: 0.5rem 0 0;
	padding: 0.6rem 0.7rem;
	border-radius: 8px;
	border: 1px solid var(--code-border);
	background: var(--code-bg);
	color: var(--text);
	overflow: auto;
	font-size: 0.78rem;
	line-height: 1.45;
}
</style>
