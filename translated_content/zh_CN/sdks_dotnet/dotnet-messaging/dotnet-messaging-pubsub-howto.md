---
type: docs
title: "如何操作：使用 .NET SDK 创建和管理 Dapr 流式订阅"
linkTitle: "如何操作：创建和管理流式订阅"
weight: 61000
description: 了解如何使用 .NET SDK 创建和管理 Dapr 流式订阅
---

让我们使用流式处理能力创建一个对发布/订阅主题或队列的订阅。在接下来的演示中，我们将使用[此处提供的简单示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Client/PublishSubscribe/StreamingSubscriptionExample)，作为说明如何配置消息处理程序的指南，这些配置在运行时进行，无需预先配置端点。在本指南中，您将：

- 部署 .NET Web API 应用程序 ([StreamingSubscriptionExample](https://github.com/dapr/dotnet-sdk/tree/master/examples/Client/PublishSubscribe/StreamingSubscriptionExample))
- 使用 Dapr .NET Messaging SDK 动态订阅发布/订阅主题。

## 前置条件
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 或 [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- 已将 [Dapr.Messaging](https://www.nuget.org/packages/Dapr.Messaging) NuGet 包安装到您的项目中

## 设置环境
克隆 [.NET SDK 仓库](https://github.com/dapr/dotnet-sdk)。

```sh
git clone https://github.com/dapr/dotnet-sdk.git
```

从 .NET SDK 根目录导航到 Dapr 流式 PubSub 示例。

```sh
cd examples/Client/PublishSubscribe
```

## 在本地运行应用程序

要运行 Dapr 应用程序，您需要启动 .NET 程序和 Dapr 边车。导航到 `StreamingSubscriptionExample` 目录。

```sh
cd StreamingSubscriptionExample
```

我们将运行一个同时启动 Dapr 边车和 .NET 程序的命令。

```sh
dapr run --app-id pubsubapp --dapr-grpc-port 4001 --dapr-http-port 3500 -- dotnet run
```
> Dapr 在 `http://localhost:3500` 监听 HTTP 请求，在 `http://localhost:4001` 监听内部 Jobs gRPC 请求。

## 使用依赖注入注册 Dapr PubSub 客户端
Dapr Messaging SDK 提供了一个扩展方法来简化 Dapr PubSub 客户端的注册。在完成 `Program.cs` 中的依赖注入注册之前，添加以下行：

```csharp
var builder = WebApplication.CreateBuilder(args);

//Add anywhere between these two
builder.Services.AddDaprPubSubClient(); //That's it

var app = builder.Build();
```

您可能需要为 Dapr PubSub 客户端提供一些配置选项，这些选项应在每次对边车的调用时都存在，例如 Dapr API 令牌，或者您想使用非标准的 HTTP 或 gRPC 端点。这可以通过使用注册方法的重载来实现，该方法允许配置 `DaprPublishSubscribeClientBuilder` 实例：

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprPubSubClient((_, daprPubSubClientBuilder) => {
    daprPubSubClientBuilder.UseDaprApiToken("abc123");
    daprPubSubClientBuilder.UseHttpEndpoint("http://localhost:8512"); //Non-standard sidecar HTTP endpoint
});

var app = builder.Build();
```

不过，您可能希望从其他来源检索要注入的值，而这些值本身已注册为依赖项。您还可以使用另一个重载将 `IServiceProvider` 注入到配置操作方法中。在以下示例中，我们注册一个虚拟的单例，该单例可以从某处检索机密，并将其传递给 `AddDaprJobClient` 的配置方法，以便我们可以从其他地方检索我们的 Dapr API 令牌以在此处进行注册：

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SecretRetriever>();
builder.Services.AddDaprPubSubClient((serviceProvider, daprPubSubClientBuilder) => {
    var secretRetriever = serviceProvider.GetRequiredService<SecretRetriever>();
    var daprApiToken = secretRetriever.GetSecret("DaprApiToken").Value;
    daprPubSubClientBuilder.UseDaprApiToken(daprApiToken);
    
    daprPubSubClientBuilder.UseHttpEndpoint("http://localhost:8512");
});

var app = builder.Build();
```

## 使用 IConfiguration 配置 Dapr PubSub 客户端
也可以使用已注册的 `IConfiguration` 中的值来配置 Dapr PubSub 客户端，而无需按照上一节演示的那样使用 `DaprPublishSubscribeClientBuilder` 显式指定每个值覆盖。相反，通过填充通过依赖注入提供的 `IConfiguration`，`AddDaprPubSubClient()` 注册将自动使用这些值而不是其各自的默认值。

首先填充配置中的值。可以通过以下几种不同方式来完成此操作，如下所示。

### 通过 `ConfigurationBuilder` 配置
可以在不使用配置源的情况下配置应用程序设置，而是使用 `ConfigurationBuilder` 实例在内存中填充值：

```csharp
var builder = WebApplication.CreateBuilder();

//Create the configuration
var configuration = new ConfigurationBuilder()
    .AddInMemoryCollection(new Dictionary<string, string> {
            { "DAPR_HTTP_ENDPOINT", "http://localhost:54321" },
            { "DAPR_API_TOKEN", "abc123" }
        })
    .Build();

builder.Configuration.AddConfiguration(configuration);
builder.Services.AddDaprPubSubClient(); //This will automatically populate the HTTP endpoint and API token values from the IConfiguration
```

### 通过环境变量配置
可以从应用程序可用的环境变量访问应用程序设置。

以下环境变量将用于填充注册 Dapr PubSub 客户端所使用的 HTTP 端点和 API 令牌。

| 键                | 值                  |
|--------------------|------------------------|
| DAPR_HTTP_ENDPOINT | http://localhost:54321 |
| DAPR_API_TOKEN     | abc123                 |

```csharp
var builder = WebApplication.CreateBuilder();

builder.Configuration.AddEnvironmentVariables();
builder.Services.AddDaprPubSubClient();
```

Dapr PubSub 客户端将被配置为使用 HTTP 端点 `http://localhost:54321`，并在所有出站请求中填充 API 令牌头 `abc123`。

### 通过带前缀的环境变量配置
但是，在不使用容器的共享主机场景中（在同一台机器上运行多个应用程序）或在开发环境中，为环境变量添加前缀并不罕见。以下示例假定 HTTP 端点和 API 令牌都将从带有值 "myapp_" 前缀的环境变量中提取。在此场景中使用的两个环境变量如下：

| 键                      | 值                  |
|--------------------------|------------------------|
| myapp_DAPR_HTTP_ENDPOINT | http://localhost:54321 |
| myapp_DAPR_API_TOKEN     | abc123                 |

这些环境变量将在以下示例中加载到已注册的配置中，并在不带前缀的情况下可用。

```csharp
var builder = WebApplication.CreateBuilder();

builder.Configuration.AddEnvironmentVariables(prefix: "myapp_");
builder.Services.AddDaprPubSubClient();
```

Dapr PubSub 客户端将被配置为使用 HTTP 端点 `http://localhost:54321`，并在所有出站请求中填充 API 令牌头 `abc123`。

## 不依赖依赖注入使用 Dapr PubSub 客户端
虽然使用依赖注入简化了 .NET 中复杂类型的使用，并使处理复杂配置变得更加容易，但您不需要以这种方式注册 `DaprPublishSubscribeClient`。相反，您也可以选择从 `DaprPublishSubscribeClientBuilder` 实例创建它的实例，如下所示：

```cs

public class MySampleClass
{
    public void DoSomething()
    {
        var daprPubSubClientBuilder = new DaprPublishSubscribeClientBuilder();
        var daprPubSubClient = daprPubSubClientBuilder.Build();

        //Do something with the `daprPubSubClient`
    }
}
```

## 设置消息处理程序
Dapr 中的流式订阅实现通过将消息保留在 Dapr 运行时中，直到您的应用程序准备好接受它们为止，从而为您提供更大的控制权来处理来自事件的背压。.NET SDK 支持高性能队列，用于在处理挂起时在应用程序中维护这些消息的本地缓存。这些消息将保留在队列中，直到每个消息的处理超时或对每个消息执行响应操作（通常在处理成功或失败之后）。在 Dapr 运行时收到此响应操作之前，消息将由 Dapr 持久化，并在服务故障的情况下可用。

可用的各种响应操作如下：
| 响应操作 | 描述 |
| --- | --- |
| Retry | 该事件应在将来再次传递。 |
| Drop | 该事件应被删除（或转发到死信队列，如果已配置）并且不再尝试。 |
| Success | 该事件应被删除，因为它已成功处理。 |

处理程序一次将只接收一条消息，如果向订阅提供了取消令牌，则该令牌将在处理程序调用期间提供。

处理程序必须配置为返回 `Task<TopicResponseAction>`，以指示这些操作之一，即使来自 try/catch 块。如果您的处理程序未捕获异常，订阅将使用订阅注册期间在选项中配置的响应操作。

以下演示了示例中提供的示例消息处理程序：

```csharp
Task<TopicResponseAction> HandleMessageAsync(TopicMessage message, CancellationToken cancellationToken = default)
{
    try
    {
        //Do something with the message
        Console.WriteLine(Encoding.UTF8.GetString(message.Data.Span));
        return Task.FromResult(TopicResponseAction.Success);
    }
    catch
    {
        return Task.FromResult(TopicResponseAction.Retry);
    }
}
```

## 配置和订阅 PubSub 主题
流式订阅的配置需要向 Dapr 注册的 PubSub 组件的名称、正在订阅的主题或队列的名称、提供订阅配置的 `DaprSubscriptionOptions`、消息处理程序和可选的取消令牌。`DaprSubscriptionOptions` 唯一必需的参数是默认的 `MessageHandlingPolicy`，它由每个事件的超时和在该超时时采取的 `TopicResponseAction` 组成。

其他选项如下：

| 属性名称                                                                                 | 描述                                                                                    |
|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| 元数据                                                                                      | 附加订阅元数据                                                               |
| 死信主题                                                                               | 用于将丢弃的消息发送到的死信主题的可选名称。                        |
| 最大排队消息数                                                                         | 默认情况下，不会对内部队列强制执行最大边界，但设置此     |
| 属性将强加一个上限。                                                         |                                                                                                |
| 最大清理超时                                                                         | 当订阅被释放或令牌发出取消请求时，这指定 |
| 可用于处理内部队列中剩余消息的最长时间。 |                                                                                                |

然后，订阅将配置为以下示例：
```csharp
var messagingClient = app.Services.GetRequiredService<DaprPublishSubscribeClient>();

var cancellationTokenSource = new CancellationTokenSource(TimeSpan.FromSeconds(60)); //Override the default of 30 seconds
var options = new DaprSubscriptionOptions(new MessageHandlingPolicy(TimeSpan.FromSeconds(10), TopicResponseAction.Retry));
var subscription = await messagingClient.SubscribeAsync("pubsub", "mytopic", options, HandleMessageAsync, cancellationTokenSource.Token);
```

## 终止和清理订阅
当您完成订阅并希望停止接收新事件时，只需在订阅实例上等待对 `DisposeAsync()` 的调用。这将导致客户端取消注册其他事件，并在释放任何内部资源之前继续处理背压队列中仍然剩余的所有事件（如果有）。此清理将受到订阅注册时在 `DaprSubscriptionOptions` 中提供的超时间隔的限制，默认情况下，这设置为 30 秒。
