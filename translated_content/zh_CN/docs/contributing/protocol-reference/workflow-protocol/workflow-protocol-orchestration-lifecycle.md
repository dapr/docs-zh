---
type: docs
title: "Workflow Protocol - Orchestration Lifecycle"
linkTitle: "Orchestration Lifecycle"
weight: 300
description: "Workflow building block 内部机制的底层描述。"
---

# 编排生命周期

本文档从协议层面描述编排的生命周期，具体说明 Dapr 引擎与 SDK 如何交互，以可靠地执行 workflow 逻辑。

## 基于重放的执行

Dapr Workflow 使用 **事件溯源** 和 **重放** 来维护状态。Dapr 不保存整个工作进程的状态（栈、变量等），而是保存已发生事件的历史记录。

### 重放循环

1.  **工作项到达**：Dapr 引擎通过 `GetWorkItems` 流向 SDK 发送一个 `OrchestratorWorkItem`。该工作项包含 workflow instance 的完整历史记录，以及任何新事件（例如，activity 完成或 external event）。对于声明了 `WORKER_CAPABILITY_STATEFUL_HISTORY` 能力的工作进程，一旦工作进程为该实例的缓存已经就绪，sidecar 只会发送自该工作进程上一轮次以来新增的事件，其余部分由工作进程从自己的缓存中补齐。
2.  **重建**：SDK 从头开始执行编排函数。
3.  **确定性执行**：函数执行过程中会遇到“任务”（例如，调用 activity、休眠）。
    *   对于每个任务，SDK 会检查提供的 **History**，查看该任务是否已经完成。
    *   如果任务在历史记录中，SDK 会立即返回记录的结果，而无需真正重新执行任务逻辑。
    *   如果任务不在历史记录中，SDK 会记录该任务需要被调度，并**暂停**编排函数的执行（通常通过抛出特殊异常或返回待处理的 promise）。
4.  **报告**：编排函数暂停或完成后，SDK 会向 Dapr 发送 `CompleteOrchestratorTask` 请求。该请求包含一组引擎应执行的 **Actions**（例如，`ScheduleTask`、`CreateTimer`）。
5.  **状态提交**：Dapr 引擎接收这些操作，在 state store 中更新 workflow 历史记录，并调度所有请求的任务（例如，向 activity 工作进程发送工作）。

## 分步示例

假设有一个 workflow：`Activity A -> Activity B`。

### 1. workflow 启动
*   **引擎**：将 `ExecutionStarted` 事件加入队列。
*   **SDK**：接收包含 `[ExecutionStarted]` 的 `OrchestratorWorkItem`。
*   **SDK**：运行函数，函数调用 `Activity A`。
*   **SDK**：检查历史记录，`Activity A` 不在其中。
*   **SDK**：暂停，发送包含 `[ScheduleTask(Activity A)]` 的 `CompleteOrchestratorTask`。
*   **引擎**：在历史记录中记录 `TaskScheduled(Activity A)`。

### 2. Activity A 完成
*   **引擎**：在历史记录中记录 `TaskCompleted(Activity A, result="foo")`。
*   **SDK**：接收包含 `[ExecutionStarted, TaskScheduled(A), TaskCompleted(A)]` 的 `OrchestratorWorkItem`。
*   **SDK**：从头开始运行函数。
*   **SDK**：函数调用 `Activity A`。SDK 在历史记录中找到 `TaskCompleted(A)`，返回 `"foo"`。
*   **SDK**：函数调用 `Activity B`。
*   **SDK**：检查历史记录，`Activity B` 不在其中。
*   **SDK**：暂停，发送包含 `[ScheduleTask(Activity B)]` 的 `CompleteOrchestratorTask`。
*   **引擎**：记录 `TaskScheduled(Activity B)`。

### 3. workflow 完成
*   **Activity B** 完成。
*   **SDK**：接收包含 A 和 B 都已完成的历史记录。
*   **SDK**：运行函数。A 和 B 都从历史记录中返回结果。
*   **SDK**：函数执行完毕，返回最终结果。
*   **SDK**：发送包含 `[CompleteOrchestration(result="final")]` 的 `CompleteOrchestratorTask`。
*   **引擎**：记录 `OrchestrationCompleted`，并将实例标记为 `COMPLETED`。

## SDK 作者的关键要求

### 1. 确定性
编排函数必须是确定性的，不能使用：
*   随机数。
*   当前日期/时间（必须使用 durable timer 或提供的 `CurrentUtcDateTime`）。
*   直接 IO（必须在 activity 中完成）。
*   在重放之间可能发生变化的全局状态。

### 2. 修补（运行中更新）

当 workflow 已经在运行时，你可能需要更新其逻辑。然而，由于 workflow 基于重放，直接修改逻辑会破坏进行中实例的确定性。

Dapr 提供了 **修补** 机制（例如 `ctx.IsPatched("patch-id")`），用于安全地引入变更：

*   **逻辑分支**：SDK 提供一个 API，用于检查某个特定的“补丁”对当前实例是否处于激活状态。
*   **补丁记录**：执行过程中遇到补丁检查时，其结果（true/false）会被记录到 workflow 历史记录中。
*   **一致性**：补丁一旦被记录为对实例激活（或未激活），它在该实例的整个生命周期内都保持不变，即使工作进程的代码发生变化，或实例被迁移到另一个工作进程。
*   **安全性**：Dapr 引擎会校验重放时遇到的补丁序列与历史记录中的序列是否完全一致。如果不一致，workflow 将进入 **停滞状态**，以防止数据损坏。

### 3. 命名版本（运行中更新）
Dapr 还提供了 **命名版本控制** 机制：SDK 维护一个可用的命名 workflow 版本注册表。当它收到按名称初始化新 workflow 的请求时，会查询该注册表，以判断该名称是否匹配到与所指定 workflow 名称不同的 workflow 版本，并负责将请求重定向到预期的“最新”版本。

*   **逻辑分支**：SDK 提供一个 API，用于为给定的 workflow 名称注册不同的版本。
*   **重放一致性**：运行 workflow 的请求可以包含一个属性，用于指定要执行的具体 workflow 名称。这样可以确保进行中的 workflow 始终使用相同的 workflow 版本运行，而新的 workflow 将使用最新的可用版本。

### 3. 停滞状态

当引擎检测到需要人工干预或代码修复才能继续的不可恢复条件时，workflow instance 进入 `STALLED` 状态。常见原因包括：

*   **补丁不匹配**：当前代码的修补逻辑与实例的历史记录相矛盾。
*   **执行错误**：发生了无法通过重试处理的致命错误。

处于停滞状态时，实例停止执行，但仍保留在系统中。一旦根本问题得到解决（例如，部署了正确的代码版本），实例即可恢复，或在下一个事件到达时自动恢复。

### 4. 历史管理
SDK 必须高效地搜索历史记录。通常的做法是在执行过程中维护一个已遇到任务的计数器，并将其与历史记录中的事件序列进行匹配。

### 5. 优雅暂停
SDK 需要一种机制，在任务已被调度但尚未完成时停止编排函数的执行，同时保留稍后重新启动它的能力。
