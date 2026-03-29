---
type: docs
title: "DaprJobsClient 使用"
linkTitle: "DaprJobsClient 使用"
weight: 59000
description: 使用 DaprJobsClient 的基本技巧和建议
---

## 生命周期管理

`DaprJobsClient` 是 Dapr 客户端的一个专用版本，专门用于与 Dapr Jobs API 交互。它可以与 `DaprClient` 及其他 Dapr 客户端一起注册，不会有任何问题。

它维护用于与 Dapr 边车通信的 TCP 套接字形式的网络资源访问，并实现 `IDisposable` 以支持资源的即时清理。

为了获得最佳性能，请创建一个单一的长生命周期 `DaprJobsClient` 实例，并在整个应用程序中提供对该共享实例的访问。`DaprJobsClient` 实例是线程安全的，旨在被共享。

这可以通过利用依赖注入功能来辅助实现。注册方法支持注册为单例、作用域实例或瞬态（意味着每次注入时都会重新创建），但还支持注册以利用来自 `IConfiguration` 或其他注入服务的值，这在每个类中从头开始创建客户端时是不切实际的。

避免为每次操作创建一个 `DaprJobsClient` 并在操作完成时将其释放。

## 通过 DaprJobsClientBuilder 配置 DaprJobsClient

可以通过在调用 `.Build()` 创建客户端本身之前调用 `DaprJobsClientBuilder` 类上的方法来配置 `DaprJobsClient`。每个 `DaprJobsClient` 的设置是独立的，在调用 `.Build()` 后无法更改。

```cs
var daprJobsClient = new DaprJobsClientBuilder()
    .UseDaprApiToken("abc123") // 指定用于向其他 Dapr 边车进行身份验证的 API 令牌
    .Build();
```

`DaprJobsClientBuilder` 包含以下设置：

- Dapr 边车的 HTTP 端点
- Dapr 边车的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于对边车请求进行身份验证的 API 令牌
- 用于创建 SDK 使用的 `HttpClient` 实例的工厂方法
- SDK 在向边车发出请求时 `HttpClient` 实例使用的超时时间

SDK 将读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr 边车的 HTTP 端点，例如：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr 边车的 gRPC 端点，例如：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr 边车的 HTTP 本地端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr 边车的 gRPC 本地端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消依赖于 gRPC 通道选项的配置。如果您需要自己配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprJobsClient = new DaprJobsClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ... ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 在 DaprJobsClient 中使用取消操作

`DaprJobsClient` 上的 API 执行异步操作并接受一个可选的 `CancellationToken` 参数。这遵循 .NET 可取消操作的标准实践。请注意，当取消发生时，无法保证远程端点停止处理请求，只能保证客户端已停止等待完成。

当操作被取消时，它将抛出 `OperationCancelledException`。

## 通过依赖注入配置 DaprJobsClient

使用内置的扩展方法在依赖注入容器中注册 `DaprJobsClient` 可以带来以下好处：只需一次注册长生命周期服务、集中化复杂配置，并通过在可能的情况下重新使用类似的长生命周期资源（例如 `HttpClient` 实例）来提高性能。

提供了三种重载，以便开发人员为其场景配置客户端时具有最大的灵活性。如果尚未注册 `IHttpClientFactory`，每种方法都会代表您注册它，并配置 `DaprJobsClientBuilder` 在创建 `HttpClient` 实例时使用它，以便尽可能重复使用相同的实例，并避免套接字耗尽和其他问题。

在第一种方法中，开发人员不进行任何配置，`DaprJobsClient` 使用默认设置进行配置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient(); // 注册 `DaprJobsClient` 以便按需注入
var app = builder.Build();
```

有时开发人员需要使用上面详述的各种配置选项来配置创建的客户端。这是通过传入 `DaprJobsClientBuilder` 的重载来完成的，该重载公开了用于配置必要选项的方法。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient((_, daprJobsClientBuilder) => {
   // 设置 API 令牌
   daprJobsClientBuilder.UseDaprApiToken("abc123");
   // 指定非标准的 HTTP 端点
   daprJobsClientBuilder.UseHttpEndpoint("http://dapr.my-company.com");
});

var app = builder.Build();
```

