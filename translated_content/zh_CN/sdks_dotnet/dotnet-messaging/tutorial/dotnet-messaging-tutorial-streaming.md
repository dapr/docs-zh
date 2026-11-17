---
type: docs
title: "Part 2: Declarative streaming subscriptions"
linkTitle: "第 2 部分：streaming subscription"
weight: 160200
description: "通过应用发起的流式 gRPC 连接消费 pub/sub 事件"
---

[流式示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging/02-Streaming)展示了针对固定主题推荐的 declarative subscription 模型。

## 定义处理程序

实现 `ITopicHandler<TMessage>`，并使用 `DaprTopic` 标注处理程序：

```csharp
[DaprTopic("pubsub", "orders", Delivery = DeliveryMode.Streaming)]
public sealed class OrderProcessingHandler : ITopicHandler<OrderPlaced>
{
    public Task<TopicResponseAction> HandleAsync(
        OrderPlaced order,
        TopicContext context,
        CancellationToken cancellationToken)
    {
        if (order.Quantity <= 0 || string.IsNullOrWhiteSpace(order.ItemSku))
        {
            return Task.FromResult(TopicResponseAction.Drop);
        }

        if (order.ItemSku.StartsWith("RETRY-", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(TopicResponseAction.Retry);
        }

        return Task.FromResult(TopicResponseAction.Success);
    }
}
```

`Success` 确认消息，`Retry` 针对暂时性故障请求重新传递，`Drop` 则拒绝无效或有毒消息。处理程序还会接收 `TopicContext`，其中包含 pub/sub 名称、主题、消息 ID、标头和 metadata。

## 配置应用程序

```csharp
builder.Services.AddDaprMessaging();
```

源生成器会发现带有特性标注的处理程序，将它们注册到依赖注入（DI）容器中，并启动 streaming subscriber 托管服务。streaming subscription 由应用发起，因此应用不需要为接收消息提供入站的 HTTP 或 gRPC 端点。SDK 负责管理流，并在连接断开时重新连接。

## 测试处理程序与流

单元测试使用模拟的日志记录器和一个简单的 `TopicContext` 构造处理程序，然后针对具有代表性的输入断言 `Success`、`Retry` 和 `Drop` 的结果。这样可以让校验与确认逻辑保持快速，并且不依赖基础设施。

集成测试使用 `DaprTestApplicationBuilder`，并用测试工具提供的 gRPC 端点配置 `AddDaprMessaging`。它通过 sidecar 发布消息，并等待测试日志接收端中出现成功处理、库存处理以及丢弃无效订单的记录。这样既验证了托管服务与真实的流式投递，又无需应用的入站端口。

```powershell
dotnet test examples\Messaging\02-Streaming\Streaming.Example02.Tests\Streaming.Example02.Tests.csproj
```

## 下一步

- [第 3 部分：基于内容的路由与死信主题]({{< ref dotnet-messaging-tutorial-routing.md >}})
- [订阅主题操作指南]({{< ref dotnet-messaging-subscribe-howto.md >}})
