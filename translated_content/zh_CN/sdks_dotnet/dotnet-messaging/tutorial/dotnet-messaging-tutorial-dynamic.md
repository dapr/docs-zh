---
type: docs
title: "第 7 部分：动态流式订阅"
linkTitle: "第 7 部分：动态流式"
weight: 160700
description: "为运行时选定的主题打开命令式流式订阅"
---

当主题或订阅的生命周期无法在编译期确定时，可以使用 `SubscribeAsync`。[动态流式示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging/07-DynamicStreaming)展示了这一用法。

## 注册客户端与工作进程

```csharp
builder.Services.AddDaprPubSubClient();
builder.Services.AddHostedService<DynamicSubscriberWorker>();
```

工作进程会为一个运行时选定的主题打开订阅：

```csharp
var options = new DaprSubscriptionOptions(
    new MessageHandlingPolicy(
        TimeoutDuration: TimeSpan.FromSeconds(10),
        DefaultResponseAction: TopicResponseAction.Retry))
{
    DeadLetterTopic = "tenant-events-dlq",
    ErrorHandler = exception =>
    {
        logger.LogWarning("Subscription error: {Message}", exception.Message);
        return Task.CompletedTask;
    }
};

await using var subscription = await client.SubscribeAsync(
    "pubsub",
    "tenant-events",
    options,
    HandleDynamicMessageAsync,
    stoppingToken);

await ((IDaprSubscription)subscription).Completion.WaitAsync(stoppingToken);
```

`SubscribeAsync` 返回一个可异步释放的订阅对象，以及一个 `IDaprSubscription.Completion` 任务。监督者可以等待该任务完成、记录错误、稍作延迟，然后打开新的订阅。务必释放订阅，并遵守宿主的取消令牌。

## 安全地处理无类型消息

动态订阅接收的是 `TopicMessage`，因此处理程序需要负责解码并校验负载：

```csharp
try
{
    var tenantEvent = JsonSerializer.Deserialize<TenantEvent>(message.Data.Span);
    if (tenantEvent is null || string.IsNullOrWhiteSpace(tenantEvent.TenantId))
    {
        return Task.FromResult(TopicResponseAction.Drop);
    }

    return Task.FromResult(
        tenantEvent.EventType.StartsWith("RETRY-", StringComparison.OrdinalIgnoreCase)
            ? TopicResponseAction.Retry
            : TopicResponseAction.Success);
}
catch (JsonException)
{
    return Task.FromResult(TopicResponseAction.Drop);
}
```

格式错误的 JSON 属于永久性的输入问题，应当丢弃；临时性的处理错误则应请求重试。

## 测试监督者与处理程序

单元测试会创建 `TopicMessage` 实例，其负载分别为序列化后的有效数据、需要重试的数据、无效数据和格式错误的数据，并断言对应的响应动作。集成测试使用 `DaprTestApplicationBuilder` 注册工作进程，发布真实的租户事件，并等待并发日志接收器中的处理结果与丢弃结果。这种模式无需依赖任意的固定等待时长，即可测试异步的后台工作。

```powershell
dotnet test examples\Messaging\07-DynamicStreaming\DynamicStreaming.Example07.Tests\DynamicStreaming.Example07.Tests.csproj
```

## 下一步

- [Dapr 消息传递概览]({{< ref _index.md >}})
- [订阅主题操作指南]({{< ref dotnet-messaging-subscribe-howto.md >}})
