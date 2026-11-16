---
type: docs
title: "Workflow Protocol - Execution API"
linkTitle: "Execution API"
weight: 200
description: "Workflow 构建块内部机制的低级描述。"
---

# Workflow Execution API (Task Hub Protocol)

Workflow Execution API 是一个低级 gRPC 协议，Dapr Workflow SDK 通过它充当 "Worker"。SDK 通过此协议连接 Dapr 边车，以轮询工作项并报告完成状态。

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
    *   如果工作项是 **Orchestration**，SDK 获取并重放历史事件以确定下一步操作。
    *   如果工作项是**活动**，SDK 执行活动逻辑。
4.  **完成**：
    *   对于 Orchestration，SDK 调用 `CompleteOrchestratorTask` 并附带要执行的操作列表。
    *   对于活动，SDK 调用 `CompleteActivityTask` 并附带结果或失败信息。

## gRPC Service: `TaskHubSidecarService`

### GetWorkItems

打开流以接收 orchestration 和活动的工作项。

**Request (`GetWorkItemsRequest`)：**
通常为空，或包含 worker 元数据。

**Response (stream `WorkItem`)：**
`WorkItem` 可以是以下之一：
*   `orchestrator_item`：包含某个 orchestration 的历史和新事件。
*   `activity_item`：包含单个活动任务的详情。

### CompleteOrchestratorTask

报告 orchestration 执行的结果。

**Request (`OrchestratorResponse`)：**
*   `instance_id`：工作流实例的 ID。
*   `actions`：`OrchestratorAction` 消息列表。
*   `custom_status`：可选的用户定义状态字符串。

**OrchestratorAction 类型：**
*   `ScheduleTask`：调度一个新的活动。
*   `CreateTimer`：调度一个持久化定时器。
*   `CreateSubOrchestration`：启动一个子工作流。
*   `CompleteOrchestration`：将工作流标记为完成（成功或失败）。
*   `TerminateOrchestration`：强制终止实例。
*   `SendEvent`：向另一个工作流发送事件。

### CompleteActivityTask

报告活动执行的结果。

**Request (`ActivityResponse`)：**
*   `instance_id`：工作流实例的 ID。
*   `task_id`：活动任务的唯一 ID。
*   `completion_token`：`ActivityWorkItem` 中收到的不透明令牌。
*   `result`：活动的序列化输出（如果成功）。
*   `failure_details`：错误详情（如果失败）。

## 数据模型

### HistoryEvent

Dapr 中的工作流采用事件溯源（Event Sourcing）模型。Orchestration 的状态通过重放一系列 `HistoryEvent` 消息来重建。

常见事件类型：
*   `ExecutionStarted`：初始事件，包含工作流名称和输入。
*   `TaskScheduled`：一个活动被调度。
*   `TaskCompleted`：一个活动成功完成。
*   `TaskFailed`：一个活动失败。
*   `TimerCreated`：一个定时器被调度。
*   `TimerFired`：一个定时器到期。
*   `OrchestrationCompleted`：工作流完成。

#### 定时器来源

`TimerCreated` 事件会记录一个 `origin`，用于标识该定时器被调度的原因。这是引擎的内部记录信息（也会由 `dapr workflow history` 命令展示）；它不会改变开发者编写工作流的方式，也不会改变定时器的行为。可能的来源如下：

*   `createTimer`：工作流创建的显式持久化定时器（例如 `ctx.create_timer(...)`）。
*   `externalEvent`：支撑带超时的"等待外部事件"调用的定时器。携带事件名称。
*   `activityRetry`：支撑活动重试之间延迟的定时器。携带失败任务的执行 ID。
*   `childWorkflowRetry`：支撑子工作流重试之间延迟的定时器。携带子实例 ID。

### FailureDetails

用于报告来自活动或 orchestration 的错误。
*   `error_type`：标识错误类型的字符串。
*   `error_message`：人类可读的错误消息。
*   `stack_trace`：可选的堆栈跟踪。
*   `is_non_retriable`：布尔标志。

## 协议细节

*   **流式传输**：`GetWorkItems` 是服务端到客户端的流。Dapr 在工作项可用时将其推送给 SDK。
*   **粘性会话**：Dapr 会尽量将同一实例的工作项发送到同一个 worker，但 SDK 不能依赖此特性来保证正确性。
*   **确定性**：SDK **必须**确保 orchestration 逻辑是确定的。在重放期间，SDK 使用 `OrchestratorWorkItem` 中提供的历史记录，以避免重新执行已记录的操作。
