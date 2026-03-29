---
type: docs
title: "Dapr 分布式锁 .NET SDK"
linkTitle: "分布式锁"
weight: 61000
description: 快速上手 Dapr 分布式锁 .NET SDK
---

使用 Dapr 分布式锁包，您可以在资源上创建和移除锁，以管理分布式应用程序之间的独占性。

虽然此功能在 `Dapr.Client` 和 `Dapr.DistributedLock` 包中均有实现，但两者之间的方法略有不同，未来版本将弃用 `Dapr.Client` 包。建议新实现使用 `Dapr.DistributedLock` 包。本文档将反映 `Dapr.DistributedLock` 包中的实现。

## 生命周期管理

`DaprDistributedLockClient` 是专门用于与 Dapr 分布式锁 API 交互的 Dapr 客户端版本。它可以与 `DaprClient` 和其他 Dapr 客户端一起注册，不会有任何问题。

它维护对网络资源的访问，这些资源以用于与 Dapr 边车运行时通信的 TCP 套接字形式存在。

为了获得最佳性能，建议您利用 `Dapr.DistributedLock` 包提供的依赖注入容器机制，以便在整个应用程序中轻松访问注入的实例。这些注入的实例是线程安全的，旨在应用程序的不同类型之间使用。通过依赖注入注册可以利用 `IConfiguration` 中的值或其他注入的服务，这在每个类中从头创建客户端时是不切实际的。

如果您选择手动创建 `DaprDistributedLockClient` 实例，建议使用 `DaprClientBuilder` 来创建客户端。这将确保客户端正确配置以与 Dapr 边车运行时通信。

避免为每个操作创建 `DaprDistributedLockClient`。

## 通过 `DaprDistributedLockBuilder` 配置 `DaprDistributedLockClient`

可以通过在调用 `.Build()` 创建客户端本身之前调用 `DaprDistributedLockBuilder` 类上的方法来配置 `DaprDistributedLockClient`。每个 `DaprDistributedLockClient` 的设置是独立的，在调用 `.Build()` 后无法更改。

```csharp
var daprDistributedLockClient = new DaprDistributedLockBuilder()
    .UseDaprApiToken("abc123") // 可选地指定用于向其他 Dapr 边车进行身份验证的 API 令牌
    .Build();
```

`DaprDistributedLockBuilder` 包含以下设置：

- Dapr 边车的 HTTP 端点
- Dapr 边车的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于向边车验证请求的 API 令牌
- 用于创建 SDK 使用的 `HttpClient` 实例的工厂方法
- 向边车发出请求时 `HttpClient` 实例使用的超时时间

SDK 将读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr 边车的 HTTP 端点，例如：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr 边车的 gRPC 端点，例如：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr 边车的 HTTP 本地端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr 边车的 gRPC 本地端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消依赖于 gRPC 通道选项的配置。如果您需要自己配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprDistributedLockClient = new DaprDistributedLockBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ... ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 在 `DaprDistributedLockClient` 中使用取消

`DaprDistributedLockClient` 上的 API 执行异步操作并接受可选的 `CancellationToken` 参数。这遵循了 .NET 可取消操作的标准实践。请注意，当发生取消时，无法保证远程端点停止处理请求，只能保证客户端已停止等待完成。

当操作被取消时，它将抛出 `OperationCancelledException`。

## 通过依赖注入配置 `DaprDistributedLockClient`

使用内置扩展方法在依赖注入容器中注册 `DaprDistributedLockClient` 可以提供一次注册长期服务的优势，集中化复杂配置，并通过确保在可能的情况下重用类似的长期资源（例如 `HttpClient` 实例）来提高性能。

有三种重载可用，为开发人员为其场景配置客户端提供最大的灵活性。如果尚未注册，每个重载都会代表您注册 `IHttpClientFactory`，并配置 `DaprDistributedLockBuilder` 在创建 `HttpClient` 实例时使用它，以便尽可能重用同一实例并避免套接字耗尽和其他问题。

在第一种方法中，开发人员不进行任何配置，`DaprDistributedLockClient` 使用默认设置配置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprDistributedLock(); // 根据需要注册 `DaprDistributedLockClient` 以进行注入
var app = builder.Build();
```

有时开发人员需要使用上面详述的各种配置选项来配置创建的客户端。这是通过传入 `DaprDistributedLockBuilder` 并公开配置必要选项的方法的重载来完成的。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprDistributedLock((_, daprDistributedLockBuilder) => {
   // 设置 API 令牌
   daprDistributedLockBuilder.UseDaprApiToken("abc123");
   // 指定非标准的 HTTP 端点
   daprDistributedLockBuilder.UseHttpEndpoint("http://dapr.my-company.com");
});

var app = builder.Build();
```

最后，开发人员可能需要从另一个服务检索信息以填充这些配置值。该值可以从 `DaprClient` 实例、供应商特定的 SDK 或某些本地服务提供，但只要它也在 DI 中注册，就可以通过最后一个重载注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

// 注册一个从某处检索机密的虚构服务
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprDistributedLock((serviceProvider, daprDistributedLockBuilder) => {
    // 从服务提供程序检索 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    // 配置 `DaprDistributedLockBuilder`
    daprDistributedLockBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```
