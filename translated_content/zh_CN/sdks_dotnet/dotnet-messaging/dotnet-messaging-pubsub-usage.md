---
type: docs
title: "DaprPublishSubscribeClient 用法"
linkTitle: "DaprPublishSubscribeClient 用法"
weight: 69000
description: 使用 DaprPublishSubscribeClient 的基本技巧与建议
---

## 生命周期管理

`DaprPublishSubscribeClient` 是 Dapr 客户端的一个版本，专门用于与 Dapr 消息传递 API 交互。
它可以与 `DaprClient` 和其他 Dapr 客户端一起注册而不会产生问题。

它维护对网络资源的访问，这些资源以用于与 Dapr 边车通信的 TCP 套接字形式存在，并实现
`IAsyncDisposable` 以支持资源的积极清理。

为获得最佳性能，应创建一个 `DaprPublishSubscribeClient` 的单一长期实例，并在整个应用程序中提供对该共享
实例的访问。`DaprPublishSubscribeClient` 实例是线程安全的，旨在共享使用。

可以利用依赖注入功能来辅助实现这一点。注册方法支持注册为
单例、作用域实例或瞬态（意味着每次注入时都会重新创建），但同时也支持
利用 `IConfiguration` 或其他注入服务的值进行注册，这在每次
从头创建客户端时是不切实际的。

避免为每个操作创建一个 `DaprPublishSubscribeClient` 并在操作完成时将其释放。
`DaprPublishSubscribeClient` 仅应在您不再希望在订阅上接收事件时才被释放，因为释放它将取消新事件的持续接收。

## 通过 DaprPublishSubscribeClientBuilder 配置 DaprPublishSubscribeClient
可以通过在调用 `.Build()` 创建客户端本身之前调用 `DaprPublishSubscribeClientBuilder` 类上的方法来配置 `DaprPublishSubscribeClient`。每个 `DaprPublishSubscribeClient` 的设置是独立的，
无法在调用 `.Build()` 后更改。

```cs
var daprPubsubClient = new DaprPublishSubscribeClientBuilder()
    .UseDaprApiToken("abc123") // 指定用于向其他 Dapr 边车进行身份验证的 API 令牌
    .Build();
```

`DaprPublishSubscribeClientBuilder` 包含以下设置：

- Dapr 边车的 HTTP 端点
- Dapr 边车的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于向边车验证请求的 API 令牌
- 用于创建 SDK 使用的 `HttpClient` 实例的工厂方法
- 在向边车发出请求时 `HttpClient` 实例使用的超时时间

SDK 将读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr 边车的 HTTP 端点，示例：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr 边车的 gRPC 端点，示例：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则使用此项来查找 Dapr 边车的 HTTP 本地端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则使用此项来查找 Dapr 边车的 gRPC 本地端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项
Dapr 使用 `CancellationToken` 进行取消依赖于 gRPC 通道选项的配置。如果您
需要自己配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprPubsubClient = new DaprPublishSubscribeClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ... ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 在 DaprPublishSubscribeClient 中使用取消

`DaprPublishSubscribeClient` 上的 API 执行异步操作并接受一个可选的 `CancellationToken`
参数。这遵循 .NET 用于可取消操作的标准实践。请注意，当发生取消时，无法
保证远程端点停止处理请求，只能保证客户端已停止等待完成。

当操作被取消时，它将抛出 `OperationCancelledException`。

## 通过依赖注入配置 DaprPublishSubscribeClient

使用用于在依赖注入容器中注册 `DaprPublishSubscribeClient` 的内置扩展方法
可以带来以下好处：一次性注册长期服务、集中复杂配置，并通过确保类似的长期资源在可能的情况下被重用（例如 `HttpClient` 实例）来提高性能。

有三种重载可用，为开发人员在其场景中配置客户端提供最大的灵活性。
如果尚未注册，每个重载都将代表您注册 `IHttpClientFactory`，并配置
`DaprPublishSubscribeClientBuilder` 在创建 `HttpClient` 实例时使用它，以便尽可能重用同一实例并避免套接字耗尽和其他问题。

在第一种方法中，开发人员不进行任何配置，`DaprPublishSubscribeClient` 使用默认设置进行配置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.DaprPublishSubscribeClient(); //注册 `DaprPublishSubscribeClient` 以便根据需要注入
var app = builder.Build();
```

有时开发人员需要使用上述各种配置选项来配置创建的客户端。这是通过传入 `DaprJobsClientBuiler` 的重载来完成的，该重载公开了配置必要选项的方法。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient((_, daprPubSubClientBuilder) => {
   //设置 API 令牌
   daprPubSubClientBuilder.UseDaprApiToken("abc123");
   //指定非标准的 HTTP 端点
   daprPubSubClientBuilder.UseHttpEndpoint("http://dapr.my-company.com");
});

var app = builder.Build();
```

最后，开发人员可能需要从另一个服务检索信息以填充这些配置值。该值可以从 `DaprClient` 实例、供应商特定的 SDK 或某个本地服务提供，但只要它也在 DI 中注册，就可以通过最后一个重载注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

//注册一个从某处检索机密的虚构服务
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprPublishSubscribeClient((serviceProvider, daprPubSubClientBuilder) => {
    //从服务提供程序检索 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    //配置 `DaprPublishSubscribeClientBuilder`
    daprPubSubClientBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```
