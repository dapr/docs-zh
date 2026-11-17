---
type: docs
title: "操作指南：在 Dapr .NET SDK 中存储和查询向量"
linkTitle: "操作指南：查询向量"
weight: 55050
description: "创建集合、存储类型化的向量记录、查询嵌入向量，并处理批量结果，使用 Dapr.Vector"
---

使用 `DaprVectorClient` 存储预先计算好的嵌入向量，并通过 Dapr 向量 component 检索相似记录。为便于阅读，本指南使用三维向量；实际的嵌入向量必须与你的模型维度一致。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}}) 以及一个[已初始化的 Dapr environment]({{% ref install-dapr-selfhost.md %}})
- [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、[.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或 [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- 支持向量功能的 Dapr runtime 1.19 或更高版本
- [Dapr.Vector](https://www.nuget.org/packages/Dapr.Vector) NuGet 包，版本 1.19.0 或更高版本

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。两者的支持将在 Dapr v1.20 中移除；仅 .NET 10 和 .NET 11 将支持至 2027 年底。
{{% /alert %}}

在 ASP.NET Core 项目中安装该包：

```sh
dotnet add package Dapr.Vector
```

[向量 SDK 概览]({{% ref dotnet-vector %}}) 介绍了 alpha 的 API 与发布要求。

## 配置向量 component

在应用目录中创建 `components\vectorstore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vectorstore
spec:
  type: vector.in-memory
  version: v1
  metadata:
  - name: indexingDelay
    value: "0s"
```

[in-memory component]({{% ref "/reference/components-reference/supported-vector/in-memory.md" %}}) 不需要外部数据库。数据会随 sidecar 停止而丢失，且不会在多个 sidecar 之间共享。生产环境请使用受支持的持久化[向量 component]({{% ref supported-vector %}})。

## 注册并解析客户端

在 `Program.cs` 中添加以下内容：

```csharp
using Dapr.Vector;
using Dapr.Vector.Extensions;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprVectorClient();

var app = builder.Build();
var client = app.Services.GetRequiredService<DaprVectorClient>();
```

将其余操作代码片段放在此代码之后，然后在 `Program.cs` 末尾调用 `app.Run();`。在 `Product.cs` 中创建负载类型：

```csharp
public sealed record Product(string Title);
```

使用 sidecar 运行应用：

```sh
dapr run --app-id vector-example --resources-path .\components -- dotnet run
```

客户端从配置或环境变量中读取端点和 API 令牌，并使用 gRPC。它独立于 `DaprClient`，不需要调用 `AddDaprClient()`。

## 创建并查看集合

```csharp
const string storeName = "vectorstore";
const string collectionName = "products";

await client.CreateCollectionAsync(
    storeName, collectionName, dimensions: 3, metric: DistanceMetric.Cosine);

var info = await client.GetCollectionAsync(storeName, collectionName);
Console.WriteLine($"{info.Collection}: {info.Dimensions} dimensions, {info.Metric}");
Console.WriteLine($"Approximately {info.RecordCount} records");

var collections = await client.ListCollectionsAsync(storeName);
Console.WriteLine(string.Join(", ", collections));
```

维度必须为正数，并且与每个已存储的嵌入向量一致。创建已存在的集合会因 `AlreadyExists` 而失败，且不会重新配置该集合。在针对仍保留该集合的 sidecar 重新运行之前，请先删除示例集合。

## 使用类型化负载写入记录

```csharp
var writeOptions = new IndexingOptions
{
    Mode = IndexingMode.WaitForCompletion,
    WaitTimeout = TimeSpan.FromSeconds(10),
    OnWaitTimeout = IndexingWaitTimeoutAction.FailRequest
};

var attributes = JsonSerializer.Deserialize<JsonElement>("""{"category":"books"}""");
var write = await client.UpsertVectorsAsync<Product>(
    storeName,
    collectionName,
    [
        new("dapr", [1, 0, 0], new Product("Dapr guide"), attributes),
        new("distributed", [0.8f, 0.6f, 0], new Product("Distributed systems"), attributes),
        new("other", [0, 1, 0], new Product("Other topics"), attributes)
    ],
    writeOptions);

foreach (var failure in write.FailedItems)
{
    Console.Error.WriteLine($"{failure.Id}: {failure.ErrorCode} {failure.ErrorMessage}");
}

if (write.FailedItems.Count != 0 || write.Ack != IndexAck.Completed)
{
    throw new InvalidOperationException("Not all vector records were confirmed written.");
}
```

`VectorRecord<T>` 包含一个 `Id`、一个 `IReadOnlyList<float>` 类型的嵌入向量 `Values`、可选的类型化 `Payload`，以及可选的 JSON 对象 `Metadata`。ID 必须非空，并且在同一请求内唯一。对已存在的 ID 执行 Upsert 会替换已存储的记录。

metadata 是结构化且可过滤的；负载对向量 component 而言是不透明的，且不可过滤。这与搜索文档 metadata 不同，后者不会被建立索引。除 `byte[]` 外，负载类型使用客户端的 JSON 选项进行序列化。

若未指定显式选项，写入可能会在记录可查询之前返回 `IndexAck.Queued`。等待完成可以让后续查询看到已完成的写入，但你仍必须检查 `FailedItems`。无效的向量维度或向量值可能导致个别记录失败，而其余记录仍会成功。

## 按嵌入向量查询

```csharp
var query = new VectorQuery
{
    Vector = [1, 0, 0],
    TopK = 2,
    Filter = JsonSerializer.Deserialize<JsonElement>("""{"category":{"$eq":"books"}}"""),
    ScoreThreshold = 0.75,
    IncludePayload = true,
    IncludeValues = true
};

var result = await client.QueryVectorsAsync<Product>(storeName, collectionName, query);

foreach (var match in result.Matches)
{
    Console.WriteLine($"{match.Record.Id}: {match.Record.Payload?.Title}, " +
        $"{result.Metric} score {match.Score}");
}
```

`VectorQuery.Vector` 直接是一个浮点数列表，而不是 `VectorRecord<T>`。对于余弦相似度，分数越高表示越接近；包含边界的阈值会保留分数不低于 `0.75` 的结果。关于点积与欧氏距离的语义，请参阅[度量指南]({{% ref "dotnet-vector-client-usage.md#distance-metrics-and-query-options" %}})。

默认情况下，查询结果中会省略向量值和负载。请根据需要分别设置 `IncludeValues` 和 `IncludePayload`。

## 按已存储的 ID 查询及批量查询

若要复用已有记录的嵌入向量，请使用 `ById` 代替 `Vector`：

```csharp
var similar = await client.QueryVectorsAsync<Product>(
    storeName, collectionName,
    new VectorQuery { ById = "dapr", TopK = 2, IncludePayload = true });
```

`Vector` 与 `ById` 必须且只能指定其中一个。批量查询针对同一集合，并按请求顺序为每个查询返回一个结果：

```csharp
var batch = await client.BatchQueryVectorsAsync<Product>(
    storeName, collectionName,
    [
        query,
        new() { ById = "dapr", TopK = 1, IncludePayload = true },
        new() { ById = "missing", TopK = 1 }
    ]);

for (var i = 0; i < batch.Count; i++)
{
    if (batch[i].Error is { } error)
    {
        Console.Error.WriteLine($"Query {i}: {error.Code} {error.Message}");
    }
    else if (batch[i].Response is { } response)
    {
        Console.WriteLine($"Query {i}: {response.Matches.Count} matches ({response.Metric})");
    }
}
```

使用 in-memory component 时，缺失的 ID 会在对应查询的位置上产生错误，而不会丢弃成功的结果。无效的客户端查询参数（例如 `Vector` 和 `ById` 都未设置）会在批量中**任何**查询被发送之前即抛出异常。针对整个请求的 RPC 失败同样会抛出异常，而不会生成按查询划分的错误。

## 检索与删除记录

```csharp
var records = await client.GetVectorsAsync<Product>(
    storeName, collectionName, ["dapr", "missing"], includeValues: true);

foreach (var record in records)
{
    Console.WriteLine($"{record.Id}: {record.Payload?.Title}, {record.Values.Count} values");
}

var ack = await client.DeleteVectorsAsync(
    storeName, collectionName, ["distributed"], writeOptions);

if (ack != IndexAck.Completed)
{
    throw new InvalidOperationException("Vector deletion was not confirmed complete.");
}

await client.DeleteCollectionAsync(storeName, collectionName);
```

Get 会按请求顺序返回找到的记录，并省略缺失的 ID。存在时会返回负载；除非 `includeValues` 为 true，否则会省略向量值。`GetVectorsAsync<T>` 上没有 `includePayload` 参数。删除缺失的记录 ID 不会报错。删除集合会移除其中的所有记录。

## 后续步骤

- [向量客户端配置、不透明负载和生成的类型化客户端]({{% ref dotnet-vector-client-usage.md %}})
- [向量 API 参考]({{% ref vector_api %}})
- [在 .NET 中为文档建立索引并进行搜索]({{% ref dotnet-search-howto.md %}})
