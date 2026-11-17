---
type: docs
title: "第 4 部分：批量订阅"
linkTitle: "第 4 部分：批量订阅"
weight: 160400
description: "为高吞吐量的 pub/sub 消费者配置有界的批量投递"
---

[批量订阅示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging/04-BulkSubscribe)将批量发布与为高吞吐量摄取而配置的订阅结合在一起。

## 配置批处理

在主题特性上设置 `BulkSubscribe` 及其限制：

```csharp
[DaprTopic(
    "pubsub",
    "telemetry",
    BulkSubscribe = true,
    MaxMessagesCount = 50,
    MaxAwaitDurationMs = 500)]
public sealed class TelemetryBulkHandler : ITopicHandler<DeviceTelemetry>
{
    public Task<TopicResponseAction> HandleAsync(
        DeviceTelemetry reading,
        TopicContext context,
        CancellationToken cancellationToken)
    {
        if (reading.TemperatureCelsius < -273.15 ||
            reading.HumidityPercent is < 0 or > 100)
        {
            return Task.FromResult(TopicResponseAction.Drop);
        }

        return Task.FromResult(TopicResponseAction.Success);
    }
}
```

`MaxMessagesCount` 限制批次的大小，`MaxAwaitDurationMs` 限制 Dapr 在投递不完整批次之前的等待时长。应根据吞吐量、延迟和 broker 的行为选择取值。处理程序仍负责对每条单独的消息做出决定。

## 发布单个事件或批量事件

```csharp
await client.PublishEventAsync("pubsub", "telemetry", reading, cancellationToken);

var response = await client.BulkPublishEventAsync(
    "pubsub",
    "telemetry",
    readings,
    options: null,
    cancellationToken: cancellationToken);
```

批量发布时应检查 `response.FailedEntries`，因为一个批次可能包含部分失败的条目。

## 测试批处理相关行为

单元测试覆盖了有效的遥测数据，以及无效的温度和湿度值。集成测试通过真实的 Dapr pub/sub 测试框架发布读数和批次，以验证生成的批量订阅配置与投递语义。

```powershell
dotnet test examples\Messaging\04-BulkSubscribe\BulkSubscribe.Example04.Tests\BulkSubscribe.Example04.Tests.csproj
```

## 下一步

- [第 5 部分：gRPC AppCallback 推送]({{< ref dotnet-messaging-tutorial-appcallback.md >}})
- [Dapr 消息传递配置与使用指南]({{< ref dotnet-messaging-pubsub-usage.md >}})
