---
type: docs
title: "Part 6: HTTP push subscriptions"
linkTitle: "第 6 部分：HTTP 订阅"
weight: 160600
description: "公开生成的 HTTP 订阅发现端点与自定义事件路由"
---

[HTTP 订阅示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging/06-HttpSubscription)展示了 `DeliveryMode.Http` 的用法，适用于使用普通 HTTP 入口或反向代理的应用。

## 定义带路由的处理程序

```csharp
[DaprTopic(
    "pubsub",
    "invoices",
    Delivery = DeliveryMode.Http,
    Route = "api/events/invoices")]
public sealed class InvoiceProcessingHandler : ITopicHandler<InvoiceGenerated>
{
    public Task<TopicResponseAction> HandleAsync(
        InvoiceGenerated invoice,
        TopicContext context,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(
            invoice.TotalAmount <= 0
                ? TopicResponseAction.Drop
                : TopicResponseAction.Success);
    }
}
```

## 映射生成的路由

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprMessaging();

var app = builder.Build();
app.MapDaprMessaging();
app.Run();
```

生成的映射会公开 `GET /dapr/subscribe` 供 Dapr 发现订阅，并为该主题的 CloudEvents 映射 `POST /api/events/invoices`。该路由由 `Route` 属性生成，无需单独的控制器或操作。

使用应用的 HTTP 端口运行：

```powershell
dapr run --app-id http-subscriber-example --app-port 5000 `
  --dapr-grpc-port 50001 -- dotnet run
```

使用 `curl http://localhost:5000/dapr/subscribe` 查看生成的 manifest。

## 测试 HTTP 投递

单元测试直接调用发票处理程序，验证有效金额、零金额和负金额的情况。集成测试使用测试应用和真实的 Dapr sidecar，验证订阅发现与 HTTP 推送投递。这使测试既能覆盖路由映射和 CloudEvent 派发，又无需将业务规则测试与 ASP.NET 宿主耦合在一起。

```powershell
dotnet test examples\Messaging\06-HttpSubscription\HttpSubscription.Example06.Tests\HttpSubscription.Example06.Tests.csproj
```

## 下一步

- [第 7 部分：动态 streaming subscriptions]({{< ref dotnet-messaging-tutorial-dynamic.md >}})
- [Dapr Messaging 配置与使用指南]({{< ref dotnet-messaging-pubsub-usage.md >}})
