# Diagrammes Architecture - ETL Experiment

## Architecture générale

```mermaid
graph TB
    subgraph UI["🎨 UI Layer (Vue Components)"]
        PEP["PipelineEditorPage"]
        PC["PipelineCanvas"]
        NP["NodePalette"]
        IP["InspectorPanel"]
        RC["RunConsole"]
    end
    
    subgraph Store["🔄 State Layer (Pinia)"]
        PES["pipelineEditorStore<br/>(currentPipeline, currentRun, etc)"]
    end
    
    subgraph Engine["⚙️ Execution Layer"]
        RP["runPipeline<br/>(orchestration)"]
        NE["nodeExecutors<br/>(7 exécuteurs)"]
    end
    
    subgraph Domain["📋 Domain Layer"]
        Types["types.ts<br/>(TypeScript)"]
        Schema["schema.ts<br/>(Zod)"]
        Defaults["defaults.ts"]
    end
    
    subgraph Services["🗄️ Services Layer"]
        PS["pipelineStorage<br/>(localStorage)"]
        PU["pathUtils<br/>(JSON access)"]
        Vars["variables.ts<br/>(mapping)"]
    end
    
    PEP --> PC
    PEP --> NP
    PEP --> IP
    PEP --> RC
    
    PC --> PES
    IP --> PES
    RC --> PES
    NP --> PES
    
    PES --> RP
    RP --> NE
    
    NE --> Vars
    RP --> PU
    NE --> PU
    
    Types --> Schema
    Schema --> Defaults
    Schema --> Engine
    
    PES --> PS
    PES --> Defaults
```

---

## Flux d'exécution pipeline

```mermaid
sequenceDiagram
    participant UI as DialogPipelineRun
    participant Store as Store (Pinia)
    participant Engine as runPipeline()
    participant Exec as nodeExecutors
    participant Log as ExecutionLog

    UI->>Store: runCurrentPipeline()
    Store->>Engine: runPipeline(definition)
    
    Engine->>Engine: validate schema
    Engine->>Engine: initialize context = {}
    Engine->>Engine: queue = [START_ID]
    Engine->>Engine: visited = new Set()
    
    loop while queue.length > 0
        Engine->>Engine: nodeId = queue.shift()
        alt visited.has(nodeId)
            Engine->>Engine: continue (skip cycle)
        else
            Engine->>Engine: visited.add(nodeId)
            Engine->>Exec: executor = executorByType[type]
            Exec->>Exec: validate config
            Exec->>Exec: execute logic
            Exec->>Log: createLog(success)
            Exec-->>Engine: {success, context, nextNodeIds, logs}
            Engine->>Engine: queue.push(...nextNodeIds)
        end
    end
    
    Engine-->>Store: ExecutionRun {success, logs, context}
    Store->>Store: currentRun = result
    Store-->>UI: Update UI
    UI->>UI: display logs in RunConsole
```

---

## Arborescence type de nœuds

```mermaid
graph TD
    Start["🟢 START"]
    Api["🔷 API"]
    SetVar["📝 SET_VARIABLE"]
    Cond["🔀 CONDITION"]
    Filter["🔍 FILTER"]
    Transform["🔄 TRANSFORM"]
    Output["🔴 OUTPUT"]
    
    Start -->|toujours 1 seul| Api
    Api --> SetVar
    SetVar --> Cond
    Cond -->|true| Transform
    Cond -->|false| Filter
    Filter -->|filtered| Output
    Filter -->|rejected| Transform
    Transform -->|optionnel| Output
```

---

## Structure domaine - Types de données

