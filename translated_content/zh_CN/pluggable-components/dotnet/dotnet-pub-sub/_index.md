---
type: docs
title: "实现 .NET 发布订阅组件"
linkTitle: "发布订阅"
weight: 1000
description: 如何使用 Dapr 可插拔组件 .NET SDK 创建发布订阅
no_list: true
is_preview: true
---

创建发布订阅组件只需几个基本步骤。

## 添加发布订阅命名空间

为发布订阅相关的命名空间添加 `using` 语句。

```csharp
using Dapr.PluggableComponents.Components;
using Dapr.PluggableComponents.Components.PubSub;
```

## 实现 `IPubSub`

创建一个实现 `IPubSub` 接口的类。

```csharp
internal sealed class MyPubSub : IPubSub
{
    public Task InitAsync(MetadataRequest request, CancellationToken cancellationToken = default)
    {
        // 调用以使用配置的元数据初始化组件...
    }

    public Task PublishAsync(PubSubPublishRequest request, CancellationToken cancellationToken = default)
    {
        // 将消息发送到"topic"...
    }

    public Task PullMessagesAsync(PubSubPullMessagesTopic topic, MessageDeliveryHandler<string?, PubSubPullMessagesResponse> deliveryHandler, CancellationToken cancellationToken = default)
    {
        // 直到取消之前，检查 topic 中的消息并将其传递给 Dapr runtime...
    }
}
```

对 `PullMessagesAsync()` 方法的调用是"长期存在"的，也就是说该方法在取消之前（例如通过 `cancellationToken`）不会返回。应从中拉取消息的"topic"通过 `topic` 参数传递，而向 Dapr runtime 的传递则通过 `deliveryHandler` 回调执行。传递允许组件在应用程序（由 Dapr runtime 提供服务）确认已处理消息时接收通知。

```csharp
    public async Task PullMessagesAsync(PubSubPullMessagesTopic topic, MessageDeliveryHandler<string?, PubSubPullMessagesResponse> deliveryHandler, CancellationToken cancellationToken = default)
    {
        TimeSpan pollInterval = // 轮询间隔（例如来自初始化元数据）...

        // 轮询 topic 直到取消...
        while (!cancellationToken.IsCancellationRequested)
        {
            var messages = // 从 topic 轮询消息...

            foreach (var message in messages)
            {
                // 将消息传递给 Dapr runtime...
                await deliveryHandler(
                    new PubSubPullMessagesResponse(topicName)
                    {
                        // 设置消息内容...
                    },
                    // 当应用程序确认消息时调用的回调...
                    async errorMessage =>
                    {
                        // 空消息表示应用程序成功处理了消息...
                        if (String.IsNullOrEmpty(errorMessage))
                        {
                            // 从 topic 中删除消息...
                        }
                    })
            }

            // 等待下一次轮询（或取消）...
            await Task.Delay(pollInterval, cancellationToken);
        }
    }
```

## 注册发布订阅组件

在主程序文件（例如 `Program.cs`）中，向应用程序服务注册发布订阅组件。

```csharp
using Dapr.PluggableComponents;

var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "<socket name>",
    serviceBuilder =>
    {
        serviceBuilder.RegisterPubSub<MyPubSub>();
    });

app.Run();
```

## 后续步骤

- [了解可插拔组件 .NET SDK 的高级步骤]({{% ref "dotnet-advanced" %}})
- 了解有关使用可插拔组件 .NET SDK 的更多信息：
  - [绑定]({{% ref "dotnet-bindings" %}})
  - [状态存储]({{% ref "dotnet-state-store" %}})
