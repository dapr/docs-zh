---
type: docs
title: "Dapr Messaging 配置与用法"
linkTitle: "配置与用法"
weight: 69000
description: "Dapr.Messaging（.NET）的配置、选项、生命周期管理、投递模式与高级功能"
---

本指南介绍使用 `Dapr.Messaging` SDK 时的高级配置、服务生命周期、投递模式的权衡、序列化、Native AOT 支持以及弹性模式。

本页所述 API 面向 SDK `1.19.0` 或更高版本。

## 生命周期管理与线程安全

理解消息服务的生命周期有助于获得最佳性能，并避免套接字耗尽或内存泄漏。

### 客户端生命周期（`IDaprPublishSubscribeClient`）

`IDaprPublishSubscribeClient`（及其底层实现 `DaprPublishSubscribeClient`）管理与 Dapr sidecar 通信所用的持久 TCP 与 gRPC 通道资源。

- **单例注册**：该客户端是线程安全的，设计上应在依赖注入容器中注册为 **Singleton（单例）**。
- **连接池**：在多次请求之间复用底层的 `HttpClient` 与 `GrpcChannel` 实例。
- **不要按操作创建**：避免为每次操作实例化或释放 `DaprPublishSubscribeClient`。整个应用应共用同一个客户端。

```csharp
// 注册 Dapr Messaging component 栈，包括以单例方式注册的 IDaprPublishSubscribeClient 与 DaprPublishSubscribeClient
builder.Services.AddDaprMessaging();
```

### 处理程序生命周期（`ITopicHandler<TMessage>`）

当消息投递到 `ITopicHandler<TMessage>` 时：

- **作用域执行**：由源生成器生成的分发器在每次消息投递时，都会从独立的 `IServiceScope` 中解析主题处理程序。
- **构造函数注入**：处理程序可以安全地注入瞬态或作用域依赖项（例如 Entity Framework Core 的 `DbContext` 实例、仓储或租户上下文提供程序）。
- **自动释放**：处理程序解析的所有可释放依赖项，都会在该消息处理轮次结束时自动释放。

```csharp
public sealed class OrderHandler(ApplicationDbContext dbContext, ILogger<OrderHandler> logger) 
    : ITopicHandler<Order>
{
    public async Task<TopicResponseAction> HandleAsync(Order message, TopicContext context, CancellationToken ct)
    {
        dbContext.Orders.Add(message);
        await dbContext.SaveChangesAsync(ct);
        return TopicResponseAction.Success;
    }
}
```

## 通过 `DaprMessagingOptions` 配置选项

SDK 使用标准的 `Microsoft.Extensions.Options` 模式。你可以在代码中配置 `DaprMessagingOptions`，也可以直接从 `IConfiguration` 绑定。

```csharp
builder.Services.AddDaprMessaging(options =>
{
    options.DaprGrpcEndpoint = "http://localhost:50001";
    options.DaprApiToken = "my-secret-token";
    options.StreamingReconnectDelay = TimeSpan.FromSeconds(5);
    options.JsonSerializerOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };
});
```

### 支持的配置选项

| 选项 | 默认值 | 说明 |
| --- | --- | --- |
| `DaprGrpcEndpoint` | `http://localhost:50001` | Dapr sidecar 的 gRPC 端点 URL。 |
| `DaprApiToken` | `null` | 在出站的 Dapr 请求中转发的 API 令牌，用于 sidecar 身份验证。 |
| `StreamingReconnectDelay` | `5 seconds` | 重新连接已断开的 streaming subscription 之前所等待的时间间隔。 |
| `JsonSerializerOptions` | `JsonSerializerDefaults.Web` | 消息发布客户端使用的选项。生成的订阅者分发器目前使用其生成时的默认选项。 |

### 端点与环境变量的优先级

底层构建器能够识别标准的 Dapr 端点/端口与 API 令牌环境变量。
但在 SDK `1.19.0` 中，`AddDaprMessaging` 会在创建构建器**之后**应用非空的 `DaprMessagingOptions.DaprGrpcEndpoint`。因此，即使你没有显式配置，其默认值 `http://localhost:50001` 也会覆盖由环境变量推导出的 gRPC 地址。

当 sidecar 使用其他端口时，请绑定正确的端点：

```csharp
builder.Services.AddDaprMessaging(options =>
{
    options.DaprGrpcEndpoint =
        builder.Configuration["DAPR_GRPC_ENDPOINT"] ??
        $"http://127.0.0.1:{builder.Configuration["DAPR_GRPC_PORT"] ?? "50001"}";
});
```

