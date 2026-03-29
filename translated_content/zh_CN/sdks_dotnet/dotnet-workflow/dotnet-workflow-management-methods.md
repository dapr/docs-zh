---
type: docs
title: "使用 DaprWorkflowClient 进行工作流管理操作"
linkTitle: "工作流管理操作"
weight: 2000
description: 了解如何使用 `DaprWorkflowClient` 管理工作流
---

## 使用 `DaprWorkflowClient` 进行工作流管理操作

`DaprWorkflowClient` 类提供了管理工作流实例的方法。以下是你可以使用 `DaprWorkflowClient` 执行的操作。

### 调度新的工作流实例

要启动新的工作流实例，请使用 `ScheduleNewWorkflowAsync` 方法。此方法需要工作流类型名称和工作流所需的输入参数。工作流的 `instanceId` 是一个可选参数；如果未提供，`DaprWorkflowClient` 会生成一个新的 GUID。最后一个可选参数是 `DateTimeOffset` 类型的 `startTime`，可用于定义工作流实例应该何时开始。该方法返回已调度工作流的 `instanceId`，用于其他工作流管理操作。

```csharp
var instanceId = $"order-workflow-{Guid.NewGuid().ToString()[..8]}";
var input = new Order("Paperclips", 1000, 9.95);
await daprWorkflowClient.ScheduleNewWorkflowAsync(
  nameof(OrderProcessingWorkflow),
  instanceId,
  input);
```

### 获取工作流实例的状态

要获取工作流实例的当前状态，请使用 `GetWorkflowStateAsync` 方法。此方法需要工作流的实例 ID，并返回一个包含工作流当前状态详细信息的 `WorkflowStatus` 对象。

```csharp
var workflowStatus = await daprWorkflowClient.GetWorkflowStateAsync(instanceId);
```

### 向正在运行的工作流实例发送事件

要向正在等待外部事件的运行中工作流实例发送事件，请使用 `RaiseEventAsync` 方法。此方法需要工作流的实例 ID、事件名称，以及可选的事件负载。

```csharp
await daprWorkflowClient.RaiseEventAsync(instanceId, "Approval", true);
```

### 暂停正在运行的工作流实例

可以使用 `SuspendWorkflowAsync` 方法暂停正在运行的工作流实例。此方法需要工作流的实例 ID。你可以选择性地提供暂停工作流的原因。

```csharp
await daprWorkflowClient.SuspendWorkflowAsync(instanceId);
```

### 恢复已暂停的工作流实例

可以使用 `ResumeWorkflowAsync` 方法恢复已暂停的工作流实例。此方法需要工作流的实例 ID。你可以选择性地提供恢复工作流的原因。

```csharp
await daprWorkflowClient.ResumeWorkflowAsync(instanceId);
```

### 终止工作流实例

要终止工作流实例，请使用 `TerminateWorkflowAsync` 方法。此方法需要工作流的实例 ID。你可以选择性地提供一个 `string` 类型的 `output` 参数。终止工作流实例也会终止所有子工作流实例，但对正在执行的活动没有影响。

```csharp
await daprWorkflowClient.TerminateWorkflowAsync(instanceId);
```

### 清除工作流实例

要从 Dapr Workflow 状态存储中删除工作流实例历史记录，请使用 `PurgeWorkflowAsync` 方法。此方法需要工作流的实例 ID。只有已完成、失败或已终止的工作流实例才能被清除。

```csharp
await daprWorkflowClient.PurgeWorkflowAsync(instanceId);
```

## 后续步骤

- [了解如何编写工作流和活动]({{% ref howto-author-workflow.md %}}) 
- [试用 Dapr Workflow 快速入门]({{% ref workflow-quickstart.md %}})
