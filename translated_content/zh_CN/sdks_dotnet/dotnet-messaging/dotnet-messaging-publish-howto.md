---
type: docs
title: "How to: Publish events with the Dapr Messaging .NET SDK"
linkTitle: "发布事件"
weight: 60000
description: "了解如何使用 Dapr.Messaging 中的 IDaprPublishSubscribeClient 发布 JSON 事件、CloudEvents、原始负载和批量事件"
---

本指南演示如何使用现代的 `Dapr.Messaging` .NET SDK 将事件发布到 Dapr pub/sub topics。

## 前提条件

- 已安装 [Dapr CLI]({{< ref install-dapr-cli.md >}})
- 已初始化 [Dapr environment]({{< ref install-dapr-selfhost.md >}})
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、[.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或 [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- 已安装 `Dapr.Messaging` 包：

```xml
<ItemGroup>
  <PackageReference Include="Dapr.Messaging" Version="1.19.0" />
</ItemGroup>
```

## 在 `Program.cs` 中注册发布客户端

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年十一月结束支持。Dapr v1.20 将停止对这两个版本的支持；仅 .NET 10 和 .NET 11 将支持至 2027 年底。
{{% /alert %}}

使用依赖注入注册 Dapr Messaging 服务和 pub/sub 客户端：

```csharp
var builder = WebApplication.CreateBuilder(args);

// 注册 Dapr Messaging 服务和 pub/sub 客户端
builder.Services.AddDaprMessaging(options =>
{
    // 可选：配置 sidecar 连接端点或序列化器
    options.DaprGrpcEndpoint = "http://localhost:50001";
});

var app = builder.Build();
```

{{% alert title="单例客户端生命周期" color="primary" %}}
`IDaprPublishSubscribeClient` 是线程安全的，并以 **单例（Singleton）** 方式注册。它会维护到 Dapr sidecar 的持久 gRPC/HTTP 通道资源，应在整个应用中复用，而不是为每个操作分别实例化。
{{% /alert %}}

## 发布事件

将 `IDaprPublishSubscribeClient`（或 `DaprPublishSubscribeClient`）注入到控制器、最小 API 路由 handler 或后台服务中。

### 1. 发布标准 JSON 事件

要将序列化的对象发布到 topic，请调用 `PublishEventAsync<TData>`：

```csharp
public record Order(string Id, decimal Total, string CustomerEmail);

public sealed class OrderService(IDaprPublishSubscribeClient pubsub, ILogger<OrderService> logger)
{
    public async Task PlaceOrderAsync(Order order, CancellationToken cancellationToken = default)
    {
        logger.LogInformation("Publishing order {OrderId} to 'orders' topic", order.Id);

        // 将订单对象序列化为 JSON 后发布，Content-Type 为 application/json
        await pubsub.PublishEventAsync(
            pubsubName: "pubsub",
            topicName: "orders",
            data: order,
            cancellationToken: cancellationToken);
    }
}
```

### 2. 使用自定义 CloudEvent metadata 和 `PublishOptions` 发布

你可以使用 `PublishOptions` 附加自定义的 CloudEvent 属性（例如事件类型、主题、traceparent 或 component TTL metadata）：

```csharp
var options = new PublishOptions
{
    Id = Guid.NewGuid().ToString(),
    Type = "com.myapp.order.created",
    Subject = $"orders/{order.Id}",
    Metadata =
    {
        ["ttlInSeconds"] = "120", // Dapr 消息 TTL
        ["cloudevent.source"] = "urn:service:checkout"
    }
};

await pubsub.PublishEventAsync("pubsub", "orders", order, options, cancellationToken);
```

`PublishOptions` 还公开了 `Source`（`Uri`）、`ContentType`、`TraceParent` 和 `TraceState`。component metadata 与 CloudEvent 覆盖项是不同的概念：`ttlInSeconds` 之类的 metadata 只能用于支持它的 component。字节发布和 Bulk Publish 同样接受 `PublishOptions`。

设置内容类型并不会改变类型化对象的序列化方式。如果你已经有编码后的字节，请使用 `PublishByteEventAsync`。发布成功只表示运行时/component 已接受消息，并不代表每个订阅者都已成功处理。

### 3. 发布强类型 CloudEvents

如果你希望完全控制 CloudEvent 信封，请将负载包装在 `CloudEvent<TData>` 中：

```csharp
var cloudEvent = new CloudEvent<Order>(order)
{
    Id = Guid.NewGuid().ToString(),
    Source = new Uri("urn:service:checkout"),
    Type = "com.myapp.order.created",
    Subject = $"orders/{order.Id}",
    Time = DateTimeOffset.UtcNow,
    TraceId = Activity.Current?.TraceId.ToString()
};

// 以 Content-Type: application/cloudevents+json 发布
await pubsub.PublishEventAsync("pubsub", "orders", cloudEvent, cancellationToken);
```

### 4. 发布原始字节负载

如果你要传输二进制数据、预先序列化的负载或专有编码，请使用 `PublishByteEventAsync`：

```csharp
byte[] binaryPayload = GetCompressedPayload();

await pubsub.PublishByteEventAsync(
    pubsubName: "pubsub",
    topicName: "raw-telemetry",
    data: binaryPayload,
    dataContentType: "application/octet-stream",
    cancellationToken: cancellationToken);
```

### 5. 发布空的通知事件

要发布不含负载主体的通知事件：

```csharp
await pubsub.PublishEventAsync("pubsub", "cache-invalidated", cancellationToken);
```

## 使用 Bulk Publish 发布多个事件

Bulk Publish 允许你在单个请求中将一批事件发布到 topic，从而显著减少往返开销：

```csharp
var orders = new List<Order>
{
    new("101", 49.99m, "user1@example.com"),
    new("102", 99.50m, "user2@example.com"),
    new("103", 14.25m, "user3@example.com")
};

var response = await pubsub.BulkPublishEventAsync(
    pubsubName: "pubsub",
    topicName: "orders",
    events: orders,
    cancellationToken: cancellationToken);

if (response.FailedEntries.Count > 0)
{
    foreach (var failed in response.FailedEntries)
    {
        logger.LogError(
            "Failed to publish entry {EntryId} (Order {OrderId}): {Error}",
            failed.Entry.EntryId,
            failed.Entry.EventData.Id,
            failed.ErrorMessage);
    }
}
else
{
    logger.LogInformation("All {Count} orders published successfully", orders.Count);
}
```

## 不使用依赖注入的发布者

虽然推荐使用依赖注入，但你也可以直接使用 `DaprPublishSubscribeClientBuilder` 构造 `DaprPublishSubscribeClient` 实例：

```csharp
var client = new DaprPublishSubscribeClientBuilder()
    .UseGrpcEndpoint("http://localhost:50001")
    .UseDaprApiToken("my-token")
    .Build();

await client.PublishEventAsync("pubsub", "orders", new Order("101", 19.99m, "a@b.com"));
```

## 最佳实践

- **复用客户端**：将 `IDaprPublishSubscribeClient` 注册为单例一次即可；不要为每条消息实例化和释放客户端。
- **传递取消令牌**：始终传入 `CancellationToken`，以便优雅地处理应用取消和 HTTP 请求中止。
- **检查 Bulk Publish 响应**：当只有部分条目失败时，Bulk Publish 会返回部分成功的结果。务必检查 `response.FailedEntries`。
- **传播分布式追踪**：SDK 会自动在 CloudEvent 头中传播活动的 OpenTelemetry/W3C 追踪上下文（`Activity.Current`）。

## 后续步骤

- [教程：通过示例学习 Dapr.Messaging]({{< ref "tutorial/_index.md" >}})
- [操作指南：编写订阅并处理 topic 消息]({{< ref dotnet-messaging-subscribe-howto.md >}})
- [Dapr Messaging 配置与用法参考]({{< ref dotnet-messaging-pubsub-usage.md >}})
- [Dapr pub/sub building block 概览]({{% ref pubsub-overview %}})
