---
type: docs
title: "DaprStateManagementClient 用法"
linkTitle: "DaprStateManagementClient 用法"
weight: 53100
description: 使用 DaprStateManagementClient 的必备提示与建议
---

## 生命周期管理

`DaprStateManagementClient` 会持有长生命周期的网络资源（gRPC 通道、HTTP 连接）。为获得最佳性能，请注意：

- 注册单个共享实例，并在应用的整个生命周期内复用它。
- 避免为每次操作创建并释放客户端，否则可能导致套接字耗尽。
- 通过 `AddDaprStateManagementClient()` 进行依赖注入注册时，默认使用 `ServiceLifetime.Singleton`，这也是大多数应用推荐的做法。

该客户端是线程安全的，可以在并发请求之间共享。

## 客户端构建器配置

`DaprStateManagementClientBuilder` 继承自 `DaprGenericClientBuilder<DaprStateManagementClient>`，并支持与其他 Dapr .NET 客户端构建器相同的配置接口。

### 构建器方法

| 方法 | 说明 |
|------|------|
| `UseGrpcEndpoint(string)` | 为 Dapr sidecar 设置 gRPC 端点。 |
| `UseHttpEndpoint(string)` | 为 Dapr sidecar 设置 HTTP 端点。 |
| `UseJsonSerializationOptions(JsonSerializerOptions)` | 配置自定义 JSON 序列化选项。 |
| `UseDaprApiToken(string)` | 设置用于对 Dapr sidecar 进行身份验证的 API 令牌。 |
| `UseGrpcChannelOptions(GrpcChannelOptions)` | 提供自定义的 gRPC 通道选项。 |
| `UseTimeout(TimeSpan)` | 配置 HTTP 请求超时。 |

### 环境变量

构建器会自动读取以下环境变量：

| 变量 | 说明 |
|------|------|
| `DAPR_GRPC_ENDPOINT` | Dapr sidecar 的 gRPC 端点地址 |
| `DAPR_HTTP_ENDPOINT` | Dapr sidecar 的 HTTP 端点地址 |
| `DAPR_API_TOKEN` | 用于对 Dapr sidecar 进行身份验证的 API 令牌 |
| `DAPR_GRPC_PORT` | gRPC 端口（当未设置 `DAPR_GRPC_ENDPOINT` 时作为后备） |
| `DAPR_HTTP_PORT` | HTTP 端口（当未设置 `DAPR_HTTP_ENDPOINT` 时作为后备） |

在构建器上显式设置的值优先于环境变量。

## gRPC 通道选项

若要对 gRPC 行为进行精细控制：

```csharp
builder.Services.AddDaprStateManagementClient((sp, clientBuilder) =>
{
    clientBuilder.UseGrpcChannelOptions(new GrpcChannelOptions
    {
        MaxReceiveMessageSize = 16 * 1024 * 1024, // 16 MB
    });
});
```

## 取消令牌

`DaprStateManagementClient` 和 `IDaprStateStoreClient` 上的所有异步方法都接受 `CancellationToken` 参数。传入令牌后，你就可以在超时或用户取消时中止长时间运行的操作：

```csharp
using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

var widget = await client.GetStateAsync<Widget>("statestore", "my-widget",
    cancellationToken: cts.Token);
```

{{% alert title="SDK 1.19.0 中的取消行为" color="warning" %}}
此版本会捕获状态 gRPC 客户端中由调用方发起的取消。单次读取可能返回默认值，批量或查询读取可能返回空结果，条件写入或删除可能返回 `false`，其他写入则可能在未确认远端变更的情况下完成。这些结果不足以证明键不存在、ETag 发生冲突或写入已成功。如果需要区分是否为取消，请在操作之后检查调用方的令牌，并与存储核对不确定的写入结果。取消操作永远无法保证回滚运行时已接受的请求。
{{% /alert %}}

## 依赖注入注册

### 注册重载

`AddDaprStateManagementClient` 方法的签名如下：

```csharp
public static IDaprStateManagementBuilder AddDaprStateManagementClient(
    this IServiceCollection services,
    Action<IServiceProvider, DaprStateManagementClientBuilder>? configure = null,
    ServiceLifetime lifetime = ServiceLifetime.Singleton)
```

