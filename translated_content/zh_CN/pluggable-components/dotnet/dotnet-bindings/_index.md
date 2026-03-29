---
type: docs
title: "实现 .NET 输入/输出绑定组件"
linkTitle: "绑定"
weight: 1000
description: 如何使用 Dapr 可插拔组件 .NET SDK 创建输入/输出绑定
no_list: true
is_preview: true
---

创建绑定组件只需要几个基本步骤。

## 添加绑定命名空间

添加绑定相关命名空间的 `using` 语句。

```csharp
using Dapr.PluggableComponents.Components;
using Dapr.PluggableComponents.Components.Bindings;
```

## 输入绑定：实现 `IInputBinding`

创建一个实现 `IInputBinding` 接口的类。

```csharp
internal sealed class MyBinding : IInputBinding
{
    public Task InitAsync(MetadataRequest request, CancellationToken cancellationToken = default)
    {
        // 使用配置的元数据初始化组件时调用...
    }

    public async Task ReadAsync(MessageDeliveryHandler<InputBindingReadRequest, InputBindingReadResponse> deliveryHandler, CancellationToken cancellationToken = default)
    {
        // 直到被取消之前，检查底层存储中的消息并将其传递给 Dapr 运行时...
    }
}
```

对 `ReadAsync()` 方法的调用是"长期运行"的，因为该方法预期在取消之前不会返回（例如，通过 `cancellationToken`）。当从组件的底层存储读取消息时，这些消息通过 `deliveryHandler` 回调传递给 Dapr 运行时。传递操作允许组件在应用程序（由 Dapr 运行时服务）确认处理消息时接收通知。

```csharp
    public async Task ReadAsync(MessageDeliveryHandler<InputBindingReadRequest, InputBindingReadResponse> deliveryHandler, CancellationToken cancellationToken = default)
    {
        TimeSpan pollInterval = // 轮询间隔（例如，来自初始化元数据）...

        // 轮询底层存储直到被取消...
        while (!cancellationToken.IsCancellationRequested)
        {
            var messages = // 从底层存储轮询消息...

            foreach (var message in messages)
            {
                // 将消息传递给 Dapr 运行时...
                await deliveryHandler(
                    new InputBindingReadResponse
                    {
                        // 设置消息内容...
                    },
                    // 当应用程序确认消息时调用的回调...
                    async request =>
                    {
                        // 处理响应数据或错误消息...
                    })
            }

            // 等待下一次轮询（或取消）...
            await Task.Delay(pollInterval, cancellationToken);
        }
    }
```

## 输出绑定：实现 `IOutputBinding`

创建一个实现 `IOutputBinding` 接口的类。

```csharp
internal sealed class MyBinding : IOutputBinding
{
    public Task InitAsync(MetadataRequest request, CancellationToken cancellationToken = default)
    {
        // 使用配置的元数据初始化组件时调用...
    }

    public Task<OutputBindingInvokeResponse> InvokeAsync(OutputBindingInvokeRequest request, CancellationToken cancellationToken = default)
    {
        // 调用以执行特定操作...
    }

    public Task<string[]> ListOperationsAsync(CancellationToken cancellationToken = default)
    {
        // 调用以列出可执行的操作。
    }
}
```

## 输入和输出绑定组件

组件可以同时是输入和输出绑定，只需实现这两个接口即可。

```csharp
internal sealed class MyBinding : IInputBinding, IOutputBinding
{
    // IInputBinding 实现...

    // IOutputBinding 实现...
}
```

## 注册绑定组件

在主程序文件（例如 `Program.cs`）中，在应用程序服务中注册绑定组件。

```csharp
using Dapr.PluggableComponents;

var app = DaprPluggableComponentsApplication.Create();

app.RegisterService(
    "<socket name>",
    serviceBuilder =>
    {
        serviceBuilder.RegisterBinding<MyBinding>();
    });

app.Run();
```

{{% alert title="注意" color="primary" %}}
同时实现 `IInputBinding` 和 `IOutputBinding` 的组件将被同时注册为输入和输出绑定。
{{% /alert %}}

## 后续步骤

- [了解可插拔组件 .NET SDK 的高级步骤]({{% ref "dotnet-advanced" %}})
- 了解有关使用可插拔组件 .NET SDK 的更多信息：
  - [发布订阅]({{% ref "dotnet-pub-sub" %}})
  - [状态存储]({{% ref "dotnet-state-store" %}})
