---
type: docs
title: "DaprJobsClient 使用"
linkTitle: "DaprJobsClient 使用"
weight: 59000
description: 使用 DaprJobsClient 的基本技巧和建议
---

## 生命周期管理

`DaprJobsClient` 是 Dapr 客户端的一个专用版本，专门用于与 Dapr Jobs API 交互。它可以与 `DaprClient` 及其他 Dapr 客户端一起注册，不会有任何问题。

它通过 TCP 套接字维护与 Dapr sidecar 通信所需的网络资源，并实现 `IDisposable`，以支持资源的及时清理。

为获得最佳性能，请创建一个长生命周期的 `DaprJobsClient` 实例，并在整个应用程序中共享访问该实例。`DaprJobsClient` 实例是线程安全的，专为共享而设计。

依赖注入功能可以辅助实现这一点。注册方法支持以单例、作用域实例或瞬态（即每次注入时都会重新创建）的方式注册，还支持使用来自 `IConfiguration` 或其他已注入服务的值进行注册。而如果在每个类中从头创建客户端，这种做法并不现实。

请避免为每次操作创建一个 `DaprJobsClient`，并在操作完成后将其释放。

## 通过 DaprJobsClientBuilder 配置 DaprJobsClient

可以在调用 `.Build()` 创建客户端之前，通过调用 `DaprJobsClientBuilder` 类上的方法来配置 `DaprJobsClient`。每个 `DaprJobsClient` 的设置彼此独立，并且在调用 `.Build()` 之后无法更改。

```cs
var daprJobsClient = new DaprJobsClientBuilder()
    .UseDaprApiToken("abc123") // 指定用于向其他 Dapr sidecar 进行身份验证的 API 令牌
    .Build();
```

`DaprJobsClientBuilder` 包含以下设置：

- Dapr sidecar 的 HTTP 端点
- Dapr sidecar 的 gRPC 端点
- 用于配置 JSON 序列化的 `JsonSerializerOptions` 对象
- 用于配置 gRPC 的 `GrpcChannelOptions` 对象
- 用于对发送到 sidecar 的请求进行身份验证的 API 令牌
- 用于创建 SDK 所用 `HttpClient` 实例的工厂方法
- 向 sidecar 发出请求时，`HttpClient` 实例所使用的超时时间

SDK 会读取以下环境变量来配置默认值：

- `DAPR_HTTP_ENDPOINT`：用于查找 Dapr sidecar 的 HTTP 端点，例如：`https://dapr-api.mycompany.com`
- `DAPR_GRPC_ENDPOINT`：用于查找 Dapr sidecar 的 gRPC 端点，例如：`https://dapr-grpc-api.mycompany.com`
- `DAPR_HTTP_PORT`：如果未设置 `DAPR_HTTP_ENDPOINT`，则用于查找 Dapr sidecar 的 HTTP 本地端点
- `DAPR_GRPC_PORT`：如果未设置 `DAPR_GRPC_ENDPOINT`，则用于查找 Dapr sidecar 的 gRPC 本地端点
- `DAPR_API_TOKEN`：用于设置 API 令牌

### 配置 gRPC 通道选项

