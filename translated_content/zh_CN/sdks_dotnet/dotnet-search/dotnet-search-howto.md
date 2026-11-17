---
type: docs
title: "操作指南：使用 Dapr .NET SDK 索引和搜索文档"
linkTitle: "操作指南：搜索文档"
weight: 54050
description: 使用 Dapr.Search 创建索引、写入类型化文档、搜索并检索文档
---

使用 `DaprSearchClient` 为 JSON 文档建立索引，并通过 Dapr search component 执行全文查询。本指南将配置一个本地存储、创建索引、写入并搜索类型化文档，最后删除这些文档。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}}) 以及[已初始化的 Dapr environment]({{% ref install-dapr-selfhost.md %}})
- [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)、[.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0) 或 [.NET 11](https://dotnet.microsoft.com/download/dotnet/11.0)
- 支持搜索功能的 Dapr runtime 1.19 或更高版本
- [Dapr.Search](https://www.nuget.org/packages/Dapr.Search) NuGet 包，版本 1.19.0 或更高

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。Dapr v1.20 将不再支持这两个版本；只有 .NET 10 和 .NET 11 会一直支持到 2027 年底。
{{% /alert %}}

在 ASP.NET Core 项目中安装该包：

```sh
dotnet add package Dapr.Search
```

[搜索 SDK 概述]({{% ref dotnet-search %}}) 介绍了 alpha API 及其发布要求。

## 配置 search component

在应用目录中创建 `components\searchstore.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: searchstore
spec:
  type: search.in-memory
  version: v1
  metadata:
  - name: indexingDelay
    value: "0s"
```

[in-memory component]({{% ref "/reference/components-reference/supported-search/in-memory.md" %}}) 不需要外部服务。sidecar 停止后数据会丢失，且不同 sidecar 之间不共享。请将其用于本地开发和测试，而不要用于持久化存储。

在生产环境中，请配置一个受支持的[search component]({{% ref supported-search %}})。不同 component 的能力各不相同：例如，in-memory component 不支持高亮和原生查询。

## 注册并解析客户端

将以下代码添加到 `Program.cs`。客户端会从配置或环境变量中读取 sidecar 的端点和 API 令牌。

```csharp
using Dapr.Search;
using Dapr.Search.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprSearchClient();

var app = builder.Build();
var client = app.Services.GetRequiredService<DaprSearchClient>();
```

在此代码之后放置其余的操作代码片段，并在 `Program.cs` 末尾调用 `app.Run();`。在 `Article.cs` 中创建文档类型：

```csharp
public sealed record Article(string Title, string Category, decimal Price);
```

使用加载了该 component 的 sidecar 运行应用：

```sh
dapr run --app-id search-example --resources-path .\components -- dotnet run
```

.NET 搜索客户端使用 gRPC；它独立于 `DaprClient`，不需要调用 `AddDaprClient()`。

## 创建并查看索引

```csharp
const string storeName = "searchstore";
const string indexName = "articles";

await client.CreateIndexAsync(storeName, indexName);

var info = await client.GetIndexAsync(storeName, indexName);
Console.WriteLine($"{info.Index}: approximately {info.DocumentCount} documents");

var indexes = await client.ListIndexesAsync(storeName);
Console.WriteLine(string.Join(", ", indexes));
```

对已存在的索引再次调用创建会以 `AlreadyExists` 失败，且不会更新索引设置。如果在两次执行之间保持 sidecar 运行，请先删除示例索引，再重新创建。

`CreateIndexAsync` 的 `metadata` 参数接受 component 特定的索引设置。例如，Meilisearch component 需要通过 `filterableAttributes` 和 `sortableAttributes` 声明用于过滤和排序的字段。in-memory 示例不需要这些设置。

## 写入类型化文档

```csharp
var writeOptions = new IndexingOptions
{
    Mode = IndexingMode.WaitForCompletion,
    WaitTimeout = TimeSpan.FromSeconds(10),
    OnWaitTimeout = IndexingWaitTimeoutAction.FailRequest
};

var write = await client.IndexDocumentsAsync<Article>(
    storeName,
    indexName,
    [
        new("doc-1", new Article("Getting started with Dapr", "guide", 10),
            new Dictionary<string, string> { ["author"] = "alice" }),
        new("doc-2", new Article("Dapr pub/sub deep dive", "guide", 25)),
        new("doc-3", new Article("Search API reference", "reference", 30))
    ],
    writeOptions);

foreach (var failure in write.FailedItems)
{
    Console.Error.WriteLine($"{failure.Id}: {failure.ErrorCode} {failure.ErrorMessage}");
}

if (write.FailedItems.Count != 0 || write.Ack != IndexAck.Completed)
{
    throw new InvalidOperationException("Not all documents were confirmed indexed.");
}
```

`SearchDocument<T>` 包含一个 ID、类型化的内容以及可选的字符串 metadata。SDK 使用客户端的 JSON 选项将内容序列化为 UTF-8 JSON。内容必须序列化为 JSON **对象**；无效内容会由运行时报告为单项失败。ID 必须非空，并且在同一次写入请求中唯一。写入已存在的 ID 会 upsert 该文档。

文档 metadata 会原样存储和返回，但不会被索引，也不能用于过滤。过滤条件针对 `Content` 的字段，而不是 `SearchDocument<T>.Metadata`。

如果不传入 `writeOptions`，写入会在被接受后立即返回，并可能返回 `IndexAck.Queued`。此时即使 `FailedItems` 为空，也不能保证最终一定索引成功。上文显式的等待可以让后续读取看到已完成的写入。参见[写入确认指南]({{% ref "dotnet-search-client-usage.md#write-acknowledgements" %}})。

## 搜索并分页

在 `Program.cs` 顶部添加 `using System.Text.Json;`，然后搜索 guide 类别的文档，并按价格排序：

```csharp
var query = new SearchQuery
{
    Text = "dapr",
    SearchFields = ["title"],
    Filter = JsonSerializer.Deserialize<JsonElement>("""{"category":{"$eq":"guide"}}"""),
    Sort = [new SortClause("price", SortOrder.Ascending)],
    IncludeContent = true,
    TopK = 1
};

SearchResult<Article> page;
do
{
    page = await client.SearchAsync<Article>(storeName, indexName, query);

    foreach (var hit in page.Hits)
    {
        Console.WriteLine($"{hit.Document.Id}: {hit.Document.Content?.Title} ({hit.Score})");
    }

    Console.WriteLine($"Total: {page.TotalHits}, accuracy: {page.TotalHitsRelation}");
    query = query with { ContinuationToken = page.ContinuationToken };
}
while (!string.IsNullOrEmpty(page.ContinuationToken));
```

默认的 JSON 命名策略是 camelCase，因此字段名使用 `title`、`category` 和 `price`，而不是 .NET 属性名。延续令牌属于生成它的那次查询：翻页时，请保持文本、过滤条件、排序、页大小和字段选项不变。

`SearchAsync<T>` 只返回一页结果，而不是自动枚举的数据流。除非 `IncludeContent` 为 `true`，否则不会返回内容。若省略查询，或同时省略 `Text` 和 `Native`，则匹配所有文档，但仍受过滤条件约束。

## 按 ID 检索文档

```csharp
var documents = await client.GetDocumentsAsync<Article>(
    storeName, indexName, ["doc-1", "missing"], includeContent: true);

foreach (var document in documents)
{
    Console.WriteLine($"{document.Id}: {document.Content?.Title}");
}
```

找到的文档按请求中的顺序返回；缺失的 ID 会被忽略。未设置 `includeContent: true` 时，`Content` 为 `default(T)`。

## 删除文档和索引

```csharp
var ack = await client.DeleteDocumentsAsync(
    storeName, indexName, ["doc-2"], writeOptions);

if (ack != IndexAck.Completed)
{
    throw new InvalidOperationException("Document deletion was not confirmed complete.");
}

await client.DeleteIndexAsync(storeName, indexName);
```

删除不存在的文档 ID 不会报错。删除索引时，其中的文档也会一并删除。

## 后续步骤

- [搜索客户端配置、高级查询和生成的类型化客户端]({{% ref dotnet-search-client-usage.md %}})
- [Search API 参考]({{% ref search_api %}})
- [在 .NET 中存储和查询向量]({{% ref dotnet-vector-howto.md %}})
