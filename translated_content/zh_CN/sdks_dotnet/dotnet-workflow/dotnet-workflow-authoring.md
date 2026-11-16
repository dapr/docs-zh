---
type: docs
title: "在 .NET 中编写工作流和活动"
linkTitle: "编写工作流"
weight: 1200
description: "使用确定性的工作流 API、活动、重试、定时器、事件、并行与延续"
---

本指南介绍 `Dapr.Workflow` 1.19.0 的编写 API。有关运行时前提条件和底层执行模型，请参阅[编写工作流]({{% ref howto-author-workflow.md %}})。关于如何注册宿主，请参阅[客户端注册]({{% ref dotnet-workflowclient-usage.md %}})。

## 定义工作流和活动

派生自 `Workflow<TInput, TOutput>` 和 `WorkflowActivity<TInput, TOutput>`。工作流的输入、活动的输入和输出、自定义状态以及工作流的输出都会被序列化，并保存在持久化状态中。

```csharp
using Dapr.Workflow;

public sealed class GreetingWorkflow : Workflow<string, string>
{
    public override async Task<string> RunAsync(WorkflowContext context, string name)
    {
        context.SetCustomStatus(new { Stage = "Greeting" });
        var greeting = await context.CallActivityAsync<string>(nameof(GreetActivity), name);
        context.SetCustomStatus(new { Stage = "Done" });
        return greeting;
    }
}

public sealed class GreetActivity : WorkflowActivity<string, string>
{
    public override Task<string> RunAsync(WorkflowActivityContext context, string name)
        => Task.FromResult($"Hello, {name}!");
}
```

源生成器会发现这些类。你也可以显式注册类实现或委托实现。更改名称或负载契约可能会破坏重放：请保留可兼容的实现，或使用[工作流版本控制]({{% ref dotnet-workflow-versioning.md %}})。

## 保持编排的确定性

在持久化操作完成后，工作进程会根据已记录的历史重放工作流代码。在编排中只能使用持久化的工作流任务：

| 需求 | 工作流 API |
| --- | --- |
| 当前时间 | `context.CurrentUtcDateTime`，而不是 `DateTime.UtcNow` 或 `DateTime.Now`。 |
| 唯一标识符 | `context.NewGuid()`，而不是 `Guid.NewGuid()` 或随机值。 |
| 延迟 | `context.CreateTimer(...)`，而不是 `Task.Delay` 或线程休眠。 |
| I/O、远程 API、可变配置或不确定性计算 | 放入活动中，并通过 `CallActivityAsync` 调用。 |
| 日志 | 使用 `context.CreateReplaySafeLogger<T>()` 抑制重放时产生的重复日志。 |
| 客户端可见的进度 | `context.SetCustomStatus(value)` 与 `state.ReadCustomStatusAs<T>()`。 |

不要使用 `Task.Run`，不要直接执行网络或文件访问，也不要通过 `ConfigureAwait(false)` 脱离工作流的同步上下文。对于由工作流 API 创建的任务，适合使用 `Task.WhenAll` 和 `Task.WhenAny`。`context.IsReplaying` 仅用于抑制诊断输出，不应用来改变持久化操作的顺序。

活动可以执行 I/O 并使用注入的服务。活动具有**至少一次**的执行语义，因此即使未配置显式的重试策略，也应实现幂等的副作用。

## 重试活动和子工作流

通过 `WorkflowTaskOptions` 或 `ChildWorkflowTaskOptions` 附加 `WorkflowRetryPolicy`：

```csharp
var retry = new WorkflowRetryPolicy(
    maxNumberOfAttempts: 3,
    firstRetryInterval: TimeSpan.FromSeconds(2),
    backoffCoefficient: 2,
    maxRetryInterval: TimeSpan.FromSeconds(30),
    retryTimeout: TimeSpan.FromMinutes(2));

var greeting = await context.CallActivityAsync<string>(
    nameof(GreetActivity), name, new WorkflowTaskOptions(RetryPolicy: retry));
```

尝试次数包括第一次调用。重试间隔使用持久化定时器。重试超时会限制后续的重试尝试次数，但它并不是正在运行的活动的硬性取消期限。未设置策略时，SDK 不会配置任何重试链，但运行时的重新传递仍可能导致执行重复。

重试次数用尽后，活动或子工作流的失败会以 `WorkflowTaskFailedException` 的形式抛出。其 `FailureDetails` 包含 `ErrorType`、`ErrorMessage` 以及可选的 `StackTrace`；`IsCausedBy<TException>()` 可以匹配能够解析的异常类型。你可以捕获此异常以实现显式补偿，也可以让工作流失败。补偿属于应用程序代码，而不是对外部效果的自动回滚。

## 持久化定时器与外部事件

使用 `CreateTimer(TimeSpan, CancellationToken)` 或 `CreateTimer(DateTime, CancellationToken)` 实现持久化延迟。绝对截止时间应基于 `CurrentUtcDateTime` 计算。对于在与其他持久化任务的竞争中落败的定时器，应将其取消。

对于带持久化超时的事件：

