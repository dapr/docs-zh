---
type: docs
title: "Dapr 向量客户端"
linkTitle: "向量客户端"
weight: 55100
description: 配置 DaprVectorClient、解读相似度分数、处理批量结果，并生成类型化的集合客户端
---

`Dapr.Vector` 中的 `DaprVectorClient` 通过 gRPC 实现 Alpha 阶段的向量 API。请使用 .NET SDK 1.19.0 或更高版本，并搭配支持向量的 Dapr 运行时和组件。发布要求请参阅[概述]({{% ref dotnet-vector %}})，完整的集合生命周期请参阅[操作指南]({{% ref dotnet-vector-howto.md %}})。

## 客户端生命周期与配置

请复用长生命周期的客户端。依赖注入默认将其注册为单例，并在容器释放时一并释放：

```csharp
using Dapr.Vector.Extensions;

builder.Services.AddDaprVectorClient((serviceProvider, clientBuilder) =>
{
    clientBuilder.UseGrpcEndpoint("http://localhost:50001");
});
```

回调可以通过 `serviceProvider` 解析配置或其他服务。可选的 `lifetime` 参数支持其他 `ServiceLifetime` 值。

不使用依赖注入时，需要自行创建并释放实例：

```csharp
using Dapr.Vector;

using var client = new DaprVectorClientBuilder()
    .UseGrpcEndpoint("http://localhost:50001")
    .Build();
```

构建器接受可选的 `IConfiguration`。默认值来自 `DAPR_GRPC_ENDPOINT`；若未设置，则使用本地端点，端口由 `DAPR_GRPC_PORT` 指定（默认 50001）。边车认证使用 `DAPR_API_TOKEN`。显式设置的构建器选项优先于默认值；若要覆盖令牌，请使用 `UseDaprApiToken`。

使用 `UseJsonSerializationOptions` 配置负载序列化，使用 `UseGrpcChannelOptions` 配置 gRPC 选项。替换通道选项时，请保留 `ThrowOperationCanceledOnCancellation = true`。共享的 HTTP 端点、HTTP 客户端工厂和 HTTP 超时设置不会让向量操作改用 HTTP，也不会为每次 RPC 设定截止时间。应使用带时限的 `CancellationToken` 限制调用方的等待时间，而不是 `UseTimeout`。

## API 覆盖范围

每个操作都接受可选的组件特定请求 `metadata` 参数（`IReadOnlyDictionary<string, string>`）以及 `CancellationToken`。

| 操作 | 结果 |
| --- | --- |
| `CreateCollectionAsync` | 使用正数 `uint` 维度和可选的距离度量创建集合。 |
| `GetCollectionAsync` | 返回 `VectorCollection`，包含 `Collection`、近似的 `RecordCount`、`Properties`、`Dimensions` 以及生效的 `Metric`。 |
| `ListCollectionsAsync` | 返回组件中的集合名称。 |
| `DeleteCollectionAsync` | 删除集合及其中的记录。 |
| `UpsertVectorsAsync<T>` | 返回包含 `Ack` 和 `FailedItems` 的 `UpsertVectorsResult`。 |
| `GetVectorsAsync<T>` | 按请求顺序返回找到的 `VectorRecord<T>` 条目；`includeValues` 默认为 false。 |
| `DeleteVectorsAsync` | 返回删除操作的 `IndexAck`。 |
| `QueryVectorsAsync<T>` | 返回 `VectorQueryResult<T>`，其中 `Matches` 是 `VectorMatch<T>` 列表，每项包含 `Record` 和 `Score`；另有生效的 `Metric`。 |
| `BatchQueryVectorsAsync<T>` | 返回有序的 `VectorBatchQueryResult<T>` 条目，每个条目包含一个响应或一个错误。 |

请求元数据用于配置操作，与每条记录可过滤的结构化 `Metadata` 相互独立。该 Alpha 阶段客户端不提供嵌入向量生成 API、词法与向量混合查询，也不支持延续令牌分页。请在应用中自行生成嵌入向量，并单独使用搜索功能执行词法查询。

## 距离度量与查询选项

| `DistanceMetric` | 含义 |
| --- | --- |
| `Unspecified` | 创建集合时使用组件默认值；查询时使用集合的度量。 |
| `Cosine` | 余弦相似度，取值范围为 `[-1, 1]`；值越大越接近。 |
| `DotProduct` | 未归一化的点积；值越大越接近。 |
| `Euclidean` | 欧氏距离；值越小越接近。 |

`ScoreThreshold` 包含边界值：余弦和点积匹配的分数必须**不低于**该阈值；欧氏距离匹配的分数必须**不高于**该阈值。分数不会被换算为归一化的相关性百分比。请结合每个响应中生效的 `Metric` 解读结果。在组件支持的情况下，查询可以请求覆盖度量；不支持的度量会被拒绝，而不会被静默替换。

