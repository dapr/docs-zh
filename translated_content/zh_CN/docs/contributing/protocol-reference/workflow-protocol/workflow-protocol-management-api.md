---
type: docs
title: "Workflow 协议 - 管理 API"
linkTitle: "管理 API"
weight: 100
description: "Workflow 构建块内部的底层描述。"
---

# Workflow 管理 API

Workflow 管理 API 允许 Dapr 客户端控制 workflow 实例的生命周期。这些 API 通过标准 Dapr gRPC 端点公开，通常通过 SDK 提供。

## gRPC 服务定义

管理 API 是 `dapr.proto.runtime.v1` 中 `Dapr` 服务的一部分。虽然可能存在多个版本（Alpha1、Beta1），以下描述的是当前的实现逻辑。

### StartWorkflow

启动一个新的 workflow 实例。

**请求（`StartWorkflowRequest`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | 可选。workflow 实例的唯一标识符。如果未提供，Dapr 将生成一个随机的 UUID。 |
| `workflow_component` | `string` | 要使用的 workflow 组件的名称。目前，Dapr 使用内置引擎。 |
| `workflow_name` | `string` | 要执行的 workflow 定义的名称。 |
| `options` | `map<string, string>` | 可选。组件特定选项。 |
| `input` | `bytes` | 可选。workflow 实例的输入数据，通常是 JSON 序列化字符串。 |

**响应（`StartWorkflowResponse`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | 已启动的 workflow 实例的 ID。 |

### GetWorkflow

检索 workflow 实例的当前状态和元数据。

**请求（`GetWorkflowRequest`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | 要查询的 workflow 实例的 ID。 |
| `workflow_component` | `string` | workflow 组件的名称。 |

**响应（`GetWorkflowResponse`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | workflow 实例的 ID。 |
| `workflow_name` | `string` | workflow 的名称。 |
| `created_at` | `Timestamp` | 实例创建的时间。 |
| `last_updated_at` | `Timestamp` | 实例最后更新的时间。 |
| `runtime_status` | `string` | 状态（例如 `RUNNING`、`COMPLETED`、`FAILED`、`TERMINATED`、`PENDING`）。 |
| `properties` | `map<string, string>` | 额外的组件特定元数据。 |

### TerminateWorkflow

强制终止正在运行的 workflow 实例。

**请求（`TerminateWorkflowRequest`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | 要终止的 workflow 实例的 ID。 |
| `workflow_component` | `string` | workflow 组件的名称。 |

### RaiseEventWorkflow

向正在运行的 workflow 实例发送事件。

**请求（`RaiseEventWorkflowRequest`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | workflow 实例的 ID。 |
| `workflow_component` | `string` | workflow 组件的名称。 |
| `event_name` | `string` | 要引发的事件的名称。 |
| `event_data` | `bytes` | 与事件关联的数据。 |

### PauseWorkflow & ResumeWorkflow

暂停或恢复 workflow 实例。

**请求（`PauseWorkflowRequest` / `ResumeWorkflowRequest`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | workflow 实例的 ID。 |
| `workflow_component` | `string` | workflow 组件的名称。 |

### PurgeWorkflow

移除与 workflow 实例关联的所有状态和历史记录。这通常只能对已完成、失败或已终止的实例执行。

**请求（`PurgeWorkflowRequest`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_id` | `string` | workflow 实例的 ID。 |
| `workflow_component` | `string` | workflow 组件的名称。 |

## ListInstanceIDs（仅限 Task Hub 协议）

检索 workflow 实例 ID 列表，可选择按状态或名称筛选。这目前是内部 Task Hub 协议的一部分，用于管理工具中的分页。

**请求（`ListInstanceIDsRequest`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `page_size` | `int32` | 要返回的 ID 的最大数量。 |
| `continuation_token` | `string` | 用于检索下一页结果的不透明 token。 |

**响应（`ListInstanceIDsResponse`）：**

| 字段 | 类型 | 描述 |
| :--- | :--- | :--- |
| `instance_ids` | `repeated string` | 实例 ID 列表。 |
| `continuation_token` | `string` | 用于下一页结果的 token。 |

#### 继续标记和分页

`continuation_token` 是由 Dapr 运行时（以及底层状态存储）生成的**不透明字符串**。其目的是允许客户端可靠地对大量 workflow 实例进行分页，而无需一次性将所有 ID 加载到内存中。

**SDK 对继续标记的要求：**
1. **不透明性**：SDK 必须将此 token 视为黑盒。它不应尝试解析、修改或构造自己的 token。
2. **状态管理**：当 SDK 收到 `ListInstanceIDsResponse` 时，如果打算获取更多结果，应存储 `continuation_token`。
3. **请求传播**：要获取下一页，SDK 必须将从上一个响应中收到的确切 `continuation_token` 传递到下一个 `ListInstanceIDsRequest`。
4. **终止**：响应中的空或 null `continuation_token` 表示没有更多页面可检索。

**运行时行为：**
运行时从状态存储的 `KeysLike` 操作派生此 token。由于它与底层数据库的分页机制相关联，因此该 token 可能具有过期时间或与初始请求中使用的特定查询参数（如 `page_size`）相关联。

## 实现细节

边车接收这些请求并将其转换为底层 `durabletask-go` 客户端的操作。例如，`StartWorkflow` 调用后端以创建新的业务流程实例并排队 `ExecutionStarted` 事件。
