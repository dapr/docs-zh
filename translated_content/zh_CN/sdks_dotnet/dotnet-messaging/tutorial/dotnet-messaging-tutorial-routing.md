---
type: docs
title: "第 3 部分：基于内容的路由与死信主题"
linkTitle: "第 3 部分：路由与死信"
weight: 160300
description: "使用 CEL 表达式路由消息，并通过死信主题处理被拒绝的消息"
---

[路由示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging/03-RoutingAndDeadLetter)使用多个生成的订阅来路由运输包裹，并处理被拒绝的消息。

## 添加 CEL 匹配规则

`Match` 针对 CloudEvent 进行求值。`Priority` 控制规则的排序，值越小越先求值：

```csharp
[DaprTopic(
    "pubsub",
    "express-shipments",
    Match = "event.data.priorityTier == 'express'",
    Priority = 1,
    DeadLetterTopic = "deadletter-shipments")]
[DaprTopicMetadata("routingType", "express-tier")]
public sealed class ExpressShippingHandler : ITopicHandler<ShipmentPackage>
{
    public Task<TopicResponseAction> HandleAsync(
        ShipmentPackage shipment,
        TopicContext context,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(
            shipment.WeightKg <= 0
                ? TopicResponseAction.Drop
                : TopicResponseAction.Success);
    }
}
```

该示例使用 `event.data.destinationCountry != 'US'` 添加了一条国际规则，并为标准国内运输添加了一个优先级为 10 的兜底处理程序。`DaprTopicMetadata` 会向生成的订阅清单中添加自定义键值数据。

## 处理死信主题

像订阅其他主题一样订阅已配置的死信主题：

```csharp
[DaprTopic("pubsub", "deadletter-shipments")]
public sealed class DeadLetterShipmentHandler : ITopicHandler<ShipmentPackage>
{
    public Task<TopicResponseAction> HandleAsync(
        ShipmentPackage shipment,
        TopicContext context,
        CancellationToken cancellationToken)
    {
        // 记录或告警该被拒绝的消息。
        return Task.FromResult(TopicResponseAction.Success);
    }
}
```

根据组件配置，消息在处理程序返回 `Drop` 之后，或在重试投递耗尽之后，都可能进入死信主题。

## 测试路由决策

单元测试直接调用每个处理程序，覆盖加急运输、无效重量、国际目的地、标准兜底和死信消息等场景。这些测试验证的是业务决策，并不假装在验证 CEL 求值。

集成测试则应当针对真实的 Dapr 边车和 broker，验证生成的订阅清单、CEL 求值、优先级排序以及死信转发。

```powershell
dotnet test examples\Messaging\03-RoutingAndDeadLetter\Routing.Example03.Tests\Routing.Example03.Tests.csproj
```

## 下一步

- [第 4 部分：批量订阅]({{< ref dotnet-messaging-tutorial-bulk.md >}})
- [配置与使用指南]({{< ref dotnet-messaging-pubsub-usage.md >}})
