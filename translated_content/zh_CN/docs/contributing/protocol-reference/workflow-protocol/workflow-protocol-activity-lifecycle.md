---
type: docs
title: "Workflow Protocol - Activity Lifecycle"
linkTitle: "Activity Lifecycle"
weight: 400
description: "Workflow 构建块内部机制的低层级描述。"
---

# Activity 生命周期

Activity 是 Dapr Workflow 中的基本工作单元。与编排不同，Activity 不会重放，也不需要具有确定性。它们每次"调度"仅执行一次（尽管可能会发生重试）。

## 执行流程

1.  **调度**：编排通过向 Dapr 引擎发送 `ScheduleTask` 操作来请求一个 Activity。
2.  **工作项分发**：Dapr 引擎将 Activity 任务加入队列。当 Activity worker（SDK）可用时，引擎通过 `GetWorkItems` 流发送一个 `ActivityWorkItem`。
3.  **执行**：SDK 接收 `ActivityWorkItem`，其中包含：
    *   `name`：要执行的 Activity 的名称。
    *   `input`：Activity 的输入数据。
    *   `instance_id`：调度该 Activity 的工作流实例的 ID。
    *   `task_id`：此特定 Activity 执行的唯一标识符。
    *   `task_execution_id`：此特定 Activity 的特定**尝试**的唯一标识符。这对于在 Activity 逻辑中实现幂等性很有用。
    *   `completion_token`：一个不透明 token，用于将响应与此特定工作项关联。
4.  **报告**：Activity 逻辑完成后，SDK 向 Dapr 发送 `CompleteActivityTask` 请求。
    *   **成功**：SDK 在 `result` 字段中提供序列化输出。
    *   **失败**：SDK 提供 `failure_details`（错误消息、类型、堆栈跟踪）。

## Task Execution ID

`task_execution_id`（也称为 Task Execution Key）是一个唯一的、运行时生成的字符串（通常是 UUID），用于标识执行 Activity 任务的特定**尝试**。

### 对 SDK 的重要性

虽然 Workflow SDK 在工作项之间通常是无状态的，但 `task_execution_id` 为 **Activity Worker** 提供了关键的上下文：

1.  **分布式幂等性**：如果 Activity 执行副作用（例如，扣款信用卡），它应该使用 `task_execution_id` 作为幂等性键。
2.  **区分重试**：与 `task_id`（在工作流中特定步骤保持不变）不同，`task_execution_id` 在引擎每次**重试 Activity 时都会变化**（例如，由于超时或 worker 崩溃）。
3.  **Zombie 检测**：如果 Activity worker 花费时间过长，引擎使其超时并在另一个 worker 上重试，原始 worker 可能最终会完成。通过与持久存储或外部 API 核对 `task_execution_id`，worker 可以确定它是否是一个不再需要其结果的"zombie"。

### SDK 实现指南：

*   **向用户公开**：SDK 必须将 `task_execution_id` 公开给 Activity 实现逻辑（例如，通过 `ActivityContext`）。
*   **不要缓存**：SDK 不应尝试跨不同工作项缓存或重用此 ID。
*   **不透明使用**：SDK 应将该值视为不透明字符串。它由 Dapr 边车在分发 Activity 时生成，不是 SDK 需要创建或解析的东西。

## Completion Tokens

`completion_token` 是由 Dapr 运行时生成的不透明字符串，并作为 `ActivityWorkItem` 的一部分传递给 SDK。

### 目的和意图

1.  **响应关联**：边车使用 `completion_token` 将 `ActivityResponse`（来自 `CompleteActivityTask`）可靠地匹配到它分发的原始任务。
2.  **无状态跟踪**：它允许边车在接收完成时保持无状态或最小化状态查找，因为 token 包含（或指向）必要的上下文（实例 ID、任务 ID 等）。
3.  **Zombie 防止**：如果 Activity 超时并被重试，新尝试将具有不同的 `completion_token`。如果原始"zombie" worker 最终使用旧 token 响应，边车可以轻松识别并忽略延迟的响应。

### SDK 实现指南

*   **捕获**：SDK 必须从传入的 `ActivityWorkItem` 中捕获 `completion_token`。
*   **传播**：SDK 必须在通过 `CompleteActivityTask` 发送的 `ActivityResponse` 中包含完全相同的 `completion_token`。
*   **不透明性**：SDK 必须将 token 视为黑盒。它不应尝试解析、修改或构造自己的 token。
*   **存储**：在 Activity 执行期间，SDK 必须将此 token 保存在内存中（例如，在 `ActivityContext` 中）。


## Task Activity IDs

在 Dapr 运行时中（特别是使用 Actors 后端时），Activity 被表示为 actors。每个 Activity 执行都有一个唯一的 **Task Activity ID**（也称为 Activity Actor ID）。

ID 遵循特定模式：
`{workflowInstanceID}::{taskID}::{generation}`

*   **workflowInstanceID**：调度该 Activity 的工作流实例的唯一 ID。
*   **taskID**：工作流执行中任务的序列号（例如，0、1、2...）。
*   **generation**：如果工作流被重启或"继续作为新工作流"，该计数器会递增。

这个唯一的 ID 确保 Activity 执行被隔离，并且可以在重试和重启期间可靠地跟踪。

## 重试

Dapr 根据编排中定义的策略处理 Activity 重试（如果 SDK 支持在 `ScheduleTask` 操作中定义重试策略）。如果 Activity 失败并且存在重试策略，引擎将在指定的延迟后重新将 Activity 任务加入队列。

从 Activity worker 的角度来看，重试只是一个具有相同名称和输入的新 `ActivityWorkItem`，但可能具有不同的 `task_id`（或相同的，取决于后端实现）。

## 幂等性

因为 Activity 可能被执行多次（例如，如果 worker 在执行之后但在报告完成之前崩溃），所以建议 Activity 逻辑尽可能具有幂等性。

## 与工作流的比较

| 功能 | 编排 | Activity |
| :--- | :--- | :--- |
| **执行方式** | 基于重放（确定性） | 直接执行 |
| **状态** | 通过历史事件管理 | 无内部工作流状态 |
| **副作用** | 禁止（必须使用 Activity） | 允许（IO、数据库等） |
| **生命周期** | 可以长时间运行（天/月） | 通常短期 |
| **连接性** | 通过 `GetWorkItems` 连接 | 通过 `GetWorkItems` 连接 |