最后，开发人员可能需要从另一个服务检索信息以填充这些配置值。该值可能来自 `DaprClient` 实例、特定于供应商的 SDK 或某些本地服务，但只要它也在 DI 中注册，就可以通过最后一个重载注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

// 注册一个从某处检索机密的虚构服务
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprJobsClient((serviceProvider, daprJobsClientBuilder) => {
    // 从服务提供程序检索 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    // 配置 `DaprJobsClientBuilder`
    daprJobsClientBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```

## 理解 DaprJobsClient 上的负载序列化

虽然 `DaprClient` 上有许多方法可以使用 `System.Text.Json` 序列化程序自动序列化和反序列化数据，但此 SDK 采用不同的理念。相反，相关方法接受一个可选的 `ReadOnlyMemory<byte>` 负载，这意味着序列化是留给开发人员的练习，通常不由 SDK 处理。

也就是说，对于每种调度方法，都有一些辅助扩展方法可用。如果您知道要使用可 JSON 序列化的类型，可以对每种调度类型使用 `Schedule*WithPayloadAsync` 方法，该方法接受一个 `object` 作为负载，并接受一个可选的 `JsonSerializerOptions` 在序列化值时使用。为了方便起见，这将把值转换为 UTF-8 编码的字节。这是调度 Cron 表达式时的示例：

```cs
public sealed record Doodad (string Name, int Value);

//...
var doodad = new Doodad("Thing", 100);
await daprJobsClient.ScheduleCronJobWithPayloadAsync("myJob", "5 * * * *", doodad);
```

同样，如果您有一个纯字符串值，可以使用同一方法的重载来序列化字符串类型的负载，将跳过 JSON 序列化步骤，并且只会编码为 UTF-8 编码的字节数组。这是调度一次性作业时的示例：

```cs
var now = DateTime.UtcNow;
var oneWeekFromNow = now.AddDays(7);
await daprJobsClient.ScheduleOneTimeJobWithPayloadAsync("myOtherJob", oneWeekFromNow, "This is a test!");
```

处理作业调用的委托期望至少存在两个参数：
- 一个填充了 `jobName` 的 `string`，提供被调用作业的名称
- 一个填充了作业注册期间最初提供的字节的 `ReadOnlyMemory<byte>`

由于负载存储为 `ReadOnlyMemory<byte>`，开发人员可以自由地序列化和反序列化，但同样包含两个辅助扩展，可以将其反序列化为 JSON 兼容类型或字符串。两种方法都假定开发人员对最初调度的作业进行了编码（可能使用了辅助序列化方法），因为这些方法不会强制字节表示它们不是的内容。

要将字节反序列化为字符串，可以使用以下辅助方法：
```cs
var payloadAsString = Encoding.UTF8.GetString(jobPayload.Span); // 如果成功，则返回包含值的字符串
```

## 错误处理

如果在 SDK 和运行在 Dapr 边车上的 Jobs API 服务之间遇到问题，`DaprJobsClient` 上的方法将抛出 `DaprJobsServiceException`。如果由于通过此 SDK 向 Jobs API 服务发出的格式错误的请求而导致失败，将抛出 `DaprMalformedJobException`。在非法参数值的情况下，将抛出相应的标准异常（例如 `ArgumentOutOfRangeException` 或 `ArgumentNullException`）以及违规参数的名称。对于其他任何情况，将抛出 `DaprException`。

最常见的失败情况与以下内容相关：

- 与 Jobs API 交互时参数格式不正确
- 瞬态故障，例如网络问题
- 无效数据，例如无法将值反序列化回最初未序列化的类型

在任何这些情况下，您都可以通过 `.InnerException` 属性检查更多异常详细信息。