返回的 `IDaprStateManagementBuilder` 支持链式注册 typed state store：

```csharp
builder.Services
    .AddDaprStateManagementClient()
    .WithWidgetStore()
    .WithCacheStore();
```

### 链式调用源生成器注册

每个标注了 `[StateStore]` 的接口都会在 `IDaprStateManagementBuilder` 上生成一个扩展方法。这些方法返回 `IDaprStateManagementBuilder`，因此可以自然地链式调用：

```csharp
builder.Services
    .AddDaprStateManagementClient((sp, clientBuilder) =>
    {
        clientBuilder.UseGrpcEndpoint("http://localhost:50001");
    })
    .WithWidgetStore()
    .WithCacheStore()
    .WithUserPreferencesStore();
```

## JSON 序列化

默认情况下，客户端使用 `System.Text.Json` 并采用 `JsonSerializerDefaults.Web`，其提供以下特性：

- 属性名采用 `camelCase` 命名（`PropertyNamingPolicy = JsonNamingPolicy.CamelCase`）
- 属性名匹配不区分大小写（`PropertyNameCaseInsensitive = true`）
- 允许将字符串读取为数字（`NumberHandling = JsonNumberHandling.AllowReadingFromString`）

这些默认值与 `DaprClient` 包保持一致，从而确保**序列化兼容性**：一个客户端写入的数据，另一个客户端可以正确读取。

如需自定义：

```csharp
builder.Services.AddDaprStateManagementClient((sp, clientBuilder) =>
{
    clientBuilder.UseJsonSerializationOptions(new JsonSerializerOptions
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    });
});
```

> **注意：** 更改序列化器设置可能会破坏与之前使用默认设置写入的数据之间的兼容性。自定义时请进行充分测试。

## API 响应结构

### GetStateAsync

`GetStateAsync<TValue>` 返回 `TValue?`。如果存储中不存在该键，则返回 `default(T)`（即引用类型为 `null`）。

### GetStateAndETagAsync

`GetStateAndETagAsync<TValue>` 返回 `(TValue? Value, string? ETag)`。ETag 可传给 `TrySaveStateAsync` 或 `TryDeleteStateAsync`，用于乐观并发控制。

### GetBulkStateAsync

`GetBulkStateAsync<TValue>` 返回 `IReadOnlyList<BulkStateItem<TValue>>`。每个 `BulkStateItem<TValue>` 包含以下属性：

| 属性 | 类型 | 说明 |
|------|------|------|
| `Key` | `string` | 状态键 |
| `Value` | `TValue?` | 反序列化后的值；如果未找到该键，则为 `null` |
| `ETag` | `string` | 用于乐观并发控制的 ETag |

### TrySaveStateAsync / TryDeleteStateAsync

两者都返回 `bool`：操作成功时返回 `true`，ETag 冲突时返回 `false`。在 `1.19.0` 中，调用方取消也可能返回 `false`；在将其视为并发冲突之前，请先检查是否发生了取消。

### QueryStateAsync

`QueryStateAsync<TValue>` 返回 `StateQueryResponse<TValue>`，其包含：

| 属性 | 类型 | 说明 |
|------|------|------|
| `Results` | `IReadOnlyList<StateQueryItem<TValue>>` | 匹配项的列表 |
| `Token` | `string?` | 用于继续查询的分页令牌；没有更多结果时为 `null` |
| `Metadata` | `IReadOnlyDictionary<string, string>` | state store 返回的附加 metadata |

每个 `StateQueryItem<TValue>` 包含：

| 属性 | 类型 | 说明 |
|------|------|------|
| `Key` | `string` | 状态键 |
| `Data` | `TValue?` | 反序列化后的值 |
| `ETag` | `string?` | 该条目的 ETag |
| `Error` | `string?` | 如果无法获取该条目，则为错误消息；成功时为 `null` |

尽管 `StateQueryItem<TValue>` 带有 `Error` 属性，但当运行时返回逐条目的查询错误时，`1.19.0` 客户端会抛出 `DaprException`，而不是返回包含这些失败条目的成功响应。因此，不要依赖此时仍会返回部分结果。

## StateOptions