```csharp
try
{
    bool approved = await context.WaitForExternalEventAsync<bool>("Approval", TimeSpan.FromHours(24));
    context.SetCustomStatus(new { Approved = approved });
}
catch (TaskCanceledException)
{
    context.SetCustomStatus(new { Stage = "Approval expired" });
}
```

带超时的重载使用持久化定时器，并取消落败的等待。在匹配的等待之前到达的事件会被缓冲；每个事件只会完成一个等待者。.NET 工作进程以不区分大小写的方式匹配事件名称，但应在所有发送方和 SDK 之间保持一致的大小写。等待上的取消令牌只会取消该等待，而不会取消工作流或事件生产者。

外部应用程序使用 `client.RaiseEventAsync` 发送事件。工作流可以在不调用客户端或直接执行 I/O 的情况下，向其所在应用中的另一个工作流实例发送事件：

```csharp
context.SendEvent(targetInstanceId, "Approval", true);
```

`SendEvent` 记录的是一个持久化操作，而不是接收方已处理该事件的确认，并且没有 `TargetAppId` 选项。不要假设向不存在或已完成的实例发送信号在应用层面上取得了成功。

## 扇出与有界并行处理

对于规模较小且有界的批次，创建活动或子工作流任务并等待 `Task.WhenAll`。若需要滑动窗口，请使用 SDK 的 `ProcessInParallelAsync`：

```csharp
string[] greetings = await context.ProcessInParallelAsync(
    names,
    name => context.CallActivityAsync<string>(nameof(GreetActivity), name),
    maxConcurrency: 3);
```

默认并发数为五，且必须为正数。结果保持输入顺序。处理完成后，失败会被收集到 `AggregateException` 中；这并不是对其他活动的快速失败取消。

这限制的是**单个工作流**中未完成任务的数量，而不是工作进程或运行时的总并发数。该辅助方法会把输入集合全部载入内存并分配结果数组，因此它并不是对无界流进行恒定内存的处理。应使用有界批次、子工作流或延续来限制历史记录的增长。

## 子工作流与分离工作流

`CallChildWorkflowAsync<T>` 会等待子工作流的输出并传递失败。使用 `ChildWorkflowTaskOptions` 可以设置 `InstanceId`、`RetryPolicy` 或 `TargetAppId`。子工作流的执行拥有自己的历史记录；递归终止父工作流也会终止其子工作流。

对于彼此独立的工作，请改用 `ScheduleNewDetachedWorkflowAsync`：

```csharp
var detachedId = await context.ScheduleNewDetachedWorkflowAsync(
    workflowName: "GreetingWorkflow",
    input: "background",
    startTime: new DateTimeOffset(context.CurrentUtcDateTime).AddMinutes(5));
```

返回的 ID 在操作被记录时即可获得，而不是在新工作流完成时。如果省略 ID，生成的 ID 具有重放安全性。分离工作流的失败不会导致发起它的工作流失败，终止该工作流也不会递归终止分离的实例。选项重载支持应用路由和负载引用权限，但会拒绝重试策略和历史传播。

有关路由，请参阅[多应用工作流]({{% ref dotnet-workflow-multi-app.md %}})；有关子工作流的历史共享，请参阅[历史传播]({{% ref dotnet-workflow-history-propagation.md %}})。

## 延续长时间运行的工作流

使用 `ContinueAsNew` 以新的输入重新启动同一个实例，并截断其累积的历史记录：

```csharp
public sealed class CounterWorkflow : Workflow<int, int>
{
    public override async Task<int> RunAsync(WorkflowContext context, int count)
    {
        await context.CreateTimer(TimeSpan.FromMinutes(1));
        context.ContinueAsNew(newInput: count + 1, preserveUnprocessedEvents: true);
        return count;
    }
}
```

请求延续后应立即返回；下一次执行将使用新的输入，而不是以返回值完成该实例。调用之后不要再调度其他工作。未完成的任务结果会被丢弃；默认情况下，已缓冲但尚未处理的外部事件会被保留。若设置 `preserveUnprocessedEvents: false`，这些事件也会被丢弃。

## 测试边界

该包包含编译器分析器：当可以从 `nameof(...)` 解析出活动或工作流类型时，`DAPR1303` 和 `DAPR1304` 会对输入/输出不匹配发出警告；`DAPR1305` 会对工作流构造函数注入发出警告。对于本地的具体类型，优先使用 `nameof`；但当路由需要时，应使用已注册的规范字符串。分析器无法验证所有动态名称或远程契约，且无警告的构建并不能证明工作流具有确定性。

活动逻辑及其注入的依赖项可以照常进行单元测试。工作流单元测试可以为抽象的 `WorkflowContext` 提供测试替身，以检查决策、已调度的调用和输出，但无法证明重放或运行时的持久性。应借助正在运行的边车和具有代表性的持久化存储，来验证重放、失败与重新传递、持久化事件超时、跨应用路由、版本升级，以及历史记录和负载的限制。

## 后续步骤

- [管理工作流实例]({{% ref dotnet-workflow-management-methods.md %}})
- [工作流版本控制]({{% ref dotnet-workflow-versioning.md %}})
- [工作流示例]({{% ref dotnet-workflow-examples.md %}})
