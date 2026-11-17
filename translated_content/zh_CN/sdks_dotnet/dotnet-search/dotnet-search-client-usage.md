---
type: docs
title: "Dapr Search 客户端"
linkTitle: "Search 客户端"
weight: 54100
description: 配置 DaprSearchClient、构造查询、管理写入确认，并生成强类型索引客户端
---

`Dapr.Search` 中的 `DaprSearchClient` 通过 gRPC 实现 alpha 的 Search API。请使用 .NET SDK 1.19.0 或更高版本，并搭配支持搜索的 Dapr runtime 和 component。发布要求参见[概述]({{% ref dotnet-search %}})，完整的文档生命周期参见[操作指南]({{% ref dotnet-search-howto.md %}})。

## 客户端生命周期与配置

应复用长生命周期的客户端，而不是为每次操作都创建一个。依赖注入默认将其注册为单例，并由容器负责释放：

```csharp
using Dapr.Search.Extensions;

builder.Services.AddDaprSearchClient((serviceProvider, clientBuilder) =>
{
    clientBuilder.UseGrpcEndpoint("http://localhost:50001");
});
```

回调可以通过 `serviceProvider` 解析配置或其他服务。如有需要，可使用可选的 `lifetime` 参数选择其他 `ServiceLifetime`。

对于不使用依赖注入的应用，需要自行创建并释放客户端：

```csharp
using Dapr.Search;

using var client = new DaprSearchClientBuilder()
    .UseGrpcEndpoint("http://localhost:50001")
    .Build();
```

构建器接受可选的 `IConfiguration`。默认值会解析 `DAPR_GRPC_ENDPOINT`；若未设置，则使用 `DAPR_GRPC_PORT`（默认为 50001）拼出本地端点。`DAPR_API_TOKEN` 提供 sidecar 身份验证。通过构建器显式设置的值会覆盖默认值；若要覆盖令牌，请使用 `UseDaprApiToken`。

文档序列化使用 `UseJsonSerializationOptions`，gRPC 设置使用 `UseGrpcChannelOptions`。提供通道选项时，请保留 `ThrowOperationCanceledOnCancellation = true`。尽管共享构建器还提供 HTTP 端点、HTTP 客户端工厂和 HTTP 超时设置，但搜索操作使用 gRPC；修改 HTTP 端点不会改变其传输方式，`UseTimeout` 也不是单次 RPC 的截止时间。若要限制调用方的等待时长，请传入带时限的 `CancellationToken`。

## API 覆盖范围

所有操作都接受可选的、component 专用的请求 `metadata`（`IReadOnlyDictionary<string, string>`）和 `CancellationToken`。

| 操作 | 结果 |
| --- | --- |
| `CreateIndexAsync`、`DeleteIndexAsync` | 创建或删除索引。创建时的 metadata 用于提供特定于提供方的设置。 |
| `GetIndexAsync` | 包含 `Index`、近似的 `DocumentCount` 和 component `Properties` 的 `SearchIndex`。 |
| `ListIndexesAsync` | component 中的索引名称。 |
| `IndexDocumentsAsync<T>` | 包含 `Ack` 和 `FailedItems` 的 `IndexDocumentsResult`。 |
| `GetDocumentsAsync<T>` | 按请求顺序返回找到的 `SearchDocument<T>` 条目。 |
| `DeleteDocumentsAsync` | 删除操作的 `IndexAck`。 |
| `SearchAsync<T>` | 一页 `SearchResult<T>` 结果。 |

请求 metadata 用于配置操作，与每个文档中存储的、不透明的 `Metadata` 相互独立。

## 查询选项与结果

`SearchQuery` 是记录（record）类型，因此若只需修改延续令牌，请使用 `with` 表达式。

