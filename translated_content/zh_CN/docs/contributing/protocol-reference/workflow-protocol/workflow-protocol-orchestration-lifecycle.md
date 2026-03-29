---
type: docs
title: "Workflow Protocol - Orchestration Lifecycle"
linkTitle: "Orchestration Lifecycle"
weight: 300
description: "Workflow 构建块内部机制的底层描述。"
---

# 编排生命周期

本文档从协议层面描述编排的生命周期，特别是 Dapr 引擎与 SDK 如何交互以可靠地执行工作流逻辑。

## 基于重放的执行

Dapr Workflow 使用 **事件溯源** 和 **重放** 来维护状态。Dapr 不是保存整个 worker 进程的状态（栈、变量等），而是保存已发生事件的历史记录。

### 重放循环

1.  **工作项到达**：Dapr 引擎通过 `GetWorkItems` 流向 SDK 发送一个 `OrchestratorWorkItem`。该工作项包含工作流实例的完整历史记录以及任何新事件（例如，activity 完成或外部事件）。
2.  **重建**：SDK 从头开始执行编排函数。
3.  **确定性执行**：随着函数的执行，它会遇到"任务"（例如，调用 activity、休眠）。
    *   对于每个任务，SDK 会检查提供的 **History** 以查看该任务是否已完成。
    *   如果任务在历史记录中，SDK 会立即返回记录的结果，而无需实际重新执行任务逻辑。
    *   如果任务不在历史记录中，SDK 会记录该任务需要被调度并**暂停**编排函数的执行（通常通过抛出特殊异常或返回待处理的 promise）。
4.  **报告**：一旦编排函数被暂停或完成，SDK 会向 Dapr 发送 `CompleteOrchestratorTask` 请求。该请求包含引擎应执行的一系列 **Actions**（例如 `ScheduleTask`、`CreateTimer`）。
5.  **状态提交**：Dapr 引擎接收这些操作，在状态存储中更新工作流历史记录，并调度任何请求的任务（例如，通过向 activity worker 发送工作）。

## 分步示例

假设一个工作流：`Activity A -> Activity B`。

### 1. 工作流启动
*   **引擎**：将 `ExecutionStarted` 事件加入队列。
*   **SDK**：接收包含 `[ExecutionStarted]` 的 `OrchestratorWorkItem`。
*   **SDK**：运行函数。函数调用 `Activity A`。
*   **SDK**：检查历史记录。`Activity A` 不在其中。
*   **SDK**：暂停。发送包含 `[ScheduleTask(Activity A)]` 的 `CompleteOrchestratorTask`。
*   **引擎**：在历史记录中记录 `TaskScheduled(Activity A)`。

### 2. Activity A 完成
*   **引擎**：在历史记录中记录 `TaskCompleted(Activity A, result="foo")`。
*   **SDK**：接收包含 `[ExecutionStarted, TaskScheduled(A), TaskCompleted(A)]` 的 `OrchestratorWorkItem`。
*   **SDK**：从头开始运行函数。
*   **SDK**：函数调用 `Activity A`。SDK 在历史记录中找到 `TaskCompleted(A)`。返回 `"foo"`。
*   **SDK**：函数调用 `Activity B`。
*   **SDK**：检查历史记录。`Activity B` 不在其中。
*   **SDK**：暂停。发送包含 `[ScheduleTask(Activity B)]` 的 `CompleteOrchestratorTask`。
*   **引擎**：记录 `TaskScheduled(Activity B)`。

### 3. 工作流完成
*   **Activity B** 完成。
*   **SDK**：接收包含 A 和 B 都已完成的历史记录。
*   **SDK**：运行函数。A 和 B 都从历史记录返回结果。
*   **SDK**：函数完成并返回最终结果。
*   **SDK**：发送包含 `[CompleteOrchestration(result="final")]` 的 `CompleteOrchestratorTask`。
*   **引擎**：记录 `OrchestrationCompleted` 并将实例标记为 `COMPLETED`。

## SDK 作者的关键要求

### 1. 确定性
编排函数必须是确定性的。它不能使用：
*   随机数。
*   当前日期/时间（必须使用持久化计时器或提供的 `CurrentUtcDateTime`）。
*   直接 IO（必须在 activity 中完成）。
*   在重放之间可能更改的全局状态。

### 2. 修补（运行中更新）

当工作流已经在运行时，您可能需要更新其逻辑。然而，由于工作流是基于重放的，直接更改逻辑会破坏进行中实例的确定性。

Dapr 提供了 **Patching** 机制（例如 `ctx.IsPatched("patch-id")`）来安全地引入更改：

*   **逻辑分支**：SDK 提供一个 API 来检查特定"补丁"是否对当前实例处于活动状态。
*   **补丁记录**：当执行过程中遇到补丁检查时，结果（true/false）会被记录在工作流历史中。
*   **一致性**：一旦补丁被记录为对实例活动（或非活动），它将在该实例的生命周期内保持如此，即使 worker 代码更改或实例被移动到另一个 worker。
*   **安全性**：Dapr 引擎验证重放期间遇到的补丁序列是否与历史中的序列完全匹配。如果不匹配，工作流将进入 **Stalled** 状态以防止数据损坏。

### 3. 命名版本（运行中更新）
Dapr 还提供了 **命名版本控制** 机制，其中 SDK 维护可用命名工作流版本的注册表。当它收到通过名称初始化新工作流的请求时，它将查询注册表以确定该名称是否匹配与指定工作流名称不同的工作流版本，并负责将请求重定向到预期的"最新"版本。

* **逻辑分支**：SDK 提供一个 API 来为给定的工作流名称注册不同的版本。
* **重放一致性**：运行工作流的请求可能包含一个属性，指定要执行的特定工作流名称。这确保进行中的工作流将始终使用相同的工作流版本运行，而新工作流将使用最新的可用版本。

### 3. 停滞状态

当引擎检测到需要手动干预或代码修复才能继续的不可恢复条件时，工作流实例进入 `STALLED` 状态。常见原因包括：

*   **补丁不匹配**：当前代码的补丁逻辑与实例的历史记录相矛盾。
*   **执行错误**：发生了无法通过重试处理的致命错误。

当停滞时，实例停止执行但保留在系统中。一旦根本问题得到解决（例如，部署了正确的代码版本），实例就可以恢复或将在下一个事件时自动恢复。

### 4. 历史管理
SDK 必须高效地搜索历史记录。通常，这是通过维护执行期间遇到的任务计数器并将它们与历史中的事件序列进行匹配来完成的。

### 5. 优雅暂停
SDK 需要一种机制，在任务已调度但尚未完成时停止编排函数的执行，同时不丢失稍后重新启动它的能力。