```mermaid
graph LR
    subgraph Pipeline["📦 PipelineDefinition"]
        Nodes["📍 Nodes[]"]
        Edges["→ Edges[]"]
        Vars["📦 Variables[]"]
    end
    
    subgraph Node["🟦 PipelineNode"]
        NId["id: string"]
        NType["type: NodeType"]
        Pos["position: {x, y}"]
        Data["data: PipelineNodeData"]
    end
    
    subgraph Config["⚙️ NodeConfig"]
        StartCfg["StartNodeConfig"]
        ApiCfg["ApiNodeConfig"]
        CondCfg["ConditionNodeConfig"]
        FilterCfg["FilterNodeConfig"]
        TransformCfg["TransformNodeConfig"]
        OutputCfg["OutputNodeConfig"]
        SetVarCfg["SetVariableNodeConfig"]
    end
    
    subgraph Exec["🎯 ExecutionRun"]
        Success["success: boolean"]
        Logs["logs: ExecutionLog[]"]
        Error["errorMessage?: string"]
    end
    
    Pipeline --> Nodes
    Pipeline --> Edges
    Pipeline --> Vars
    Nodes --> Node
    Node --> Data
    Data --> Config
    Nodes --> Exec
```

---

## Types de nœuds avec leurs branches

```mermaid
graph TD
    subgraph Start["START"]
        S["➡️ Suivant unique"]
    end
    
    subgraph Api["API"]
        A["➡️ Suivant unique"]
    end
    
    subgraph SetVar["SET_VARIABLE"]
        SV["➡️ Suivant unique"]
    end
    
    subgraph Condition["CONDITION ✓✗"]
        CT["✓ Branche TRUE"]
        CF["✗ Branche FALSE"]
    end
    
    subgraph Filter["FILTER ✓✗"]
        FM["✓ Branche FILTERED"]
        FR["✗ Branche REJECTED"]
    end
    
    subgraph Transform["TRANSFORM"]
        T["➡️ Suivant unique"]
    end
    
    subgraph Output["OUTPUT"]
        O["🏁 Terminal"]
    end
    
    Start --> S
    Api --> A
    SetVar --> SV
    Condition --> CT
    Condition --> CF
    Filter --> FM
    Filter --> FR
    Transform --> T
    Output --> O
```

---

## Cycle de vie composant Vue

```mermaid
graph LR
    subgraph Edit["Mode Édition"]
        P["PipelineEditorPage<br/>layout 3-col"]
        NP["NodePalette<br/>drag nœuds"]
        PC["PipelineCanvas<br/>Vue Flow"]
        IP["InspectorPanel<br/>config UI"]
    end
    
    subgraph Run["Mode Exécution"]
        DR["DialogPipelineRun"]
        RC["RunConsole<br/>logs temps réel"]
        ER["ExecutionRun<br/>résultat"]
    end
    
    P --> NP
    P --> PC
    P --> IP
    IP --> PC
    P --> DR
    DR --> Run
    RC --> ER
```

---

## Flux validation données

```mermaid
graph TD
    subgraph TS["TypeScript Layer"]
        TsType["interface ApiNodeConfig"]
    end
    
    subgraph Zod["Zod Validation Layer"]
        ZodSchema["const apiConfigSchema = z.object({...})"]
        Transform["transform((data) => normalize(data))"]
    end
    
    subgraph Component["Component Layer"]
        Input["InputText v-model"]
        Error["Error display"]
    end
    
    subgraph Store["Store Layer"]
        Validate["schema.parse(config)"]
        Update["store.updateNodeConfig()"]
    end
    
    TsType --> ZodSchema
    ZodSchema --> Transform
    Transform --> Component
    Input --> Validate
    Validate -->|error| Error
    Validate -->|success| Update
```

---

## État Pinia store

```mermaid
graph TB
    Store["usePipelineEditorStore<br/>(Pinia)"]
    
    subgraph State["État Reactif"]
        CP["currentPipeline: PipelineDefinition"]
        CR["currentRun: ExecutionRun | null"]
        IR["isRunning: boolean"]
        VS["viewSettings: {...}"]
    end
    
    subgraph Computed["Computed Reactif"]
        Logs["logs() → ExecutionLog[]"]
        Status["status() → success|error|idle"]
    end
    
    subgraph Actions["Actions"]
        Nodes["addNodeByType, updateNode, removeNode"]
        Edges["addEdge, removeEdge, applyChanges"]
        Vars["addVariable, updateVariable, deleteVariable"]
        Persist["saveCurrentPipeline, loadPipeline"]
        Run["runCurrentPipeline"]
    end
    
    Store --> State
    Store --> Computed
    Store --> Actions
```

---