| 属性 | 行为 |
| --- | --- |
| `Text` | 可移植的全文查询。与 `Native` 互斥；两者都未设置时表示匹配全部。 |
| `Native` | 由 JSON 对象（`JsonElement`）表示的提供方原生查询。 |
| `Filter` | 可移植的 JSON 对象过滤器，用于指定内容字段，包括带点号的嵌套路径。 |
| `TopK` | 可为空的 `uint` 类型页大小；为 null 或零时使用 component 默认值。 |
| `ContinuationToken` | 上一次响应返回的不透明令牌。查询的其余部分保持不变。 |
| `SearchFields` | 要搜索的内容字段。 |
| `Sort` | 有序的 `SortClause` 条目，排序方向可为 `Ascending`、`Descending`，或使用提供方默认的 `Unspecified`。 |
| `IncludeContent` | 为 null 或 false 时省略内容，返回的 `Content` 为 `default(T)`。 |
| `ReturnFields` | 投影到返回内容中的字段。需与 `IncludeContent = true` 一起使用。 |
| `HighlightFields` | 若 component 支持，则请求返回高亮片段的字段。 |

过滤器支持 `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte`、`$in`、`$nin`、`$exists`、`$and`、`$or` 和 `$not`。对象中的多个条件之间为与（AND）关系，直接给出的字段值表示等值判断。请使用序列化后的 JSON 字段名，默认为 camelCase。关于可移植的[过滤语言]({{% ref "search-overview.md#filter-language" %}})，以及可过滤和可排序字段的要求，请参见你所用 component 的文档。

`SearchResult<T>.Hits` 包含 `SearchHit<T>` 条目，每个条目带有 `Document`、未经归一化的提供方特定 `Score`，以及以字段为键的 `Highlights` 字典。在同一结果集内，分数越高表示相关性越强；不要跨提供方比较分数。`TotalHits` 可为空，`TotalHitsRelation` 的取值为 `Unspecified`、`Exact`、`LowerBound` 或 `Estimate`。当 `ContinuationToken` 为 null 或空字符串时，停止翻页。

### 投影与高亮

使用操作指南中的 `Article` 类型和客户端，以下查询需要支持高亮的 component，例如 Meilisearch：

```csharp
var page = await client.SearchAsync<Article>("searchstore", "articles", new SearchQuery
{
    Text = "dapr",
    IncludeContent = true,
    ReturnFields = ["title", "category"],
    HighlightFields = ["title"]
});

foreach (var hit in page.Hits)
{
    if (hit.Highlights.TryGetValue("title", out var title))
    {
        Console.WriteLine(title);
    }
}
```

投影可能会省略你的模型所期望的成员。对于部分文档，请选择兼容的结果类型或 `JsonElement`。高亮片段可能包含提供方生成的标记；在渲染界面时，应将其视为不受信任的内容。

### 提供方原生查询

若要使用特定于提供方的功能，请在 `Native` 中传入 JSON 对象，而不是 `Text`：

```csharp
using System.Text.Json;

var page = await client.SearchAsync<JsonElement>("searchstore", "articles", new SearchQuery
{
    Native = JsonSerializer.Deserialize<JsonElement>(
        """{"q":"dapr","matchingStrategy":"all"}"""),
    IncludeContent = true,
    TopK = 10
});
```

此示例使用 Meilisearch 语法，无法与 in-memory component 配合使用。Meilisearch 的分页与排序仍须使用可移植的 `TopK`、`ContinuationToken` 和 `Sort` 属性。同时设置 `Text` 与 `Native`，或提供非对象类型的 `Native` 或 `Filter`，都会在发送 RPC 之前抛出 `ArgumentException`。

## 写入确认

`IndexDocumentsAsync<T>` 和 `DeleteDocumentsAsync` 接受 `Dapr.Search.IndexingOptions`。

| 设置 | 行为 |
| --- | --- |
| 省略选项、`ReturnOnAcceptance` 或 `Unspecified` 模式 | 在被接受后返回。`IndexAck.Queued` 表示后台工作已被接受，并不代表索引已成功。同步 component 可以返回 `Completed`。 |
| `WaitForCompletion` | 需要正数的 `WaitTimeout` 和显式的 `OnWaitTimeout`。`Completed` 表示最终写入结果已可用，包括任何条目失败。 |
| `OnWaitTimeout = ContinueAsync` | 等待超时时返回 `Queued`；需要 component 支持排队确认。 |
| `OnWaitTimeout = FailRequest` | 等待超时时以 `DeadlineExceeded` 失败。提供方一侧的工作仍可能完成。 |

