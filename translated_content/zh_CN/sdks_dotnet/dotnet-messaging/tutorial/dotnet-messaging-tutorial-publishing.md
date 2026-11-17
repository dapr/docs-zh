---
type: docs
title: "Part 1: Publish events with Dapr.Messaging"
linkTitle: "第 1 部分：发布"
weight: 160100
description: "使用 IDaprPublishSubscribeClient 发布有类型、批量、带丰富 metadata 以及原始格式的事件"
---

[发布示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging/01-Publishing)介绍了 `IDaprPublishSubscribeClient`，它是 `Dapr.Messaging` 中的发布 API。

## 注册客户端

`AddDaprMessaging()` 通过依赖注入注册客户端：

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprMessaging();
var app = builder.Build();
```

可以将 `IDaprPublishSubscribeClient` 注入到端点、服务或后台工作进程中。该客户端应当被复用，而不是为每条消息都创建一个新的。

## 发布有类型的事件

```csharp
app.MapPost("/orders", async (
    OrderPlaced order,
    IDaprPublishSubscribeClient client,
    CancellationToken cancellationToken) =>
{
    await client.PublishEventAsync(
        "pubsub",
        "orders",
        order,
        cancellationToken);

    return Results.Accepted($"/orders/{order.OrderId}");
});
```

有类型的负载会被序列化为 JSON，并以 Dapr CloudEvents 的形式发布。请将请求的取消令牌传递给 SDK 调用。

## 添加 metadata 并批量发布

使用 `PublishOptions` 设置 CloudEvent 属性以及 component metadata（例如消息 TTL）：

```csharp
var options = new PublishOptions
{
    Metadata =
    {
        ["cloudevent.type"] = "priority.order",
        ["ttlInSeconds"] = "60"
    }
};

await client.PublishEventAsync("pubsub", "orders", priorityOrder, options, cancellationToken);
```

对于批量发布，请检查响应，因为发布可能部分成功：

```csharp
var response = await client.BulkPublishEventAsync(
    "pubsub",
    "orders",
    orders,
    cancellationToken: cancellationToken);

foreach (var failed in response.FailedEntries)
{
    logger.LogError("Failed entry {EntryId}: {Error}",
        failed.Entry.EntryId, failed.ErrorMessage);
}
```

## 发布原始字节

当负载已经序列化，或使用非 JSON 格式时，请使用 `PublishByteEventAsync`：

```csharp
var payload = Encoding.UTF8.GetBytes("RAW_PAYLOAD_DATA_SAMPLE");

await client.PublishByteEventAsync(
    "pubsub",
    "raw-orders",
    payload,
    dataContentType: "text/plain",
    cancellationToken: cancellationToken);
```

## 测试发布者

单元测试使用 Moq 验证客户端接收到了预期的主题、负载、选项和内容类型。它们不会启动 Dapr。集成测试使用 `DaprHarnessBuilder.BuildPubSub()`，将真实客户端连接到测试框架（harness）的动态 gRPC 与 HTTP 端口，并针对 sidecar 和 Redis 验证有类型、批量与原始格式的发布。

在 SDK 仓库中运行该示例：

```powershell
dotnet test examples\Messaging\01-Publishing\Publishing.Example01.Tests\Publishing.Example01.Tests.csproj
```

## 下一步

- [第 2 部分：声明式 streaming subscriptions]({{< ref dotnet-messaging-tutorial-streaming.md >}})
- [发布事件操作指南]({{< ref dotnet-messaging-publish-howto.md >}})
