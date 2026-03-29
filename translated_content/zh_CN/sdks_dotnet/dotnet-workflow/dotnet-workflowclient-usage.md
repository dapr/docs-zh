---
type: docs
title: "DaprWorkflowClient 生命周期管理与注册"
linkTitle: "DaprWorkflowClient 注册"
weight: 1000
description: 了解如何配置 `DaprWorkflowClient` 生命周期管理与依赖注入
---

## 生命周期管理

`DaprWorkflowClient` 掌控着用于与 Dapr 边车通信的 TCP 套接字形式持有的网络资源，以及其他用于工作流管理和操作的类型。`DaprWorkflowClient` 实现了 `IAsyncDisposable` 以支持资源的主动清理。

## 依赖注入

`AddDaprWorkflow()` 方法会将 Dapr 工作流服务注册到 ASP.NET Core 的依赖注入容器中。这个方法需要一个选项委托，用于定义你希望在应用中注册和使用的每个工作流和活动。

{{% alert title="注意" color="primary" %}} 

此方法将尝试注册 `DaprClient` 实例，但仅在该实例尚未被其他生命周期注册时才会成功。例如，若之前已通过 `AddDaprClient()` 注册为单例生命周期，则无论为工作流客户端选择何种生命周期，都将始终使用该单例。`DaprClient` 实例将用于与 Dapr 边车通信；如果尚未注册，则 `AddDaprWorkflow()` 注册时提供的生命周期将同时用于注册 `DaprWorkflowClient` 及其自身依赖项。

{{% /alert %}}

### 修改 gRPC 消息大小限制

在注册时，你还可以为工作流客户端配置 gRPC 消息大小限制。当工作流负载超出默认 gRPC 限制时，这会很有用。

```csharp
services
    .AddDaprWorkflowClient()
    .WithGrpcMessageSizeLimits( 
        maxReceiveMessageSize: 16 * 1024 * 1024, 
        maxSendMessageSize: 16 * 1024 * 1024);
```

### 单例注册

默认情况下，`AddDaprWorkflow` 方法以单例生命周期注册 `DaprWorkflowClient` 及其相关服务。这意味着这些服务只会被实例化一次。

以下示例展示了如何在典型的 `Program.cs` 文件中注册 `DaprWorkflowClient`：

```csharp
builder.Services.AddDaprWorkflow(options => {
    options.RegisterWorkflow<YourWorkflow>();
    options.RegisterActivity<YourActivity>();
});

var app = builder.Build();
await app.RunAsync();
```

### 作用域注册

虽然默认行为在你的场景中通常是可以接受的，但你可能希望覆盖指定的生命周期。这可以通过在 `AddDaprWorkflow` 中传递 `ServiceLifetime` 参数来实现。例如，你可能希望在 ASP.NET Core 处理管道中注入另一个需要 `DaprClient` 所用上下文的作用域服务，如果该服务被注册为单例，这些上下文将无法获取。

以下示例展示了如何操作：

```csharp
builder.Services.AddDaprWorkflow(options => {
    options.RegisterWorkflow<YourWorkflow>();
    options.RegisterActivity<YourActivity>();
}, ServiceLifecycle.Scoped);

var app = builder.Build();
await app.RunAsync();
```

### 瞬态注册

最后，Dapr 服务也可以注册为瞬态生命周期，这意味着每次注入时都会重新初始化。以下示例展示了如何操作：

```csharp
builder.Services.AddDaprWorkflow(options => {
    options.RegisterWorkflow<YourWorkflow>();
    options.RegisterActivity<YourActivity>();
}, ServiceLifecycle.Transient);

var app = builder.Build();
await app.RunAsync();
```

### 创建 `DaprWorkflowClient` 实例

{{< tabpane text=true >}}

{{% tab "ASP.Net Core 应用" %}}

在 ASP.Net Core 应用中，你可以通过方法注入或构造函数注入将 `DaprWorkflowClient` 注入到方法或控制器中。本示例展示了在最小 API 场景下的方法注入：

```csharp
app.MapPost("/start", async (
    [FromServices] DaprWorkflowClient daprWorkflowClient,
    Order order
    ) => {
        var instanceId = await daprWorkflowClient.ScheduleNewWorkflowAsync(
            nameof(OrderProcessingWorkflow),
            input: order);

        return Results.Accepted(instanceId);
});
```