显式配置的 `DaprApiToken` 会覆盖构建器由环境变量推导出的令牌。不要在源代码中硬编码生产环境的令牌，应从部署的配置或机密管理机制中获取。

## 选择合适的投递模式

`Dapr.Messaging` 通过单一的 `[DaprTopic]` 特性统一了三种投递模式。请根据你的架构需求选择合适的模式：

| 维度 | 流式（`DeliveryMode.Streaming`） | 编程式（`DeliveryMode.Programmatic`） | HTTP（`DeliveryMode.Http`） |
| --- | --- | --- | --- |
| **方向** | 从应用出站（应用通过 gRPC 流连接 sidecar） | 入站到应用（sidecar 连接应用的 gRPC 服务器） | 入站到应用（sidecar 连接应用的 HTTP 端口） |
| **需要端点** | **无** | gRPC `AppCallback` 服务 | HTTP 端点（`/dapr/subscribe`） |
| **应用配置** | 仅依靠 sidecar 即可工作（无需 `app-port`） | 需要在 sidecar 上配置应用的 gRPC 端口 | 需要在 sidecar 上配置应用的 HTTP 端口 |
| **背压** | 客户端缓冲队列 | 由运行时管理的并发 | Web 服务器 / ASP.NET 管道 |
| **最适用于** | 工作进程、控制台应用、没有入站监听器的微服务 | 高吞吐量的 gRPC 服务、低延迟场景 | 传统 Web API、已有的 HTTP 路由设置 |
| **端点注册** | 无 | `app.MapDaprMessaging()` | `app.MapDaprMessaging()` |

## 高级消息模式

### Bulk Publish 与订阅

批量操作允许以批次方式发布和消费多个事件，从而减少与 sidecar 之间的网络往返次数：

#### Bulk Publish
```csharp
var orders = new List<Order>
{
    new("101", 49.99m, "user1@example.com"),
    new("102", 99.50m, "user2@example.com")
};

var response = await pubsubClient.BulkPublishEventAsync("pubsub", "orders", orders);

foreach (var failed in response.FailedEntries)
{
    logger.LogError("Failed to publish order {OrderId}: {Error}", failed.Entry.EventData.Id, failed.ErrorMessage);
}
```

#### 批量订阅
通过在 `[DaprTopic]` 特性上启用 `BulkSubscribe = true` 来配置批量消费：

```csharp
[DaprTopic("pubsub", "orders", Delivery = DeliveryMode.Http,
    BulkSubscribe = true, MaxMessagesCount = 50, MaxAwaitDurationMs = 500)]
public sealed class BulkOrderHandler : ITopicHandler<Order>
{
    public async Task<TopicResponseAction> HandleAsync(
        Order message,
        TopicContext context, 
        CancellationToken cancellationToken)
    {
        logger.LogInformation("Processing order {OrderId}", message.Id);
        // 处理运行时投递的批次中的一条消息。
        return TopicResponseAction.Success;
    }
}
```

批量投递在 Dapr 协议层面将消息成批处理，但当前 SDK 会将每个条目分别分发给处理程序。因此，处理程序应实现 `ITopicHandler<Order>`，而不是 `ITopicHandler<IReadOnlyList<Order>>`。

批量订阅需要 HTTP 或编程式推送投递，并且需要 `app.MapDaprMessaging()`。如果保留默认的流式投递模式，批量设置将被忽略。

### 死信主题

配置死信主题，用于捕获无法处理的消息或有毒消息：

```csharp
[DaprTopic("pubsub", "orders", DeadLetterTopic = "orders-poison")]
public sealed class ResilientOrderHandler : ITopicHandler<Order>
{
    public Task<TopicResponseAction> HandleAsync(Order message, TopicContext context, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(message.CustomerEmail))
        {
            // 返回 Drop 时，由于已配置 DeadLetterTopic，消息会被路由到 'orders-poison'
            return Task.FromResult(TopicResponseAction.Drop);
        }

        return Task.FromResult(TopicResponseAction.Success);
    }
}
```

### 使用 CloudEvents

你可以发布带类型的 CloudEvents，并在投递时检查暴露出来的 CloudEvent 头：

#### 发布带类型的 CloudEvents
```csharp
var cloudEvent = new CloudEvent<Order>(order)
{
    Source = new Uri("urn:service:checkout"),
    Type = "com.myapp.order.created",
    Subject = $"orders/{order.Id}",
    Time = DateTimeOffset.UtcNow
};

await pubsubClient.PublishEventAsync("pubsub", "orders", cloudEvent);
```

