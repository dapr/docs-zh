---
type: docs
title: "工作流协议 - 版本控制"
linkTitle: "版本控制"
weight: 600
description: "工作流构建块内部实现的底层描述。"
---

# 工作流版本控制

Dapr 工作流支持工作流定义的版本控制，允许你在现有实例继续运行其原始逻辑的同时更新工作流逻辑。

## 命名工作流版本控制

向 Dapr 引擎注册工作流时，你可以提供版本名称。这允许同一工作流的多个版本共存。

*   **默认版本**：一个工作流版本可被标记为默认版本。如果客户端仅通过名称启动工作流而不指定版本，则使用默认版本。
*   **特定版本**：客户端可以在启动新实例时请求工作流的特定版本。

### 注册 API

SDK 使用其任务注册表中的 `AddVersionedOrchestrator`（或类似）方法来注册版本化工作流。

```go
// 示例（内部注册表 API）
registry.AddVersionedOrchestrator("MyWorkflow", "v2", true, MyWorkflowV2)
registry.AddVersionedOrchestrator("MyWorkflow", "v1", false, MyWorkflowV1)
```

## 边车版本控制

Dapr 边车会跟踪实例正在运行的工作流命名版本，以及在该工作流执行过程中已应用的补丁列表。此信息存储在工作流历史记录中，位于 `OrchestratorStarted` 事件的 `version` 字段内。

```protobuf
message OrchestrationVersion {
  string name = 1;
  repeated string patches = 2;
}
```

当实例恢复时（例如，在某个活动完成后），Dapr 引擎负责处理因客户端版本不匹配而导致的停滞。它通过监控 placement 表的变化来实现这一点，这表明有新的 SDK 客户端已连接（可能代表应用程序的较新副本实例），并调度重放最后一个事件以尝试重试该操作。这一次，如果 SDK 能够成功完成任务，运行时将把工作流状态从 `Stalled` 更改回 `Running`。