{{% /tab %}}

{{% tab "控制台应用" %}}

要在控制台应用中创建 `DaprWorkflowClient` 实例，请从 `ServiceProvider` 中获取它：

```csharp
using var scope = host.Services.CreateAsyncScope();
var daprWorkflowClient = scope.ServiceProvider.GetRequiredService<DaprWorkflowClient>();
```

{{% /tab %}}

{{< /tabpane >}}

现在，你可以使用此客户端执行工作流管理操作，例如启动、暂停、恢复和终止工作流实例。有关这些操作的更多信息，请参阅[使用 `DaprWorkflowClient` 进行工作流管理操作]({{% ref dotnet-workflow-management-methods.md %}})。

## 将服务注入到工作流活动中

工作流活动支持开发者对现代 C# 应用程序所期望的相同依赖注入方式。假设在启动时进行了正确的注册，任何此类类型都可以注入到工作流活动的构造函数中，并在工作流执行期间供其使用。这使得通过注入 `ILogger` 轻松添加日志记录，或通过注入 `DaprClient` 或 `DaprJobsClient` 访问其他 Dapr 构建块变得简单。

```csharp
internal sealed class SquareNumberActivity : WorkflowActivity<int, int>
{
    private readonly ILogger _logger;
    
    public MyActivity(ILogger logger)
    {
        this._logger = logger;
    }
    
    public override Task<int> RunAsync(WorkflowActivityContext context, int input) 
    {
        this._logger.LogInformation("Squaring the value {number}", input);
        var result = input * input;
        this._logger.LogInformation("Got a result of {squareResult}", result);
        
        return Task.FromResult(result);
    }
}
```

### 活动任务执行标识符

从 Dapr .NET SDK v1.17.0 开始，`WorkflowActivityContext` 暴露了一个任务执行标识符，该标识符具有以下特性：

- **对每个活动任务唯一**
- **在重试期间保持稳定**

这使得它可用于幂等键、任务级状态跟踪和日志关联。

```csharp
internal sealed class IdempotentActivity : WorkflowActivity<int, int>
{
    public override Task<int> RunAsync(WorkflowActivityContext context, int input)
    {
        var executionId = context.TaskExecutionId;
        // 将 executionId 用作幂等键或任务状态键。

        return Task.FromResult(input * input);
    }
}
```

### 在工作流中使用 ILogger

由于工作流必须是确定性的，因此无法向其注入任意服务。例如，如果能够将标准 `ILogger` 注入到工作流中，并且由于错误需要重放工作流，那么从事件源日志进行的后续重放将导致日志记录额外的操作，这些操作实际上并没有发生第二次或第三次，因为它们的结果是从日志中获取的。这可能会引入大量的混淆。相反，提供了一个重放安全的记录器供在工作流内使用。它只会在工作流首次运行时记录事件，而在重放工作流时不会记录任何内容。

此记录器可以从工作流实例上可用的 `WorkflowContext` 中存在的方法获取，并且可以像使用 `ILogger` 实例一样精确使用。

在 [.NET SDK 仓库](https://github.com/dapr/dotnet-sdk/blob/master/examples/Workflow/WorkflowConsoleApp/Workflows/OrderProcessingWorkflow.cs)中可以看到演示此功能的完整示例，但下面提供了该示例的简要摘录。

```csharp
public class OrderProcessingWorkflow : Workflow<OrderPayload, OrderResult>
{
    public override async Task<OrderResult> RunAsync(WorkflowContext context, OrderPayload order)
    {
        string orderId = context.InstanceId;
        var logger = context.CreateReplaySafeLogger<OrderProcessingWorkflow>(); // 使用此方法访问记录器实例

        logger.LogInformation("Received order {orderId} for {quantity} {name} at ${totalCost}", orderId, order.Quantity, order.Name, order.TotalCost);
        
        //...
    }
}
```

## 后续步骤

- [了解更多关于 Dapr 工作流管理操作]({{% ref dotnet-workflow-management-methods.md %}})
- [.NET 中的多应用工作流]({{% ref dotnet-workflow-multi-app.md %}})
- [配置工作流序列化]({{% ref dotnet-workflow-serialization.md %}})
- [了解如何编写工作流和活动]({{% ref howto-author-workflow.md %}})