Dapr 使用 `CancellationToken` 进行取消操作，这依赖于 gRPC 通道选项的配置。如果你需要自行配置这些选项，请确保启用 [ThrowOperationCanceledOnCancellation 设置](https://grpc.github.io/grpc/csharp-dotnet/api/Grpc.Net.Client.GrpcChannelOptions.html#Grpc_Net_Client_GrpcChannelOptions_ThrowOperationCanceledOnCancellation)。

```cs
var daprJobsClient = new DaprJobsClientBuilder()
    .UseGrpcChannelOptions(new GrpcChannelOptions { ThrowOperationCanceledOnCancellation = true })
    .Build();
```

## 在 `DaprJobsClient` 中使用取消

`DaprJobsClient` 上的 API 执行异步操作，并接受一个可选的 `CancellationToken` 参数。这遵循 .NET 中可取消操作的标准做法。请注意，取消发生时，无法保证远程端点会停止处理请求，只能保证客户端已停止等待完成。

请为有时限要求的调用传递取消令牌。在 SDK `1.19.0` 中，调度、删除和列出操作会捕获调用方发起的取消：写入类方法可能在未确认变更的情况下就已返回，列出操作则可能返回空列表。`GetJobAsync` 在取消后可能抛出 `DaprException`。因此，不要依赖每个 job 操作都会抛出 `OperationCanceledException`，也不要把被取消的调用理解为 job 已创建或已删除的确认。当结果很重要时，请检查令牌，并与运行时核对结果。

## 通过依赖注入配置 `DaprJobsClient`

使用内置的扩展方法在依赖注入容器中注册 `DaprJobsClient`，可以只注册一次长生命周期服务、集中管理复杂的配置，并通过尽可能复用同样长生命周期的资源（例如 `HttpClient` 实例）来提高性能。

这里提供三种重载，以便开发人员根据自己的场景灵活配置客户端。每种重载在尚未注册 `IHttpClientFactory` 时都会代为注册，并使 `DaprJobsClientBuilder` 在创建 `HttpClient` 实例时使用它，从而尽量复用同一实例，避免套接字耗尽等问题。

第一种方式无需开发人员进行任何配置，`DaprJobsClient` 使用默认设置。

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient(); // 注册 `DaprJobsClient`，以便按需注入
var app = builder.Build();
```

> `AddDaprJobsClient()` 还会注册 gRPC `AppCallbackAlpha` 回调服务，并为 Kestrel 配置 HTTP/1 + HTTP/2，使 sidecar 无需任何额外设置即可通过 HTTP 或 gRPC 投递 job 触发事件。

有时开发人员需要使用上文详述的各种配置选项来配置所创建的客户端。这可以通过一个重载来完成，该重载传入 `DaprJobsClientBuilder`，并公开用于配置所需选项的方法。

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

最后，开发人员可能需要从其他服务获取信息来填充这些配置值。该值可能来自 `DaprClient` 实例、某个厂商专用的 SDK，或某个本地服务。只要它已在 DI 中注册，就可以通过最后一个重载注入到此配置操作中：

```cs
var builder = WebApplication.CreateBuilder(args);

// 注册一个从某处获取机密的虚构服务
builder.Services.AddSingleton<SecretService>();

builder.Services.AddDaprJobsClient((serviceProvider, daprJobsClientBuilder) => {
    // 从服务提供程序中获取 `SecretService` 的实例
    var secretService = serviceProvider.GetRequiredService<SecretService>();
    var daprApiToken = secretService.GetSecret("DaprApiToken").Value;

    // 配置 `DaprJobsClientBuilder`
    daprJobsClientBuilder.UseDaprApiToken(daprApiToken);
});

var app = builder.Build();
```

## 理解 DaprJobsClient 上的负载序列化

虽然 `DaprClient` 上有许多方法会使用 `System.Text.Json` 序列化器自动序列化和反序列化数据，但此 SDK 采用了不同的思路。相关方法接受一个可选的 `ReadOnlyMemory<byte>` 负载，这意味着序列化由开发人员自行负责，通常不由 SDK 处理。

对于可 JSON 序列化的值，请使用 `Dapr.Jobs.Extensions` 中的 `ScheduleJobWithPayloadAsync`。它接受一个 `DaprJobSchedule`、一个 `object` 类型的负载，以及可选的 `JsonSerializerOptions`。为方便起见，它会自动将该值转换为 UTF-8 编码的字节。以下是调度 Cron 表达式时的示例：

```cs
public sealed record Doodad (string Name, int Value);

//...
var doodad = new Doodad("Thing", 100);
await daprJobsClient.ScheduleJobWithPayloadAsync(
    "myJob", DaprJobSchedule.FromExpression("5 * * * *"), doodad);
```

同理，如果你有一个纯字符串值，可以使用同一方法的另一个重载来序列化字符串类型的负载。此时会跳过 JSON 序列化步骤，只将其编码为 UTF-8 字节数组。以下是调度一次性 job 时的示例：

```cs
var now = DateTimeOffset.UtcNow;
var oneWeekFromNow = now.AddDays(7);
await daprJobsClient.ScheduleJobWithPayloadAsync(
    "myOtherJob", DaprJobSchedule.FromDateTime(oneWeekFromNow), "This is a test!");
```

处理 job 调用的委托至少需要存在两个参数：
- 一个 `string`，其中填充了 `jobName`，用于提供被调用 job 的名称
- 一个 `ReadOnlyMemory<byte>`，其中填充了 job 注册时最初提供的字节

反序列化时，请使用与调度时相同的格式。对于 JSON，请使用 `JsonSerializer.Deserialize<T>(jobPayload.Span, options)` 并配合相匹配的序列化选项；对于 UTF-8 文本，请使用 `Encoding.UTF8.GetString`。客户端不会推断负载的类型或编码。

要将字节反序列化为字符串，可以使用以下辅助方法：
```cs
var payloadAsString = Encoding.UTF8.GetString(jobPayload.Span); // 如果成功，将返回包含该值的字符串
```

## 错误处理

`DaprJobsClient` 会将运行时或 gRPC 失败包装为 `DaprException`。无效的参数值会抛出标准异常，例如 `ArgumentOutOfRangeException` 或 `ArgumentNullException`。

最常见的失败情况与以下方面有关：

- 与 Jobs API 交互时参数格式不正确
- 瞬时故障，例如网络问题
- 无效数据，例如无法将值反序列化回最初序列化时所用的类型

在上述任何一种情况下，都可以通过 `.InnerException` 属性查看更多异常详情。
