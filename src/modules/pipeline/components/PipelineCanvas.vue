<script setup lang="ts">
import {
  Handle,
  MarkerType,
  Position,
  VueFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeMouseEvent,
} from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { usePipelineEditorStore } from '@/modules/pipeline/stores/pipelineEditorStore'

import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import '@vue-flow/controls/dist/style.css'
import './vueFlowTheme.css'

const store = usePipelineEditorStore()

function onNodesChange(changes: NodeChange[]): void {
  store.onNodesChange(changes)
}

function onEdgesChange(changes: EdgeChange[]): void {
  store.onEdgesChange(changes)
}

function onConnect(connection: Connection): void {
  store.onConnect(connection)
}

function onNodeClick(event: NodeMouseEvent): void {
  store.setSelectedNode(event.node.id)
}

function onPaneClick(): void {
  store.setSelectedNode(null)
}
</script>

<template>
  <section class="panel">
    <VueFlow
      :nodes="store.nodes"
      :edges="store.edges"
      :default-edge-options="{ markerEnd: MarkerType.ArrowClosed, type: 'step' }"
      :fit-view-on-init="true"
      :class="['canvas', 'dark']"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @connect="onConnect"
      @node-click="onNodeClick"
      @pane-click="onPaneClick"
    >
      <Background :gap="20" :size="1.1" />
      <Controls position="top-left":show-interactive="true" />
      <template #node-default="{ data }">
          <Handle type="target" :position="Position.Left" />
          <div v-if="data.name?.trim()">
              <div class="etl-node-label">{{ data.label }}</div>
              <div class="etl-node-title">{{ data.name }}</div>
          </div>
          <div v-else>
              <div class="etl-node-title">{{ data.label }}</div>
          </div>
          <Handle type="source" :position="Position.Right" />
      </template>
    </VueFlow>
  </section>
</template>

<style scoped>
.panel {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.canvas {
  width: 100%;
  height: 100%;
  min-height: 420px;
  background: linear-gradient(180deg, #141a27 0%, #0f1419 100%);
}

.etl-node {
  min-width: 180px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--panel);
  color: var(--text);
  padding: 0.6rem 0.7rem;
  box-shadow: var(--shadow);
}

.etl-node-default {
  display: grid;
  gap: 0.45rem;
}

.etl-node-fixed {
  min-width: 140px;
  text-align: center;
  font-weight: 700;
}

.etl-node-label {
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.etl-node-title {
  font-size: 0.92rem;
}

</style>