## Moteur d'exécution - Dispatch exécuteurs

```mermaid
graph LR
    Node["PipelineNode<br/>type: string"]
    
    Node --> Dispatch["executorByType[type]"]
    
    Dispatch -->|start| Start["executeStart()"]
    Dispatch -->|api| Api["executeApi()"]
    Dispatch -->|setVariable| SetVar["executeSetVariable()"]
    Dispatch -->|condition| Cond["executeCondition()"]
    Dispatch -->|filter| Filter["executeFilter()"]
    Dispatch -->|transform| Transform["executeTransform()"]
    Dispatch -->|output| Output["executeOutput()"]
    
    Start --> Result["ExecutionResult<br/>{success, context, nextNodeIds, logs}"]
    Api --> Result
    SetVar --> Result
    Cond --> Result
    Filter --> Result
    Transform --> Result
    Output --> Result
```

---

## Persistance localStorage

```mermaid
graph TD
    subgraph Memory["Browser localStorage"]
        Index["etl-experiment.pipelines.index.v1<br/>[{id, name, updatedAt}]"]
        Current["etl-experiment.pipelines.current.v1<br/>current_pipeline_id"]
        Entry1["etl-experiment.pipelines.entry.v1.uuid1<br/>PipelineDefinition"]
        Entry2["etl-experiment.pipelines.entry.v1.uuid2<br/>PipelineDefinition"]
    end
    
    subgraph Service["pipelineStorage Service"]
        Save["savePipeline(def)"]
        Load["loadSavedPipeline(id)"]
        List["listSavedPipelines()"]
    end
    
    subgraph Store["Pinia Store"]
        SP["saveCurrentPipeline()"]
        LP["loadPipeline(id)"]
        LSP["listSavedPipelines()"]
    end
    
    SP --> Save
    LP --> Load
    LSP --> List
    
    Save --> Index
    Save --> Entry1
    Save --> Entry2
    Load --> Entry1
    Load --> Entry2
    List --> Index
```

---

## Import dependencies map

```mermaid
graph TD
    Vue["Vue 3<br/>Composition API"]
    Pinia["Pinia"]
    PrimeVue["PrimeVue<br/>Components"]
    VueFlow["Vue Flow<br/>Canvas"]
    Zod["Zod<br/>Validation"]
    i18n["vue-i18n<br/>Translations"]
    
    Components["Components"] --> Vue
    Components --> Pinia
    Components --> PrimeVue
    Components --> VueFlow
    Components --> i18n
    
    Store["Store"] --> Pinia
    Store --> Engine
    
    Engine["Engine"] --> Zod
    Engine --> Services
    
    Services["Services"] --> Zod
```

---

## Processus intégration continue locale

```mermaid
graph LR
    Code["Code modifié"]
    
    Code -->|"npm run test"| Tests["Tests Vitest"]
    Tests -->|error| FixTest["Fix tests"]
    FixTest --> Tests
    Tests -->|pass| TypeCheck
    
    TypeCheck["Type Check<br/>vue-tsc"] -->|error| FixType["Fix types"]
    FixType --> TypeCheck
    TypeCheck -->|pass| Build["Build<br/>vite build"]
    
    Build -->|error| FixBuild["Fix issues"]
    FixBuild --> Build
    Build -->|pass| Success["✅ Ready<br/>to commit"]
```

---

## Glossaire avec emojis

| Emoji | Terme | Signification |
|-------|-------|--------------|
| 🟢 | START | Nœud démarrage pipeline |
| 🔷 | API | Nœud requête HTTP |
| 📝 | SETVAR | Nœud extraction variables |
| 🔀 | CONDITION | Nœud branchement 2 voies |
| 🔍 | FILTER | Nœud filtre array |
| 🔄 | TRANSFORM | Nœud transformation données |
| 🔴 | OUTPUT | Nœud résultat final |
| 📦 | PIPELINE | Ensemble nœuds + arêtes |
| → | EDGE | Connexion nœuds |
| ⚙️ | CONFIG | Paramètres nœud |
| 🎯 | EXECUTION | Résultat exécution |
| 📋 | LOG | Message événement exécution |

