---
type: docs
title: "DaprWorkflowClient 生命周期管理与注册"
linkTitle: "DaprWorkflowClient 注册"
weight: 1000
description: 配置 workflow 托管、自动发现、客户端生命周期、传输限制与历史缓存
---

## 安装与注册

请使用 `Dapr.Workflow` 1.19.0 或更高的兼容版本：

```sh
dotnet add package Dapr.Workflow
```

`AddDaprWorkflow` 会将 workflow 工作进程注册为托管服务、其依赖项以及一个 `DaprWorkflowClient`。它适用于 ASP.NET Core 和 .NET Generic Host。需要启动主机才能处理工作项；仅构建服务提供程序并不会启动工作进程。

```csharp
using Dapr.Workflow;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprWorkflow();

var app = builder.Build();
await app.RunAsync();
```

请配置与 workflow 兼容的 state store，以及 [编写 workflow]({{% ref howto-author-workflow.md %}}) 中所述的 Dapr runtime 服务。若要使用 SDK 1.19 的全部功能，请使用 Dapr runtime 1.19。

### 自动发现与显式注册

内置的源生成器会在正在编译的项目中发现可访问的具体类，这些类派生自 `Workflow<TInput, TOutput>` 和 `WorkflowActivity<TInput, TOutput>`。无需提供选项委托。抽象类和开放泛型类型不会被注册。

对于自定义名称、委托实现，或源生成器未发现的类型，可以使用显式注册。显式注册优先于生成的注册：

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<OrderProcessingWorkflow>();
    options.RegisterActivity<SquareNumberActivity>();
    options.RegisterActivity<int, int>("Double", (_, input) => Task.FromResult(input * 2));
});
```

若要扫描被引用程序集中可访问的 workflow 和 activity 类型，请在宿主项目的 `.csproj` 中同时添加**属性值**与**编译器可见属性**。为减少构建开销，引用扫描默认处于禁用状态：

```xml
<PropertyGroup>
  <DaprWorkflowVersioningScanReferences>true</DaprWorkflowVersioningScanReferences>
</PropertyGroup>
<ItemGroup>
  <CompilerVisibleProperty Include="DaprWorkflowVersioningScanReferences" />
</ItemGroup>
```

自动发现不要求启用 [name-based workflow versioning]({{% ref dotnet-workflow-versioning.md %}})。请避免简单类型名称冲突，或为其注册互不相同的显式名称。

## 客户端生命周期与依赖注入

客户端默认为单例。请复用它，而不是为每次操作都创建一个客户端，并让容器负责注入实例的释放。`DaprWorkflowClient` 同时实现了 `IDisposable` 和 `IAsyncDisposable`；通过依赖注入注册的 gRPC 传输由客户端工厂管理。

带选项委托的重载接受 `lifetime` 参数，用于更改**客户端**的生命周期：

```csharp
builder.Services.AddDaprWorkflow(
    options => { },
    lifetime: ServiceLifetime.Scoped);
```

若希望每次解析时都获得新客户端，请使用 `ServiceLifetime.Transient`。这不会改变单例的运行时选项/工厂，也不会把托管的工作进程变为作用域服务。

将具体类型 `DaprWorkflowClient` 注入到 ASP.NET Core 终结点中：

```csharp
app.MapPost("/start", async (DaprWorkflowClient client, Order order) =>
{
    var instanceId = await client.ScheduleNewWorkflowAsync(
        nameof(OrderProcessingWorkflow), input: order);
    return Results.Accepted(value: new { instanceId });
});
```

在 Generic Host 应用中，从宿主的服务中解析它。对于异步作用域，请使用异步释放：

```csharp
await using var scope = host.Services.CreateAsyncScope();
var client = scope.ServiceProvider.GetRequiredService<DaprWorkflowClient>();
```

`Dapr.Workflow.Registration` 中的公共 `DaprWorkflowClientBuilder` 也可以在不托管工作进程的情况下构造管理客户端。对于自行构造的客户端，请自行释放。在本版本中，`AddDaprWorkflowClient` **不是公共注册扩展方法**；若要托管 workflow，请使用 `AddDaprWorkflow`。

## 传输配置

托管的工作进程与依赖注入客户端会通过 Dapr 配置解析其 sidecar 的 gRPC 地址，包括 `DAPR_GRPC_ENDPOINT` / `DAPR_GRPC_PORT`。当 sidecar 需要身份验证时，请配置 `DAPR_API_TOKEN`。workflow 操作使用 gRPC；更改 HTTP 超时并不等同于 workflow 执行的截止时间。

### 更改 gRPC 消息大小限制

使用 `AddDaprWorkflow` 返回的构建器：

```csharp
builder.Services.AddDaprWorkflow()
    .WithGrpcMessageSizeLimits(
        maxReceiveMessageSize: 16 * 1024 * 1024,
        maxSendMessageSize: 16 * 1024 * 1024);
