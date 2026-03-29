---
type: docs
title: "DaprClient 使用指南"
linkTitle: "DaprClient 使用指南"
weight: 100000
description: 使用 DaprClient 的基本技巧和建议
---

## 生命周期管理

`DaprClient` 持有对网络资源的访问，这些资源以用于与 Dapr 边车通信的 TCP 套接字形式存在。`DaprClient` 实现了 `IDisposable` 以支持资源的主动清理。

### 依赖注入

`AddDaprClient()` 方法会将 Dapr 客户端注册到 ASP.NET Core 依赖注入容器中。此方法接受一个可选的 options 委托来配置 `DaprClient`，以及一个 `ServiceLifetime` 参数，允许你为注册的资源指定不同的生命周期，而不是使用默认的 `Singleton` 值。

以下示例假设所有默认值都是可接受的，足以注册 `DaprClient`。

```csharp
services.AddDaprClient();
```

可选的配置委托用于通过在提供的 `DaprClientBuilder` 上指定选项来配置 `DaprClient`，如以下示例所示：

```csharp
services.AddDaprClient(daprBuilder => {
    daprBuilder.UseJsonSerializerOptions(new JsonSerializerOptions {
            WriteIndented = true,
            MaxDepth = 8
        });
    daprBuilder.UseTimeout(TimeSpan.FromSeconds(30));
});
```

另一个可选的配置委托重载提供了对 `DaprClientBuilder` 和 `IServiceProvider` 的访问，允许进行更高级的配置，这些配置可能需要从依赖注入容器中注入服务。

```csharp
services.AddSingleton<SampleService>();
services.AddDaprClient((serviceProvider, daprBuilder) => {
    var sampleService = serviceProvider.GetRequiredService<SampleService>();
    var timeoutValue = sampleService.TimeoutOptions;
    
    daprBuilder.UseTimeout(timeoutValue);
});
```

### 手动实例化

除了使用依赖注入，还可以使用静态客户端构建器来构建 `DaprClient`。

为获得最佳性能，应创建一个单一的长生命周期 `DaprClient` 实例，并在整个应用程序中提供对该共享实例的访问。`DaprClient` 实例是线程安全的，旨在共享使用。

避免为每个操作创建 `DaprClient` 并在操作完成时将其释放。

## 配置 DaprClient

可以通过在调用 `.Build()` 创建客户端之前调用 `DaprClientBuilder` 类上的方法来配置 `DaprClient`。每个 `DaprClient` 对象的设置是独立的，在调用 `.Build()` 后无法更改。

```C#
var daprClient = new DaprClientBuilder()
    .UseJsonSerializerSettings( ... ) // 配置 JSON 序列化器
    .Build();
```

默认情况下，`DaprClientBuilder` 将按以下顺序优先考虑以下位置来获取配置值：

- 提供给 `DaprClientBuilder` 上某个方法的值（例如 `UseTimeout(TimeSpan.FromSeconds(30))`）
- 从可选注入的 `IConfiguration` 中提取的值，其名称与相关环境变量的预期名称匹配
- 从相关环境变量中提取的值
- 默认值

### 在 `DaprClientBuilder` 上配置

`DaprClientBuilder` 包含以下方法来设置配置选项：

- `UseHttpEndpoint(string)`：Dapr 边车的 HTTP 端点
- `UseGrpcEndpoint(string)`：设置 Dapr 边车的 gRPC 端点
- `UseGrpcChannelOptions(GrpcChannelOptions)`：设置用于连接到 Dapr 边车的 gRPC 通道选项
- `UseHttpClientFactory(IHttpClientFactory)`：配置 `DaprClient` 在构建 `HttpClient` 实例时使用已注册的 `IHttpClientFactory`
- `UseJsonSerializationOptions(JsonSerializerOptions)`：用于配置 JSON 序列化
- `UseDaprApiToken(string)`：将提供的令牌添加到每个请求以向 Dapr 边车进行身份验证
- `UseTimeout(TimeSpan)`：指定 `HttpClient` 与 Dapr 边车通信时使用的超时值

### 从 `IConfiguration` 配置

除了直接从环境变量获取配置值，或者因为值是从依赖注入的服务中获取的，另一种选择是使这些值在 `IConfiguration` 上可用。

例如，你可能要在多租户环境中注册应用程序，并且需要为所使用的环境变量添加前缀。以下示例展示了当这些环境变量的键以 `test_` 为前缀时，如何将这些值从环境变量获取到你的 `IConfiguration` 中：

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables("test_"); // 检索所有以 "test_" 开头的环境变量，并在从 IConfiguration 获取时移除前缀
builder.Services.AddDaprClient();
```

### 从环境变量配置

SDK 将读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr 边车的 HTTP 端点，示例：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr 边车的 gRPC 端点，示例：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr 边车的 HTTP 本地端点，假定主机为 '127.0.0.1'
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr 边车的 gRPC 本地端点，假定主机为 '127.0.0.1'
- `DAPR_API_TOKEN`：用于设置 API 令牌

{{% alert title="注意" color="primary" %}}
如果同时指定了 `DAPR_HTTP_ENDPOINT` 和 `DAPR_HTTP_PORT`，则将忽略 `DAPR_HTTP_PORT` 中的端口值，优先使用 `DAPR_HTTP_ENDPOINT` 上隐式或显式定义的端口。对于 `DAPR_GRPC_ENDPOINT` 和 `DAPR_GRPC_PORT` 同理。
{{% /alert %}}

作为一般规则，应同时指定 HTTP 和 gRPC 端口，或同时指定 HTTP 和 gRPC 端点。实际上，使用 HTTP 还是 gRPC 取决于你使用的具体 Dapr 服务以及 .NET SDK 是否支持 HTTP 或 gRPC 协议。随着时间的推移，绝大多数 .NET SDK 将专门支持 gRPC，但这永远不会适用于所有服务，因此为你的应用程序提供面向未来的保障并始终指定这两个值是更好的做法。

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消操作依赖于 gRPC 通道选项的配置，这是默认启用的。如果你需要自己配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```C#
var daprClient = new DaprClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ... ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 使用取消令牌与 DaprClient

