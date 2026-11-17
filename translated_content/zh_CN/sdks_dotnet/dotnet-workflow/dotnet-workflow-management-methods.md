---
type: docs
title: "使用 DaprWorkflowClient 进行 workflow 管理操作"
linkTitle: "workflow 管理操作"
weight: 2000
description: 调度、查询、等待、发送事件、重新运行和管理 workflow instance
---

`DaprWorkflowClient` 在 SDK 1.19.0 中提供以下操作。若要使用完整功能，尤其是列出实例、查看历史记录以及从事件重新运行，请使用 Dapr 1.19 运行时。请按照[客户端注册]({{% ref dotnet-workflowclient-usage.md %}})中的说明注册或构造客户端。

## 调度新的 workflow instance

`ScheduleNewWorkflowAsync` 返回的是实例 ID，而不是 workflow 的结果。请提供已注册的 workflow 名称以及可选的输入。省略 `instanceId` 时会生成一个 GUID。指定将来的启动时间会延迟执行；启动时间为过去时间或省略时，则立即启动。

```csharp
var instanceId = await client.ScheduleNewWorkflowAsync(
    name: "OrderProcessingWorkflow",
    instanceId: null,
    input: new { Product = "Paperclips", Quantity = 1000 },
    startTime: DateTimeOffset.UtcNow.AddMinutes(5),
    cancellation: cancellationToken);
```

支持取消的重载接受 `name`、`instanceId`、`input`、`DateTimeOffset? startTime` 和 `cancellation` 参数。三参数的便捷重载以及旧版 `DateTime?` 重载不接受取消令牌。取消只会停止客户端请求，不会终止已经调度的实例。

启用[基于名称的版本控制]({{% ref dotnet-workflow-versioning.md %}})时，创建新实例应优先使用规范名称，以便目标应用选择其最新注册的版本。

## 获取 workflow instance 的状态

`GetWorkflowStateAsync` 返回一个 **`WorkflowState`** 快照：

```csharp
var state = await client.GetWorkflowStateAsync(
    instanceId, getInputsAndOutputs: true, cancellation: cancellationToken);

if (!state.Exists)
{
    throw new InvalidOperationException($"Workflow {instanceId} does not exist.");
}

var status = state.RuntimeStatus;
```

| 成员 | 含义 |
| --- | --- |
| `Exists`、`WorkflowName` | 是否找到该实例，以及其 workflow 名称。 |
| `RuntimeStatus` | 当前的 `WorkflowRuntimeStatus`，包括待处理、运行中、已挂起、终止或未知状态。 |
| `IsWorkflowRunning` | 仅当状态为 `Running` 时为 true，待处理或已挂起的实例不包括在内。 |
| `IsWorkflowCompleted` | 任何终止状态（已完成、已失败或已终止）均为 true。这并不代表执行成功。 |
| `CreatedAt`、`LastUpdatedAt` | 以 `DateTimeOffset` 形式公开的 UTC 时间戳。 |
| `FailureDetails` | 失败类型、消息，以及可用时的可选堆栈跟踪。 |
| `ReadInputAs<T>()`、`ReadOutputAs<T>()`、`ReadCustomStatusAs<T>()` | 使用已配置的 workflow 序列化器反序列化已捕获的值。 |

轮询状态时，可设置 `getInputsAndOutputs: false`，以避免获取输入和输出数据。请让 custom status 保持精简：即使此标志为 false，SDK 仍会处理运行时返回的 custom status。类型化读取器不会在之后补取缺失的数据。使用[数据引用]({{% ref dotnet-workflow-data-references.md %}})时，metadata 读取还可能下载二进制对象。

实例不存在（包括 gRPC `NotFound`）时，结果为 `Exists == false`。其他 gRPC 失败会以 `RpcException` 的形式抛出；请勿将传输层故障视为 workflow 不存在。能否获取失败详情取决于运行时响应中包含的数据。

## 等待启动或完成

`WaitForWorkflowStartAsync` 会等待，直到实例离开待处理状态。`WaitForWorkflowCompletionAsync` 会等待实例进入已完成、已失败或已终止状态。两者都返回 `WorkflowState`；若目标状态已经达到，可立即返回；若运行时报告实例不存在，则抛出 `InvalidOperationException`。

```csharp
using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
timeout.CancelAfter(TimeSpan.FromMinutes(10));

var finalState = await client.WaitForWorkflowCompletionAsync(
    instanceId, getInputsAndOutputs: true, cancellation: timeout.Token);

if (finalState.RuntimeStatus != WorkflowRuntimeStatus.Completed)
{
    throw new InvalidOperationException(
        $"Workflow ended with {finalState.RuntimeStatus}: {finalState.FailureDetails?.ErrorMessage}");
}

var result = finalState.ReadOutputAs<string>();
```

等待操作会以退避方式重试 gRPC `Unavailable` 和 `DeadlineExceeded`，直到成功或调用方取消。务必设置与应用相适应的取消时间或截止时间：永不结束的 workflow 可能永远不会完成。取消等待并不会取消 workflow 本身。

## 向正在运行的 workflow instance 发送事件

```csharp
await client.RaiseEventAsync(instanceId, "Approval", true, cancellation: cancellationToken);
```