#### 在处理程序中消费 CloudEvent 头
```csharp
public Task<TopicResponseAction> HandleAsync(Order message, TopicContext context, CancellationToken cancellationToken)
{
    if (context.CloudEvent is not null)
    {
        var correlationId = context.CloudEvent.TraceId;
        var eventSource = context.CloudEvent.Source;
        logger.LogInformation("Processing CloudEvent {Id} from {Source}", context.CloudEvent.Id, eventSource);
    }

    return Task.FromResult(TopicResponseAction.Success);
}
```

## Native AOT 与裁剪注意事项

`Dapr.Messaging.Generators` 源生成器在构建时生成分发逻辑与订阅者注册表，从而避免在处理程序发现与注册时使用反射。生成的订阅者分发器目前使用运行时的 `System.Text.Json` 元数据反序列化消息。因此，Native AOT 与裁剪场景需要使用目标 SDK 版本进行显式验证；配置 `DaprMessagingOptions.JsonSerializerOptions` 目前并不会替换生成的订阅者反序列化器。

{{% alert title="AOT 分析器警告 DAPR1612" color="primary" %}}
如果与 `ITopicHandler<TMessage>` 一起使用的消息类型未包含在源生成器生成的 `JsonSerializerContext` 中，分析器 `DAPR1612` 会发出构建警告。该分析器警告本身并不能使生成的订阅者反序列化具备裁剪安全性。
{{% /alert %}}

## resiliency 与错误处理

### 流式模式下的背压管理

使用 `DeliveryMode.Streaming` 或动态 streaming subscription 时，SDK 会将传入的消息排入应用程序内存中的队列。`MaximumQueuedMessages` 可以为空，默认为无界队列；设置一个正数上限即可限制客户端缓冲并施加背压。

你可以在 `DaprSubscriptionOptions` 中调整队列大小与清理超时时间：

```csharp
var options = new DaprSubscriptionOptions(
    new MessageHandlingPolicy(
        TimeoutDuration: TimeSpan.FromSeconds(15), 
        DefaultResponseAction: TopicResponseAction.Retry))
{
    MaximumQueuedMessages = 1000,                    // 内存中保留的最大积压消息数
    MaximumCleanupTimeout = TimeSpan.FromSeconds(30), // 关闭时等待刷新 ACK 的最长时间
    ErrorHandler = async (exception) =>
    {
        // sidecar 流式传输或连接出现故障时调用
        logger.LogError(exception, "Streaming subscription encountered an error");
    }
};
```

### 优雅关闭

streaming subscription 会尝试在 `MaximumCleanupTimeout`（默认 30 秒）内刷新待处理的确认。这是一种有时限的尽力而为式关闭，并不提供零丢失或恰好一次的保证。当未收到确认时（包括处理已成功之后），消息可能被重复投递。因此，请让处理程序具备幂等性。

### 监控后台订阅故障

`SubscribeAsync` 返回 `IAsyncDisposable`，但其运行时句柄实现了 `IDaprSubscription`。请监控 `IDaprSubscription.Completion`，以便在启动后检测流或确认循环的故障。`ErrorHandler` 是一种通知回调，而不是恢复机制：原始故障仍会使订阅以异常方式完成。如果该回调本身也抛出异常，则完成任务会通过 `AggregateException` 同时报告这两个故障。请根据应用程序自行管理的重试策略重新创建失败的动态订阅。

生成的 streaming subscriber 会使用已配置的重连延迟。不要因为生成的宿主会自动重连，就假设任意动态订阅也会自动重连。

## 现有的 DaprClient 与 ASP.NET 集成

`DaprClient.PublishEventAsync` 和 `BulkPublishEventAsync`，以及 `Dapr.AspNetCore` 的 `[Topic]`、CloudEvents middleware 和订阅端点映射，仍然是各自独立且受支持的 API 接口。生成的 `[DaprTopic]`/`ITopicHandler<T>` 模型不要求整体迁移现有的订阅者。专用发布者使用 `PublishOptions`，较旧的客户端则使用元数据字典。迁移某个主题时，请避免注册重复的订阅。

## 后续步骤

- [操作指南：使用 IDaprPublishSubscribeClient 发布事件]({{< ref dotnet-messaging-publish-howto.md >}})
- [操作指南：编写订阅并处理主题消息]({{< ref dotnet-messaging-subscribe-howto.md >}})
- [教程：通过示例学习 Dapr.Messaging]({{< ref "tutorial/_index.md" >}})
- [Dapr pub/sub 概述]({{% ref pubsub-overview %}})
- [Dapr component 规范]({{% ref supported-pubsub %}})