```

依赖注入传输默认不设置 SDK 的发送/接收大小限制。显式设置的限制必须为正的字节数。sidecar、Scheduler 和 state store 的限制仍会分别生效。对于大负载，请优先考虑 [data references]({{% ref dotnet-workflow-data-references.md %}})，而不是提高限制。`WorkflowRuntimeOptions.UseGrpcChannelOptions` 也支持设置发送/接收限制；注册过程并不会复制该 `GrpcChannelOptions` 对象的每个属性。

## 工作进程历史缓存

工作进程默认启用有状态历史记录：sidecar 可以只发送新事件，而不是在每个轮次都发送完整历史。缓存未命中时，会通过历史 RPC 恢复；该缓存并非持久化的应用状态。

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.HistoryCacheTtl = TimeSpan.FromMinutes(30);
    options.HistoryCacheMaxInstances = 10_000;
    options.HistoryCacheMaxBytes = 256L * 1024 * 1024;
});
```

| 选项 | 默认值与行为 |
| --- | --- |
| `DisableStatefulHistory` | 默认为 `false`；设为 `true` 时将始终接收完整历史，并忽略缓存设置。 |
| `HistoryCacheTtl` | 默认为 `null`，使用一小时的滑动 TTL。显式设置的值必须为正数。 |
| `HistoryCacheMaxInstances` | 默认为 `0`，使用内置上限：每个工作项流 100,000 个实例。 |
| `HistoryCacheMaxBytes` | 默认为 `0`，表示不设字节预算；实例数量与 TTL 仍然生效。 |

容量值不能为负数。当超过容量上限时，条目按最近最少使用的顺序被逐出。该缓存不会消除 workflow 重放，也不会自动缓存已解析的二进制负载。

`WorkflowRuntimeOptions` 上的 `MaxConcurrentWorkflows` 和 `MaxConcurrentActivities` 已过时，且不再生效。请改为在 Dapr runtime 中配置派发并发。若需了解单个 workflow 内部的并发处理，请参阅 [有界并行处理]({{% ref dotnet-workflow-authoring.md %}}#fan-out-and-bounded-parallel-processing)。

## 将服务注入 activity

activity 通过依赖注入激活，每次调用 activity 时都会在一个作用域中进行。请按常规方式注册其依赖项：

```csharp
using Dapr.Workflow;
using Microsoft.Extensions.Logging;

public sealed class SquareNumberActivity(ILogger<SquareNumberActivity> logger) : WorkflowActivity<int, int>
{
    public override Task<int> RunAsync(WorkflowActivityContext context, int input)
    {
        logger.LogInformation("Squaring {Number}; task key {TaskKey}", input, context.TaskExecutionKey);
        return Task.FromResult(input * input);
    }
}
```

### activity 任务执行标识符

`WorkflowActivityContext` 公开了 `Identifier`、`InstanceId`、**`TaskExecutionKey`**（而非 `TaskExecutionId`），以及 `ScheduledEventId`，后者是该 activity 尝试对应的 `TaskScheduled` history event 的 ID。当运行时提供任务执行 ID 时，工作进程会使用它；否则回退为数字形式的任务 ID。SDK 的 activity 重试会保留任务执行 ID。在设计幂等键时，请将该键与 workflow instance 及应用标识组合使用，并使去重记录与副作用以原子方式持久化。仅凭该标识符并不能使 activity 恰好一次执行。`ScheduledEventId` 可以与实例 ID 一起记录，之后传给 `RerunWorkflowFromEventAsync`，从该 activity 处重新运行 workflow（参见 [从 history event 重新运行]({{% ref "dotnet-workflow-management-methods.md#rerun-from-a-history-event" %}})）。

### 重放安全日志

在 workflow 内部请使用 `context.CreateReplaySafeLogger<T>()`。它会在重放期间抑制日志写入。尽管当前的工厂可以通过依赖注入激活 workflow 构造函数，内置的 `DAPR1305` 分析器仍会对 workflow 构造函数注入给出警告。请把需要注入的 I/O 依赖放在 activity 中；它们并不能使非确定性操作在 workflow 重放期间变得安全。

## 后续步骤

- [在 .NET 中编写 workflow 和 activity]({{% ref dotnet-workflow-authoring.md %}})
- [workflow 管理操作]({{% ref dotnet-workflow-management-methods.md %}})
- [配置 workflow 序列化]({{% ref dotnet-workflow-serialization.md %}})