workflow 通过 `WaitForExternalEventAsync<T>("Approval")` 接收该值。事件可以在 workflow 开始等待之前被缓冲。提交操作并不确认应用已处理该事件；对于缺失或已完成的目标，请勿依赖此调用来确认事件已被消费。

## 挂起正在运行的 workflow instance

```csharp
await client.SuspendWorkflowAsync(instanceId, reason: "Manual review", cancellation: cancellationToken);
```

挂起会暂停 workflow 的推进，直到恢复为止；它并不会取消 activity 中外部的副作用。

## 恢复已挂起的 workflow instance

```csharp
await client.ResumeWorkflowAsync(instanceId, reason: "Review complete", cancellation: cancellationToken);
```

## 终止 workflow instance

```csharp
await client.TerminateWorkflowAsync(
    instanceId, output: new { Reason = "Canceled by operator" }, cancellation: cancellationToken);
```

`output` 是一个可选的可序列化**对象**，而不仅仅是字符串。该请求会递归终止 child workflow，但不会停止正在执行的 activity，也不会终止独立的 detached workflow。请求完成并不意味着所有受影响的 workflow 都已完成状态切换；请查询或等待其最终状态。

## 清除 workflow instance

公开方法是 **`PurgeInstanceAsync`**，而不是 `PurgeWorkflowAsync`：

```csharp
bool purged = await client.PurgeInstanceAsync(instanceId, cancellation: cancellationToken);
```

只有终止状态的实例才能被清除。SDK 会请求递归删除子实例及其历史记录；布尔返回值表示运行时是否删除了任何实例。运行时错误仍会正常抛出。清除不可撤销，且不会删除二进制负载对象。请遵循[负载保留与清理指南]({{% ref dotnet-workflow-data-references.md %}}#retain-and-clean-up-payloads)。

## 分页列出实例 ID

`ListInstanceIdsAsync` 返回一个 `WorkflowInstancePage`，其中包含 `InstanceIds` 以及一个可选的 `ContinuationToken`。请将该令牌原样传回，以获取下一页：

```csharp
string? continuationToken = null;
do
{
    var page = await client.ListInstanceIdsAsync(
        continuationToken, pageSize: 100, cancellation: cancellationToken);
    foreach (var id in page.InstanceIds)
    {
        Console.WriteLine(id);
    }
    continuationToken = page.ContinuationToken;
}
while (!string.IsNullOrEmpty(continuationToken));
```

提供 `pageSize` 时，其值必须大于零。此 API 只列出 ID，而不是完整状态；它不支持按状态、日期或名称过滤。请根据需要单独获取各实例的状态，并在大规模列出时限制请求并发数。

## 查看执行历史

```csharp
var events = await client.GetInstanceHistoryAsync(instanceId, cancellation: cancellationToken);
foreach (var historyEvent in events)
{
    Console.WriteLine($"{historyEvent.EventId}: {historyEvent.EventType} at {historyEvent.Timestamp:O}");
}
```

返回的 `IReadOnlyList<WorkflowHistoryEvent>` 包含事件 ID、事件类型和时间戳。它**不会**公开原始的序列化输入和输出，也不会暴露完整的 protobuf 历史记录。事件类型可区分 activity 的调度、完成或失败、child workflow、timer、事件、挂起与恢复、延续，以及 detached workflow 的创建。

## 从 history event 重新运行

`RerunWorkflowFromEventAsync` 会根据源历史记录和事件 ID 创建一个**新的** workflow instance。它不会重置源实例。请从历史记录中选择运行时支持的重新运行点；事件 ID 不是列表索引，并非每个事件都是有效的重新运行边界。

```csharp
using Dapr.Workflow.Client;

// 选择一个重新运行点：源历史记录中第一个已调度的 activity。
var history = await client.GetInstanceHistoryAsync(instanceId, cancellationToken);
var scheduledEvent = history.First(e => e.EventType == WorkflowHistoryEventType.TaskScheduled);

var rerunId = await client.RerunWorkflowFromEventAsync(
    sourceInstanceId: instanceId,
    eventId: (uint)scheduledEvent.EventId,
    options: new RerunWorkflowFromEventOptions
    {
        NewInstanceId = null,
        OverwriteInput = true,
        Input = new { Quantity = 3 }
    },
    cancellation: cancellationToken);
```

`eventId` 参数为 `uint` 类型，而 `WorkflowHistoryEvent.EventId` 为 `int` 类型，因此从历史记录中传入 ID 时需要进行强制转换。activity 也可以通过 `WorkflowActivityContext.ScheduledEventId` 记录自身的重新运行点。省略 options 时，将保留记录的输入，并由运行时分配 ID。`NewInstanceId` 可选地指定新 ID。提供 `Input` 时请设置 `OverwriteInput = true`；否则非空输入会被拒绝。该覆盖会应用于重新运行点处的下一个 activity 事件，而并非对之前所有历史记录的全面替换。

请保留 workflow 和 activity 的实现，以及复制历史记录所需的任何已引用负载对象。重新运行不等于补偿：此前的外部副作用依然存在，而重新执行的工作仍要求 activity 是幂等的。

## 后续步骤

- [使用 .NET 编写 workflow 和 activity]({{% ref dotnet-workflow-authoring.md %}})
- [workflow versioning]({{% ref dotnet-workflow-versioning.md %}})
- [试用 Dapr Workflow Quickstart]({{% ref workflow-quickstart.md %}})
