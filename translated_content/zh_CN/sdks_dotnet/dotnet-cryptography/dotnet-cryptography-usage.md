---
type: docs
title: "Dapr Cryptography Client"
linkTitle: "Cryptography client"
weight: 510005
description: 了解如何创建 Dapr Cryptography 客户端
---

Dapr Cryptography 包允许您执行由 Dapr 边车提供的加密和解密操作。

## 生命周期管理

`DaprEncryptionClient` 是 Dapr 客户端的专用版本，专门用于与 Dapr Cryptography API 交互。它可以与 `DaprClient` 及其他 Dapr 客户端一起注册而不会出现问题。

它维护与网络资源的连接，这些资源以用于与 Dapr 边车通信的 TCP 套接字形式存在。

为了获得最佳性能，请创建一个 `DaprEncryptionClient` 的长期实例，并在整个应用程序中提供对该共享实例的访问。`DaprEncryptionClient` 实例是线程安全的，旨在共享使用。

利用依赖注入功能可以辅助实现这一点。注册方法支持将其注册为单例、作用域实例或瞬态（意味着每次注入时都会重新创建），此外还支持注册时使用来自 `IConfiguration` 或其他注入服务的值，这在每个类中从头创建客户端时是不切实际的。

避免为每次操作都创建一个 `DaprEncryptionClient`。

## 通过 `DaprEncryptionClientBuilder` 配置 `DaprEncryptionClient`

可以通过在调用 `.Build()` 创建客户端本身之前调用 `DaprEncryptionClientBuilder` 类上的方法来配置 `DaprCryptographyClient`。每个 `DaprEncryptionClientBuilder` 的设置是独立的，在调用 `.Build()` 后无法更改。

```cs
var daprEncryptionClient = new DaprEncryptionClientBuilder()
    .UseDaprApiToken("abc123") // 指定用于向 Dapr 边车进行身份验证的 API 令牌
    .Build();
```

`DaprEncryptionClientBuilder` 包含以下设置：
- Dapr 边车的 HTTP 端点
- Dapr 边车的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于向边车验证请求的 API 令牌
- 用于创建 SDK 使用的 `HttpClient` 实例的工厂方法
- 在向边车发出请求时 `HttpClient` 实例使用的超时时间

SDK 将读取以下环境变量以配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr 边车的 HTTP 端点，例如：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr 边车的 gRPC 端点，例如：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr 边车的 HTTP 本地端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr 边车的 gRPC 本地端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消操作依赖于 gRPC 通道选项的配置。如果您需要自己配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprEncryptionClient = new DaprEncryptionClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { .. ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 使用 `DaprEncryptionClient` 进行取消操作

`DaprEncryptionClient` 上的 API 执行异步操作并接受可选的 `CancellationToken` 参数。这遵循了 .NET 中可取消操作的标准实践。请注意，当发生取消时，无法保证远程端点停止处理请求，只能保证客户端已停止等待完成。

当操作被取消时，它将抛出 `OperationCancelledException`。

## 通过依赖注入配置 `DaprEncryptionClient`

使用内置扩展方法在依赖注入容器中注册 `DaprEncryptionClient` 可以带来以下好处：只需注册一次长期服务、集中复杂配置，并通过在可能的情况下重用类似的长期资源（例如 `HttpClient` 实例）来提高性能。

提供了三种重载，以便开发人员为其场景配置客户端时获得最大的灵活性。如果尚未注册 `IHttpClientFactory`，每个重载都将代表您注册它，并配置 `DaprEncryptionClientBuilder` 在创建 `HttpClient` 实例时使用它，以便尽可能重用同一实例并避免套接字耗尽和其他问题。

在第一种方法中，开发人员不进行任何配置，`DaprEncryptionClient` 使用默认设置进行配置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprEncryptionClent(); // 注册 `DaprEncryptionClient` 以便在需要时注入
var app = builder.Build();
```

有时开发人员需要使用上面详述的各种配置选项来配置创建的客户端。这是通过传入 `DaprEncryptionClientBuiler` 的重载来完成的，并公开了配置必要选项的方法。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprEncryptionClient((_, daprEncrpyptionClientBuilder) => {
   // 设置 API 令牌
   daprEncryptionClientBuilder.UseDaprApiToken("abc123");
   // 指定非标准 HTTP 端点
   daprEncryptionClientBuilder.UseHttpEndpoint("http://dapr.my-company.com");
});

var app = builder.Build();
```

最后，开发人员可能需要从另一个服务检索信息以填充这些配置值。该值可以从 `DaprClient` 实例、供应商特定的 SDK 或某些本地服务提供，但只要它也在 DI 中注册，就可以通过最后一个重载注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

// 注册从某处检索机密的虚构服务
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprEncryptionClient((serviceProvider, daprEncryptionClientBuilder) => {
    // 从服务提供程序检索 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    // 配置 `DaprEncryptionClientBuilder`
    daprEncryptionClientBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```
