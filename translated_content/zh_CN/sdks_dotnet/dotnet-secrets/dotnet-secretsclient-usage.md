---
type: docs
title: "DaprSecretsManagementClient 用法"
linkTitle: "DaprSecretsManagementClient 用法"
weight: 52900
description: 使用 DaprSecretsManagementClient 的必备技巧与建议
---

## 生命周期管理

`DaprSecretsManagementClient` 是 Dapr 客户端的一个子集，专门用于与 Dapr secrets API 交互。它可以与 `DaprClient` 以及其他 Dapr 客户端一起注册，没有任何问题。

它以 TCP 套接字的形式持有网络资源，用于与 Dapr sidecar 通信，并实现了 `IDisposable`，以支持资源的及时清理。

为获得最佳性能，请创建一个长期存活的 `DaprSecretsManagementClient` 实例，并在整个应用程序中共享访问该实例。`DaprSecretsManagementClient` 实例是线程安全的，设计上即用于共享。

借助依赖注入功能可以实现这一点。注册方法支持以单例、作用域实例或瞬时（即每次注入时都重新创建）的方式注册，还能使用来自 `IConfiguration` 或其他已注入服务的值进行注册，这在每个类中从头创建客户端时是难以做到的。

请避免为每次操作创建一个 `DaprSecretsManagementClient`，并在操作完成后将其释放。

## 通过 DaprSecretsManagementClientBuilder 配置 DaprSecretsManagementClient

可以在调用 `.Build()` 创建客户端之前，通过调用 `DaprSecretsManagementClientBuilder` 类的方法来配置 `DaprSecretsManagementClient`。每个 `DaprSecretsManagementClient` 的设置彼此独立，调用 `.Build()` 之后便无法更改。

```cs
var daprSecretsClient = new DaprSecretsManagementClientBuilder()
    .UseDaprApiToken("abc123") // 指定用于向其他 Dapr sidecar进行身份验证的 API 令牌
    .Build();
```

`DaprSecretsManagementClientBuilder` 包含以下设置项：

- Dapr sidecar的 HTTP 端点
- Dapr sidecar的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于向 sidecar进行请求身份验证的 API 令牌
- 用于创建 SDK 所用 `HttpClient` 实例的工厂方法
- `HttpClient` 实例向 sidecar发送请求时使用的超时时间

SDK 会读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr sidecar的 HTTP 端点，示例：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr sidecar的 gRPC 端点，示例：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则使用此变量查找 Dapr sidecar的本地 HTTP 端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则使用此变量查找 Dapr sidecar的本地 gRPC 端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 对 `CancellationToken` 的取消支持依赖于 gRPC 通道选项的配置。如果你需要自行配置这些选项，请务必启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprSecretsClient = new DaprSecretsManagementClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 使用 DaprSecretsManagementClient 进行取消

`DaprSecretsManagementClient` 上的 API 执行异步操作，并接受一个可选的 `CancellationToken` 参数。这遵循了 .NET 中可取消操作的标准做法。需要注意的是，取消发生时，无法保证远程端点会停止处理该请求，只能保证客户端已停止等待其完成。

操作被取消时，会抛出 `OperationCanceledException`。

## 通过依赖注入配置 DaprSecretsManagementClient

在依赖注入容器中使用内置扩展方法注册 `DaprSecretsManagementClient`，可以带来以下好处：长期存活的服务只需注册一次、复杂的配置可以集中管理，并且在可能的情况下复用同样长期存活的资源（例如 `HttpClient` 实例），从而提升性能。

共提供三种重载，让开发者可以灵活地为其场景配置客户端。每个重载都会在未注册时代为注册 `IHttpClientFactory`，并配置 `DaprSecretsManagementClientBuilder` 在创建 `HttpClient` 实例时使用它，以尽可能复用同一实例，避免套接字耗尽等问题。