| `VectorQuery` 属性 | 行为 |
| --- | --- |
| `Vector` | 非空的 `IReadOnlyList<float>` 查询嵌入向量。与 `ById` 互斥。 |
| `ById` | 非空的已存储记录 ID，其嵌入向量将用作查询向量。必须且只能指定一个查询来源。 |
| `TopK` | 可为空的 `uint` 类型，表示最多返回的匹配数；为 null 或 0 时使用组件默认值。 |
| `Filter` | 可移植的 JSON 对象过滤器，用于匹配记录元数据，支持点号路径。 |
| `IncludeValues` | 为 null 或 false 时省略嵌入向量值；返回的 `Values` 为空。 |
| `IncludePayload` | 为 null 或 false 时省略负载；返回的 `Payload` 为 `default(T)`。 |
| `Metric` | 请求的度量，默认为 `Unspecified`。 |
| `ScoreThreshold` | 可选的包含边界的阈值，与该度量的取值范围一致。 |

过滤器支持 `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte`、`$in`、`$nin`、`$exists`、`$and`、`$or` 和 `$not`。同一对象中的多个条件之间为逻辑与（AND）关系。例如：

```csharp
using System.Text.Json;
using Dapr.Vector;

var query = new VectorQuery
{
    Vector = [1, 0, 0],
    Filter = JsonSerializer.Deserialize<JsonElement>(
        """{"category":"books","dealer.city":{"$in":["Seattle","Portland"]}}"""),
    TopK = 10,
    Metric = DistanceMetric.Cosine,
    IncludePayload = true
};
```

过滤器针对的是记录元数据，而不是负载属性。元数据和过滤器都必须是 JSON 对象。限制条件请参阅[组件规范]({{% ref supported-vector %}})，过滤语言请参阅[过滤语言]({{% ref "vector-overview.md#filter-language" %}})。

## 负载序列化

`VectorRecord<T>` 将可选的负载与嵌入向量和元数据分开存储。大多数负载类型默认使用 `System.Text.Json` 和 `JsonSerializerDefaults.Web`；客户端会将返回的负载反序列化为读取或查询调用所选的 `T`。请使用兼容的类型；若 JSON 结构不固定，可使用 `JsonElement`。

对于不透明的二进制负载，请使用 **`byte[]` 作为泛型类型**。SDK 会原样传输这些字节，而不是进行 JSON/base64 序列化：

```csharp
var write = await client.UpsertVectorsAsync<byte[]>(
    "vectorstore", "products",
    [new("binary", [1, 0, 0], new byte[] { 0, 255, 128 })],
    new IndexingOptions
    {
        Mode = IndexingMode.WaitForCompletion,
        WaitTimeout = TimeSpan.FromSeconds(10),
        OnWaitTimeout = IndexingWaitTimeoutAction.FailRequest
    });

foreach (var failure in write.FailedItems)
{
    Console.Error.WriteLine($"{failure.Id}: {failure.ErrorMessage}");
}

if (write.FailedItems.Count != 0 || write.Ack != IndexAck.Completed)
{
    throw new InvalidOperationException("The binary record was not confirmed written.");
}

var records = await client.GetVectorsAsync<byte[]>(
    "vectorstore", "products", ["binary"], includeValues: true);
```

使用 `GetVectorsAsync<byte[]>` 或 `QueryVectorsAsync<byte[]>`（需设置 `IncludePayload = true`）即可读回字节。缺失的二进制负载为 null，而存在但为空的负载仍是空字节数组。这种原始字节行为仅适用于 `T = byte[]`，不适用于任意内存类型，也不适用于以 `object` 形式传入的 `byte[]`。

若要使用源生成的 JSON 序列化，请配置一个覆盖负载类型的上下文，例如操作指南中的 `Product` 记录：

```csharp
using System.Text.Json.Serialization;
using Dapr.Vector.Extensions;

builder.Services.AddDaprVectorClient((_, clientBuilder) =>
    clientBuilder.UseJsonSerializationOptions(ProductJsonContext.Default.Options));

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(Product))]
internal partial class ProductJsonContext : JsonSerializerContext
{
}
```

类型化集合生成器不会生成 JSON 序列化元数据。若需要无反射的负载序列化，请单独配置；不透明的 `byte[]` 负载会绕过 JSON 序列化器。

## 写入确认与部分失败

向量的 Upsert 和记录删除操作接受 `Dapr.Vector.IndexingOptions`。它们的行为与[搜索写入选项]({{% ref "dotnet-search-client-usage.md#write-acknowledgements" %}})相同，但属于 `Dapr.Vector` 命名空间中的不同类型。