在接受模式下，不要同时提供 `WaitTimeout` 或 `OnWaitTimeout`。`WaitTimeout` 必须短于剩余的 RPC 截止时间，并且要为存储 resiliency 中的超时留出余量，余量至少为该超时的 10%，且至少 100 毫秒。请参见运行时的[确认规则]({{% ref "search-overview.md#write-acknowledgements" %}})。

务必同时检查 `IndexDocumentsResult.Ack` 和 `FailedItems`。一个已完成的批次可能包含失败的文档，而整个请求不会因此抛出异常。每个 `SearchFailedItem` 包含 `Id`、规范的数字类型 `ErrorCode`、`ErrorMessage`，以及保留了 protobuf `TypeUrl` 和原始 `Value` 字节的 `Details`。在排队边界处，只能报告已知的失败；客户端没有 API 可用于轮询最终的索引结果。

## 序列化

内容默认使用 `System.Text.Json`，并采用 `JsonSerializerDefaults.Web`。请将 .NET 对象传给 `SearchDocument<T>`；不要手动进行 Base64 编码，也不要传入已序列化的 JSON 字符串，否则它会被序列化为字符串而不是对象。对于没有固定 .NET 模型的文档结构，请使用 `JsonElement`。

若要使用源生成的 JSON 序列化，请使用覆盖内容类型的上下文来配置客户端：

```csharp
using System.Text.Json.Serialization;
using Dapr.Search.Extensions;

builder.Services.AddDaprSearchClient((_, clientBuilder) =>
    clientBuilder.UseJsonSerializationOptions(SearchJsonContext.Default.Options));

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
[JsonSerializable(typeof(Article))]
internal partial class SearchJsonContext : JsonSerializerContext
{
}
```

下文生成的索引客户端不会生成 JSON 序列化 metadata。若需要免反射的序列化，请单独配置 JSON 选项。

## 生成强类型索引客户端

`Dapr.Search` 包内置了源生成器。请声明一个顶层、非泛型、非文件局部的 `partial` 接口，它恰好继承一个 `IDaprSearchIndex<T>`，且不包含额外的抽象成员：

```csharp
using Dapr.Search;

[SearchIndex("searchstore", "articles")]
public partial interface IArticleSearch : IDaprSearchIndex<Article>
{
}
```

component 名和索引名都不能为空。生成器会提供 `AddArticleSearch` 方法，其名称取自接口名并去掉开头的 `I`：

```csharp
builder.Services.AddDaprSearchClient().AddArticleSearch();
```

注入该接口，而不必反复指定 component、索引和泛型类型：

```csharp
public sealed class ArticleService(IArticleSearch articles)
{
    public Task<SearchResult<Article>> FindAsync(string text, CancellationToken cancellationToken) =>
        articles.SearchAsync(
            new SearchQuery { Text = text, IncludeContent = true },
            cancellationToken: cancellationToken);
}
```

生成的包装器提供了 API 表格中按索引范围划分的操作，但不包括范围覆盖整个存储的 `ListIndexesAsync`。它会原样转发选项、请求 metadata 和取消令牌，继承已注册客户端的生命周期，并且不拥有该客户端，也不负责释放它。注册本身不会创建索引；需要显式调用 `CreateIndexAsync`。

无效的声明、binding 或契约分别会产生构建错误 `DAPR1801`、`DAPR1802` 或 `DAPR1803`。

## 取消与错误

无效的客户端参数会在发出 RPC 之前抛出参数异常。RPC 失败会抛出 `DaprException`，并以原始的 `Grpc.Core.RpcException` 作为 `InnerException`，保留其状态和尾部 metadata：

```csharp
using Dapr;
using Grpc.Core;

try
{
    await client.CreateIndexAsync("searchstore", "articles");
}
catch (DaprException ex) when (
    ex.InnerException is RpcException { StatusCode: StatusCode.AlreadyExists })
{
    Console.Error.WriteLine("The index already exists; its settings were not changed.");
}
```

这与成功的索引调用所返回的条目失败不同。调用方取消可能抛出 `OperationCanceledException`，但并不保证提供方已停止处理写入。重试和超时策略应通过 Dapr [resiliency]({{% ref "search-overview.md#resiliency" %}})配置，而不是由本客户端配置。