DaprClient 上执行异步操作的 API 接受一个可选的 `CancellationToken` 参数。这遵循 .NET 可取消操作的标准惯例。请注意，当发生取消时，无法保证远程端点停止处理请求，只能保证客户端已停止等待完成。

当操作被取消时，它将抛出 `OperationCancelledException`。

## 理解 DaprClient JSON 序列化

`DaprClient` 的许多方法使用 `System.Text.Json` 序列化器执行 JSON 序列化。接受应用程序数据类型作为参数的方法将对其进行 JSON 序列化，除非文档另有明确说明。

如果你有高级需求，值得阅读 [System.Text.Json 文档](https://docs.microsoft.com/dotnet/standard/serialization/system-text-json-overview)。Dapr .NET SDK 不提供独特的序列化行为或自定义 - 它依赖底层序列化器在应用程序的 .NET 类型之间转换数据。

`DaprClient` 配置为使用从 [JsonSerializerDefaults.Web](https://docs.microsoft.com/dotnet/api/system.text.json.jsonserializerdefaults?view=net-5.0) 配置的序列化器选项对象。这意味着 `DaprClient` 将对属性名称使用 `camelCase`，允许读取带引号的数字（`"10.99"`），并且将以不区分大小写的方式绑定属性。这些是与 ASP.NET Core 和 `System.Text.Json.Http` API 使用的相同设置，旨在遵循可互操作的 Web 约定。

从 .NET 5.0 开始，`System.Text.Json` 对 F# 语言的所有内置功能支持不佳。如果你使用 F#，你可能希望使用其中一个为 F# 功能添加支持的转换器包，例如 [FSharp.SystemTextJson](https://github.com/Tarmil/FSharp.SystemTextJson)。

### JSON 序列化的简单指导

如果你使用映射到 JSON 类型系统的功能集，使用 JSON 序列化和 `DaprClient` 的体验将会很顺畅。这些是可以简化代码的一般性指导原则。

- 避免继承和多态
- 不要尝试序列化具有循环引用的数据
- 不要在构造函数或属性访问器中放置复杂或昂贵的逻辑
- 使用干净映射到 JSON 类型的 .NET 类型（数值类型、字符串、`DateTime`）
- 为顶级消息、事件或状态值创建自己的类，以便将来可以添加属性
- 使用具有 `get`/`set` 属性的类型，或使用支持不可变类型的[支持的模式](https://docs.microsoft.com/dotnet/standard/serialization/system-text-json-immutability?pivots=dotnet-5-0)与 JSON 一起使用

### 多态性和序列化

`DaprClient` 使用的 `System.Text.Json` 序列化器在执行序列化时使用值的声明类型。

本节将在示例中使用 `DaprClient.SaveStateAsync<TValue>(...)`，但该建议适用于 SDK 公开的任何 Dapr 构建块。

```C#
public class Widget
{
    public string Color { get; set; }
}
...

// 将 Widget 值作为 JSON 存储在状态存储中
Widget widget = new Widget() { Color = "Green", };
await client.SaveStateAsync("mystatestore", "mykey", widget);
```

在上面的示例中，类型参数 `TValue` 的类型参数是从 `widget` 变量的类型推断出来的。这很重要，因为 `System.Text.Json` 序列化器将基于值的*声明类型*执行序列化。结果是存储 JSON 值 `{ "color": "Green" }`。

考虑当你尝试使用 `Widget` 的派生类型时会发生什么：

```C#
public class Widget
{
    public string Color { get; set; }
}

public class SuperWidget : Widget
{
    public bool HasSelfCleaningFeature { get; set; }
}
...

// 将 SuperWidget 值作为 JSON 存储在状态存储中
Widget widget = new SuperWidget() { Color = "Green", HasSelfCleaningFeature = true, };
await client.SaveStateAsync("mystatestore", "mykey", widget);
```

在此示例中，我们使用的是 `SuperWidget`，但变量的声明类型是 `Widget`。由于 JSON 序列化器的行为由声明类型决定，它只看到一个简单的 `Widget`，并将保存值 `{ "color": "Green" }` 而不是 `{ "color": "Green", "hasSelfCleaningFeature": true }`。

如果你希望 `SuperWidget` 的属性被序列化，那么最好的选择是用 `object` 覆盖类型参数。这将导致序列化器包含所有数据，因为它对该类型一无所知。

```C#
Widget widget = new SuperWidget() { Color = "Green", HasSelfCleaningFeature = true, };
await client.SaveStateAsync<object>("mystatestore", "mykey", widget);
```

## 错误处理

当遇到失败时，`DaprClient` 的方法将抛出 `DaprException` 或其子类。

```C#
try
{
    var widget = new Widget() { Color = "Green", };
    await client.SaveStateAsync("mystatestore", "mykey", widget);
}
catch (DaprException ex)
{
    // 处理异常、记录日志、重试等
}
```

最常见的失败情况将与以下内容相关：

- Dapr 组件配置不正确
- 瞬态故障（例如网络问题）
- 无效数据（例如反序列化 JSON 失败）

在任何这些情况下，你都可以通过 `.InnerException` 属性检查更多异常详细信息。
