---
type: docs
title: "DaprDistributedLockClient usage"
linkTitle: "DaprDistributedLockClient 用法"
weight: 69050
description: 使用 DaprDistributedLockClient 的重要提示与建议
---

## 生命周期管理

`DaprDistributedLockClient` 是 Dapr 客户端的一个版本，专门用于与 Dapr 分布式锁 API 交互。它可以与 `DaprClient` 以及其他 Dapr 客户端一同注册，不会产生冲突。

它会保持与 Dapr sidecar 运行时通信所用的 TCP 套接字等网络资源。

为获得最佳性能，建议使用 `Dapr.DistributedLock` 包提供的依赖注入容器机制，在应用的各处便捷地访问注入的实例。这些注入的实例是线程安全的，可在应用中的不同类型之间共享使用。通过依赖注入进行注册时，可以使用 `IConfiguration` 中的值或其他已注入的服务，而在各个类中从零开始创建客户端时，这种做法往往难以实现。

如果你手动创建 `DaprDistributedLockClient`，请使用 `DaprDistributedLockBuilder`。

避免为每次操作都创建一个 `DaprDistributedLockClient`。受支持的操作请参阅[获取、释放和状态处理]({{< ref dotnet-distributedlock-howto.md >}})。

## 通过 `DaprDistributedLockBuilder` 配置 `DaprDistributedLockClient`

在调用 `.Build()` 创建客户端之前，可以通过调用 `DaprDistributedLockBuilder` 类的方法来配置 `DaprDistributedLockClient`。每个 `DaprDistributedLockClient` 的设置彼此独立，调用 `.Build()` 之后无法再更改。

```csharp
var daprDistributedLockClient = new DaprDistributedLockBuilder()
    .UseDaprApiToken("abc123") // 可选：指定用于向其他 Dapr sidecar 进行身份验证的 API 令牌
    .Build();
```

`DaprDistributedLockBuilder` 包含以下设置：

- Dapr sidecar 的 HTTP 端点
- Dapr sidecar 的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于向 sidecar 进行请求身份验证的 API 令牌
- 用于创建 SDK 所使用的 `HttpClient` 实例的工厂方法
- 向 sidecar 发出请求时 `HttpClient` 实例所使用的超时时间

SDK 会读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr sidecar 的 HTTP 端点，示例：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr sidecar 的 gRPC 端点，示例：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：若未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr sidecar 的本地 HTTP 端点
- `DAPR_GRPC_PORT`：若未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr sidecar 的本地 gRPC 端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消操作，这依赖于 gRPC 通道选项的配置。如果你需要自行配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprDistributedLockClient = new DaprDistributedLockBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 在 `DaprDistributedLockClient` 中使用取消

`DaprDistributedLockClient` 上的 API 执行异步操作，并接受一个可选的 `CancellationToken` 参数。这遵循 .NET 中可取消操作的标准做法。需要注意的是，取消发生时，无法保证远端端点会停止处理该请求，只能保证客户端已停止等待其完成。

取消可能以 `OperationCanceledException` 的形式出现，也可能以包装了 gRPC 取消的 `DaprException` 形式出现，具体取决于通道配置。请检查内部异常，而不要把取消误判为锁冲突。

## 通过依赖注入配置 `DaprDistributedLockClient`

在依赖注入容器中注册 `DaprDistributedLockClient` 时使用内置的扩展方法，可以带来以下好处：只需注册一次这个长生命周期的服务、集中管理复杂的配置，并通过确保同样长生命周期的资源（例如 `HttpClient` 实例）被尽可能复用来提升性能。

这里提供三种重载，使开发者能够针对其场景灵活地配置客户端。每种重载都会在尚未注册时为你注册 `IHttpClientFactory`，并将 `DaprDistributedLockBuilder` 配置为在创建 `HttpClient` 实例时使用它，从而尽可能复用同一实例，避免套接字耗尽等问题。

第一种方式无需开发者进行任何配置，`DaprDistributedLockClient` 使用默认设置进行配置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprDistributedLock(); // 注册 `DaprDistributedLockClient`，使其可在需要时被注入
var app = builder.Build();
```

有时开发者需要使用上述各种配置选项来配置所创建的客户端。这可以通过传入 `DaprDistributedLockBuilder` 的重载来完成，它提供了配置必要选项的方法。

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

最后，开发者可能需要从其他服务中获取信息来填充这些配置值。这些值可以来自 `DaprClient` 实例、供应商特定的 SDK 或某个本地服务，但只要它已在 DI 中注册，就可以通过最后一种重载注入到这个配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

// 注册一个虚构的服务，用于从某处获取 secret
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprDistributedLock((serviceProvider, daprDistributedLockBuilder) => {
    // 从服务提供程序中获取 SecretService 实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    // 配置 DaprDistributedLockBuilder
    daprDistributedLockBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```