第一种方式不需要开发者进行任何配置，`DaprSecretsManagementClient` 使用默认设置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprSecretsManagementClient(); //注册 `DaprSecretsManagementClient`，以便按需注入
var app = builder.Build();
```

有时你需要使用上文详述的各种配置选项来配置所创建的客户端。这可以通过一个传入 `DaprSecretsManagementClientBuilder` 的重载来完成，该重载暴露了用于配置所需选项的方法。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprSecretsManagementClient((_, daprSecretsClientBuilder) => {
   //设置 API 令牌
   daprSecretsClientBuilder.UseDaprApiToken("abc123");
   //指定非标准的 HTTP 端点
   daprSecretsClientBuilder.UseHttpEndpoint("http://dapr.my-company.com");
});

var app = builder.Build();
```

最后，开发者可能需要从另一个服务中获取信息来填充这些配置值。这些值可以来自 `DaprClient` 实例、厂商特定的 SDK，或某个本地服务。只要它同样已在依赖注入中注册，就可以通过最后一个重载注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

//注册一个虚构的服务，用于从某处检索 secrets
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprSecretsManagementClient((serviceProvider, daprSecretsClientBuilder) => {
    //从服务提供者中获取 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    //配置 `DaprSecretsManagementClientBuilder`
    daprSecretsClientBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```

## 链式调用源生成器注册

`AddDaprSecretsManagementClient()` 方法返回一个 `IDaprSecretsManagementBuilder`，可以链式调用由源生成器生成的注册方法。首先，你需要创建一个带有适当装饰的接口：

```cs
[SecretStore("my-vault")]
public partial interface IMyVaultSecrets
{
  /// <summary>
  /// 数据库连接字符串，从 "db-connection-string" secrets 键中检索。
  /// </summary>
  [Secret("db-connection-string")]
  string DatabaseConnection { get; }

  /// <summary>
  /// API 密钥。使用属性名 "ApiKey" 作为 secrets 名称。
  /// </summary>
  string ApiKey { get; }
}
```

由于此接口使用 `[SecretStore]` 特性进行了装饰，并指定了它应使用的 secret store component 名称，源生成器会生成一个可直接链式调用的扩展方法（将接口类型名的约定前缀 “I” 替换为 “Add”）：

```cs
builder.Services.AddDaprSecretsManagementClient()
    .AddMyVaultSecrets()       // 由 IMyVaultSecrets 上的 [SecretStore("my-vault")] 生成
    .AddPaymentSecrets();      // 由另一个强类型接口生成
```

每次调用都会注册该强类型接口、其具体实现，以及一个在启动时预加载 secrets 的 `IHostedService`。

这是启动时的快照，而不是 secret rotation 订阅。不要在宿主启动之前解析生成的接口：其加载器会在加载完成前拒绝访问。当读取属性时，如果映射的键不存在，则会抛出 `KeyNotFoundException`。

生成器会将批量检索返回的**内层字典键**展平到其属性查找中。因此，对于多值 secrets，`[Secret("...")]` 必须指定所需的内层值键，而不一定是外层 secrets 名称。不同 secrets 中重复的内层键会在展平后的快照中发生冲突；当需要保留外层/内层的层级关系时，请改用直接 API。

此后，只需将 `IMyVaultSecrets` 注入到某个类型中，其属性便会通过 Dapr 从你的 secret store 中填充值。

## 理解 API 响应结构

### GetSecretAsync

`GetSecretAsync` 返回 `IReadOnlyDictionary<string, string>`。大多数 secret store 只返回一个键值对，但某些存储（如 Kubernetes）可以为每个 secrets 键保存多个值。字典中的每个条目代表其中一个这样的值。

### GetBulkSecretAsync

`GetBulkSecretAsync` 返回 `IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>>`。外层键是 secrets 名称；内层字典包含一个或多个键值对，表示该 secrets 的数据。

## 错误处理

`DaprSecretsManagementClient` 的方法在与 Dapr sidecar通信时遇到问题，会抛出 `DaprException`。如果参数值非法，则会抛出相应的标准异常（例如 `ArgumentNullException` 或 `ArgumentException`），并附带出错参数的名称。当操作通过 `CancellationToken` 被取消时，会抛出 `OperationCanceledException`。

最常见的失败情况与以下方面有关：

- 参数格式不正确（例如 secret store 名称或键为空）
- 网络问题等瞬时故障
- 指定的 secret store component 未配置或不可用

在上述任何情况下，都可以通过 `.InnerException` 属性查看更多异常详情。
