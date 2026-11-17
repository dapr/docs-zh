---
type: docs
title: "第 5 部分：gRPC AppCallback 推送订阅"
linkTitle: "第 5 部分：AppCallback 推送"
weight: 160500
description: "通过 sidecar 发起的 gRPC AppCallback 调用接收 pub/sub 事件"
---

[AppCallback 示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Messaging/05-AppCallbackPush)使用 `DeliveryMode.Programmatic` 实现从 sidecar 到应用的 gRPC 推送。

## 定义编程式订阅者

```csharp
[DaprTopic("pubsub", "payments", Delivery = DeliveryMode.Programmatic)]
public sealed class PaymentProcessingHandler : ITopicHandler<PaymentReceived>
{
    public Task<TopicResponseAction> HandleAsync(
        PaymentReceived payment,
        TopicContext context,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(
            payment.Amount <= 0
                ? TopicResponseAction.Drop
                : TopicResponseAction.Success);
    }
}
```

在此模式下，Dapr 主动向应用的 AppCallback 服务发起 gRPC 调用。与 streaming subscription 不同，应用必须暴露一个可访问的 gRPC 端口。

## 映射生成的端点

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprMessaging();

var app = builder.Build();
app.MapDaprMessaging();
app.Run();
```

`MapDaprMessaging()` 暴露了生成的 AppCallback gRPC 服务，sidecar 用它来列出订阅并投递事件。使用应用端口和 gRPC 协议运行应用，例如：

```powershell
dapr run --app-id appcallback-example --app-port 5000 --app-protocol grpc `
  --dapr-grpc-port 50001 -- dotnet run
```

## 测试两个层次

单元测试验证有效付款能够成功处理，金额为零或负数的付款会被丢弃。集成测试为测试应用配置 gRPC 服务器、启动测试框架、发布真实付款，并观察处理程序的结果。这一区别很重要：单元测试验证业务规则，集成测试验证 AppCallback 注册、可达性与投递。

```powershell
dotnet test examples\Messaging\05-AppCallbackPush\AppCallback.Example05.Tests\AppCallback.Example05.Tests.csproj
```

## 下一步

- [第 6 部分：HTTP 推送订阅]({{< ref dotnet-messaging-tutorial-http.md >}})
- [订阅主题操作指南]({{< ref dotnet-messaging-subscribe-howto.md >}})
