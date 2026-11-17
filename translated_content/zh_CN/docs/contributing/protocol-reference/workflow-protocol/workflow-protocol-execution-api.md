---
type: docs
title: "Workflow Protocol - Execution API"
linkTitle: "Execution API"
weight: 200
description: "Workflow building block 内部机制的低级描述。"
---

# Workflow Execution API (Task Hub Protocol)

Workflow Execution API 是一个低级 gRPC 协议，Dapr Workflow SDK 通过它充当 "Worker"。SDK 通过此协议连接 Dapr sidecar，以轮询工作项并报告完成状态。

该服务名为 `TaskHubSidecarService`。

### Service Definition (gRPC)

```protobuf
service TaskHubSidecarService {
  rpc GetWorkItems(GetWorkItemsRequest) returns (stream WorkItem);
  rpc CompleteOrchestratorTask(OrchestratorResponse) returns (CompleteBatchResponse);
  rpc CompleteActivityTask(ActivityResponse) returns (CompleteBatchResponse);
  // ... 其他管理方法
}
```

## Worker 生命周期

1.  **连接**：SDK 打开一个到 `GetWorkItems` 的长连接双向流。
2.  **轮询**：SDK 从流中接收 `WorkItem` 消息。
3.  **执行**：
    *   如果工作项是 **Orchestration**，SDK 获取并重放 history event 以确定下一步操作。
    *   如果工作项是**activity**，SDK 执行 activity 逻辑。
4.  **完成**：
    *   对于 Orchestration，SDK 调用 `CompleteOrchestratorTask` 并附带要执行的操作列表。
    *   对于 activity，SDK 调用 `CompleteActivityTask` 并附带结果或失败信息。

## gRPC Service: `TaskHubSidecarService`

### GetWorkItems

打开流以接收 orchestration 和 activity 的工作项。

**Request (`GetWorkItemsRequest`)：**
通常为空，或包含 worker metadata。

**Response (stream `WorkItem`)：**
`WorkItem` 可以是以下之一：
*   `orchestrator_item`：包含某个 orchestration 的历史和新事件。
*   `activity_item`：包含单个 activity 任务的详情。

### CompleteOrchestratorTask

报告 orchestration 执行的结果。

**Request (`OrchestratorResponse`)：**
*   `instance_id`：workflow instance 的 ID。
*   `actions`：`OrchestratorAction` 消息列表。
*   `custom_status`：可选的用户定义状态字符串。

**OrchestratorAction 类型：**
*   `ScheduleTask`：调度一个新的 activity。
*   `CreateTimer`：调度一个 durable timer。
*   `CreateSubOrchestration`：启动一个 child workflow。
*   `CompleteOrchestration`：将 workflow 标记为完成（成功或失败）。
*   `TerminateOrchestration`：强制终止实例。
*   `SendEvent`：向另一个 workflow 发送事件。

### CompleteActivityTask

报告 activity 执行的结果。

**Request (`ActivityResponse`)：**
*   `instance_id`：workflow instance 的 ID。
*   `task_id`：activity 任务的唯一 ID。
*   `completion_token`：`ActivityWorkItem` 中收到的不透明令牌。
*   `result`：activity 的序列化输出（如果成功）。
*   `failure_details`：错误详情（如果失败）。

## 数据模型

### HistoryEvent

Dapr 中的 workflow 采用事件溯源（Event Sourcing）模型。Orchestration 的状态通过重放一系列 `HistoryEvent` 消息来重建。

常见事件类型：
*   `ExecutionStarted`：初始事件，包含 workflow 名称和输入。
*   `TaskScheduled`：一个 activity 被调度。
*   `TaskCompleted`：一个 activity 成功完成。
*   `TaskFailed`：一个 activity 失败。
*   `TimerCreated`：一个 timer 被调度。
*   `TimerFired`：一个 timer 到期。
*   `OrchestrationCompleted`：workflow 完成。

#### timer 来源

`TimerCreated` 事件会记录一个 `origin`，用于标识该 timer 被调度的原因。这是引擎的内部记录信息（也会由 `dapr workflow history` 命令展示）；它不会改变开发者编写 workflow 的方式，也不会改变 timer 的行为。可能的来源如下：

*   `createTimer`：workflow 创建的显式 durable timer（例如 `ctx.create_timer(...)`）。
*   `externalEvent`：支撑带超时的"等待 external event"调用的 timer。携带事件名称。
*   `activityRetry`：支撑 activity 重试之间延迟的 timer。携带失败任务的执行 ID。
*   `childWorkflowRetry`：支撑 child workflow 重试之间延迟的 timer。携带子实例 ID。

### FailureDetails

用于报告来自 activity 或 orchestration 的错误。
*   `error_type`：标识错误类型的字符串。
*   `error_message`：人类可读的错误消息。
*   `stack_trace`：可选的堆栈跟踪。
*   `is_non_retriable`：布尔标志。

## 协议细节

*   **流式传输**：`GetWorkItems` 是服务端到客户端的流。Dapr 在工作项可用时将其推送给 SDK。
*   **粘性会话**：Dapr 会尽量将同一实例的工作项发送到同一个 worker，但 SDK 不能依赖此特性来保证正确性。
*   **确定性**：SDK **必须**确保 orchestration 逻辑是确定的。在重放期间，SDK 使用 `OrchestratorWorkItem` 中提供的历史记录，以避免重新执行已记录的操作。