`StateOptions` 类用于控制单个操作的一致性和并发行为：

```csharp
var options = new StateOptions
{
    Consistency = ConsistencyMode.Strong,
    Concurrency = ConcurrencyMode.FirstWrite,
};

await client.SaveStateAsync("statestore", "my-widget", widget, stateOptions: options);
```

| 属性 | 取值 | 说明 |
|------|------|------|
| `Consistency` | `Eventual`、`Strong` | 控制读取是否反映最新的写入。`null` 表示使用存储的默认值。 |
| `Concurrency` | `FirstWrite`、`LastWrite` | 控制冲突解决方式。`FirstWrite` 在 ETag 不匹配时失败；`LastWrite` 始终覆盖。`null` 表示使用存储的默认值。 |

## 错误处理

`DaprStateManagementClient` 上的方法在运行时失败时会抛出 `DaprException`。无效的参数值会抛出标准异常，例如 `ArgumentNullException` 或 `ArgumentException`。调用方取消的行为因版本而异，如上文所述。

最常见的失败情况包括：

- 参数格式不正确（例如存储名或键为空）
- 网络问题等临时性故障
- 指定的 state store component 未配置或不可用
- 使用乐观并发控制时的 ETag 不匹配（对于 `TrySaveStateAsync` 和 `TryDeleteStateAsync`，它们返回 `false` 而不是抛出异常）

在上述任一情况下，都可以通过 `.InnerException` 属性查看更多异常详情。

## 从 DaprClient 迁移

如果你要从 `DaprClient` 的 State Management 方法迁移到新的 `Dapr.StateManagement` 包，请注意以下几点：

- API 接口非常相似。`GetStateAsync`、`SaveStateAsync`、`DeleteStateAsync`、`GetBulkStateAsync` 和 `ExecuteStateTransactionAsync` 等方法都存在，且语义相同。
- 默认的 JSON 序列化设置（`JsonSerializerDefaults.Web`）完全相同，因此由 `DaprClient` 写入的数据与 `DaprStateManagementClient` 完全兼容，反之亦然。
- 新包还提供了 `IDaprStateStoreClient` 和 `[StateStore]` 源生成器，用于强类型、按存储划分范围的访问。这样可以减少样板代码，并免去在调用处书写存储名字符串。
- `DaprStateManagementClient` 与 `DaprClient` 分别注册。在逐步迁移期间，两者可以在同一应用中共存。

### 仍保留在 DaprClient 上的 API

专用客户端的公共接口仅提供强类型的状态访问，不提供以下 `DaprClient` 辅助方法：

| 旧版方法 | 用途 |
| --- | --- |
| `SaveByteStateAsync`、`TrySaveByteStateAsync` | 保存已编码的字节，可选择以 ETag 为条件。 |
| `GetByteStateAsync`、`GetByteStateAndETagAsync` | 读取原始状态字节，可选择同时返回 ETag。 |
| 非泛型 `GetBulkStateAsync` | 批量读取条目，但不将值反序列化为应用程序类型。 |
| `GetStateEntryAsync<T>` | 返回一个 `StateEntry<T>`，其中跟踪值、键/存储以及 ETag，用于保存/删除辅助操作。 |

在需要这些 API 的场景中请使用 `DaprClient`；不要假设将 `byte[]` 代入 JSON 泛型方法就能保留原始字节。JSON 序列化会对字节数组进行编码，而不是绕过序列化。对于大文件和分块流式传输，请改用独立的 [Binary Store]({{< ref dotnet-binarystore >}}) building block，而不要把文件内容缓冲在状态中。

```csharp
await legacyClient.SaveByteStateAsync("statestore", "encoded-record", encodedBytes,
    cancellationToken: cancellationToken);
var (bytes, etag) = await legacyClient.GetByteStateAndETagAsync(
    "statestore", "encoded-record", cancellationToken: cancellationToken);
```

两类客户端使用的类型也位于不同的 namespace 中。专用的状态操作使用 `Dapr.StateManagement` 中的选项与操作模型；旧版 API 则使用 `Dapr.Client` 中对应的类型。迁移时，请同时检查类型和方法名；若两者同时使用，请为重名的类型加上 namespace 限定。
