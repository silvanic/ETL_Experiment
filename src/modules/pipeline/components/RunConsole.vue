<script setup lang="ts">
import { computed } from 'vue'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'
import Tag from 'primevue/tag'
import Message from 'primevue/message'
import { useI18n } from 'vue-i18n'
import type { ExecutionLog } from '@/modules/pipeline/domain/types'

interface LogGroup {
	nodeId: string
	nodeName?: string
	nodeType: string
	logs: ExecutionLog[]
	hasError: boolean
}

interface Props {
	logs?: ExecutionLog[]
}

const store = usePipelineEditorStore()
const { t } = useI18n()
const props = defineProps<Props>()

const consoleLogs = computed(() => props.logs ?? store.logs)
const hasLogs = computed(() => consoleLogs.value.length > 0)
const eventCountLabel = computed(() => t('runConsole.eventCount', { count: consoleLogs.value.length }))

const groupedLogs = computed<LogGroup[]>(() => {
	const groups: LogGroup[] = []
	for (const log of consoleLogs.value) {
		const last = groups[groups.length - 1]
		if (last && last.nodeId === log.nodeId) {
			last.logs.push(log)
			if (log.level === 'error') last.hasError = true
		} else {
			groups.push({
				nodeId: log.nodeId,
				nodeName: log.nodeName,
				nodeType: log.nodeType,
				logs: [log],
				hasError: log.level === 'error',
			})
		}
	}
	return groups
})

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
	if (nodeType === 'condition') return t('defaults.nodeLabel.condition')
	if (nodeType === 'filter') return t('defaults.nodeLabel.filter')
	if (nodeType === 'transform') return t('defaults.nodeLabel.transform')
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

		<ul v-if="hasLogs" class="groups">
			<li
				v-for="group in groupedLogs"
				:key="`${group.nodeId}-${group.logs[0].at}`"
				:class="['group-item', group.hasError ? 'is-error' : 'is-info']"
			>
				<details open>
					<summary class="group-summary">
						<span v-if="group.nodeName" class="group-name">{{ group.nodeName }}</span>
						<span v-if="group.nodeName!==translatedNodeType(group.nodeType)" class="group-type">({{ translatedNodeType(group.nodeType) }})</span>
						<code class="group-id">{{ group.nodeId.slice(0, 8) }}</code>
						<Tag
							:value="String(group.logs.length)"
							:severity="group.hasError ? 'danger' : 'secondary'"
							class="group-count"
						/>
					</summary>
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
				</details>
			</li>
		</ul>
		<Message v-else severity="info" :closable="false">{{ t('runConsole.emptyMessage') }}</Message>
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

.groups {
	list-style: none;
	margin: 0;
	padding: 0;
	display: grid;
	gap: 0.6rem;
	flex: 1;
	overflow: auto;
}

.group-item {
	border: 1px solid var(--border);
	border-radius: 10px;
	overflow: hidden;
}

.group-item.is-info {
	border-left: 4px solid var(--accent);
}

.group-item.is-error {
	border-left: 4px solid var(--danger);
}

.group-summary {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.7rem;
	cursor: pointer;
	user-select: none;
	list-style: none;
}

.group-summary::-webkit-details-marker {
	display: none;
}

.group-summary::before {
	content: '▶';
	font-size: 0.6rem;
	color: var(--text-soft);
	transition: transform 0.15s;
	flex-shrink: 0;
}

details[open] .group-summary::before {
	transform: rotate(90deg);
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
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
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
	font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