省略选项时使用 `ReturnOnAcceptance`。`IndexAck.Queued` 表示操作已被接受，但不代表已成功或可查询。`WaitForCompletion` 要求设置正数的 `WaitTimeout` 和明确的 `OnWaitTimeout`。若等待超时，`ContinueAsync` 会返回 `Queued`，并且需要支持排队确认；`FailRequest` 会抛出 `DeadlineExceeded`，但提供方的写入工作仍可能完成。在接受模式下使用等待相关字段无效。

等待超时必须小于 RPC 剩余的截止时间，并且必须比存储弹性策略的超时时间至少留出 10% 且不少于 100 毫秒的余量。它是提供方的等待上限，而不是应用的取消截止时间。

请同时检查 `UpsertVectorsResult.Ack` 和 `FailedItems`。每个 `VectorFailedItem` 包含 `Id`、规范的数字 `ErrorCode`、`ErrorMessage`，以及原始的 protobuf 错误 `Details`（`TypeUrl` 和 `Value`）。已完成的批量操作仍可能存在单条失败。SDK 将维度和值的校验交由运行时或组件处理，因此无效记录可以单独失败，而不会丢弃有效记录。在排队边界处，只返回已知的失败项；该客户端没有最终结果轮询 API。

若同时使用搜索与向量功能，请为 `IndexingOptions`、`IndexingMode`、`IndexingWaitTimeoutAction` 和 `IndexAck` 添加限定名或别名，以避免名称冲突。

## 批量查询错误

`BatchQueryVectorsAsync<T>` 使用共享的请求元数据，针对一个组件和一个集合提交查询。结果保持查询顺序，且每个结果恰好只有一个已填充的属性：

- `Response`：包含匹配项和生效度量的 `VectorQueryResult<T>`。
- `Error`：`VectorQueryError`，包含规范的数字 `Code`、`Message`，以及保留的 protobuf `Details`。

即使其他查询已成功，也要逐个检查每个结果。[批量示例]({{% ref "dotnet-vector-howto.md#query-by-stored-id-and-in-batches" %}})演示了两种结果。

本地参数校验在发送 RPC 之前对整个批次进行。若查询未指定任何来源、同时指定了两个来源、向量为空、ID 为空白、过滤器不是 JSON 对象，或度量无效，则会直接抛出异常，而不会作为单个查询的结果返回。有效查询在运行时求值时失败（例如存储 ID 不存在）时，可在其自身位置返回错误。整个请求范围的 RPC 失败会抛出 `DaprException`。

## 生成类型化的集合客户端

`Dapr.Vector` 包内置了源生成器。请定义一个顶层、非泛型、非文件局部的 `partial` 接口，它恰好继承一个 `IDaprVectorCollection<T>`，且不包含额外的抽象成员：

```csharp
using Dapr.Vector;

[VectorCollection("vectorstore", "products")]
public partial interface IProductVectors : IDaprVectorCollection<Product>
{
}
```

组件名和集合名都不能为空。请在底层客户端之后注册生成的包装器：

```csharp
builder.Services.AddDaprVectorClient().AddProductVectors();
```

`AddProductVectors` 以接口名去掉开头的 `I` 后命名。注入该接口即可查询，无需重复指定组件、集合或负载类型：

```csharp
public sealed class RecommendationService(IProductVectors products)
{
    public Task<VectorQueryResult<Product>> FindAsync(
        IReadOnlyList<float> embedding, CancellationToken cancellationToken) =>
        products.QueryVectorsAsync(
            new VectorQuery { Vector = embedding, TopK = 5, IncludePayload = true },
            cancellationToken: cancellationToken);
}
```

包装器暴露所有集合级操作，包括创建（仍需指定维度，并可接受可选的度量）、写入、读取、单条与批量查询以及删除。面向整个存储的 `ListCollectionsAsync` 仍保留在 `DaprVectorClient` 上。包装器会转发元数据、选项和取消标记，沿用客户端注册时的生命周期，并且不会释放该客户端。仅完成注册不会创建集合。

无效的声明、绑定或契约分别会产生构建错误 `DAPR1901`、`DAPR1902` 或 `DAPR1903`。

## 取消与错误

RPC 失败会抛出 `DaprException`，其 `InnerException` 为原始的 `Grpc.Core.RpcException`；排查提供方或运行时错误时，请检查其 `StatusCode` 和尾部元数据（trailers）。参数校验错误和 JSON 序列化错误与 RPC 失败不同。批量查询错误和 Upsert 条目失败会通过结果模型返回，而不会作为整个请求的错误抛出。

每个操作都接受 `CancellationToken`。调用方取消可能抛出 `OperationCanceledException`，但并不保证数据库已停止处理写入。请通过 Dapr [弹性策略]({{% ref "vector-overview.md#error-reporting-and-resiliency" %}})配置重试和超时策略。
