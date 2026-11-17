---
type: docs
title: "How-To: Index and search documents"
linkTitle: "How-To: 搜索文档"
weight: 2000
description: "了解如何使用 Search API 索引、查询和管理文档"
---

{{% alert title="alpha" color="primary" %}}
Search API 目前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}})。
{{% /alert %}}

让我们从使用 [Search API]({{% ref search-overview %}}) 开始。在本指南中，你将学习如何：

- 设置 Meilisearch search component。
- 创建索引。
- 索引文档并等待写入完成。
- 使用过滤、排序和分页执行全文搜索。
- 按 ID 检索和删除文档。

HTTP API 使用 [protobuf 消息的 JSON 映射](https://protobuf.dev/programming-guides/json/)：字段名为 camelCase，64 位整数为字符串，字节使用 base64 编码。响应会包含设为零值的字段，并省略未设置的可选字段。JavaScript SDK 隐藏了这些细节：文档内容是普通对象，枚举则是 `"completed"` 或 `"asc"` 这样的短字符串。

关于使用类型化文档、查询选项、分页和生成的索引客户端的 .NET 示例，请参阅 [搜索 .NET SDK 指南]({{% ref dotnet-search-howto.md %}})，其适用于 SDK 1.19.0 或更高版本。

## 前提条件

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)
- [Docker](https://docs.docker.com/get-docker/)

## 启动 Meilisearch

使用 Docker 运行一个本地 Meilisearch 实例：

```bash
docker run -d --name meilisearch -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterKey \
  getmeili/meilisearch:v1.43
```

## 设置 search component

在 component 目录（例如 `./components`）中创建名为 `search.yaml` 的文件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mysearch
spec:
  type: search.meilisearch
  version: v1
  metadata:
  - name: host
    value: "http://localhost:7700"
  - name: apiKey
    value: "masterKey"
```

{{% alert title="警告" color="warning" %}}
上面的示例以明文字符串形式使用 secrets。建议使用 secret store 来保存这些 secrets，具体参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

有关所有受支持的 search component，请参阅[search component 规范]({{% ref supported-search %}})。

## 启动 Dapr sidecar

启动一个加载该 component 的 Dapr sidecar：

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

创建 Node.js 项目并安装 Dapr SDK（版本 **3.19.0 或更高**）：

```bash
npm init -y
npm install @dapr/dapr@3.19.0
```

以下示例都放在单个 `app.mjs` 文件中。客户端只需创建一次，之后每次调用都复用它。Search API 同时通过 HTTP 和 gRPC 提供；gRPC 协议以原始字节形式发送文档内容，而 HTTP 会为你完成 base64 编码。

```javascript
import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: process.env.DAPR_GRPC_PORT,
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

const storeName = "mysearch";
const indexName = "articles";
```

使用 sidecar 运行应用程序：

```bash
dapr run --app-id search-app --resources-path ./components -- node app.mjs
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
dapr run --app-id search-app --dapr-http-port 3500 --resources-path ./components
```

在另一个终端中运行下面的 `curl` 命令。

{{% /tab %}}

{{< /tabpane >}}

## 创建索引

创建一个名为 `articles` 的索引。索引设置与具体 component 相关，通过 `metadata` 传递。Meilisearch 只能对预先声明的属性进行过滤和排序，因此这里需要声明 `category` 和 `price`：

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

```javascript
await client.search.createIndex(storeName, indexName, {
  metadata: {
    filterableAttributes: "category,price",
    sortableAttributes: "price",
  },
});
```

创建已存在的索引会失败并返回 `ALREADY_EXISTS`（HTTP `409`），且 Dapr 不会更改已有索引的设置。

确认索引已创建。Meilisearch component 总会将 `id` 添加到可排序属性中，因为它以文档 ID 作为并列结果的次序依据，从而保证分页结果稳定：

```javascript
const info = await client.search.getIndex(storeName, indexName);
console.log(info);
// {
//   index: 'articles',
//   documentCount: 0,
//   properties: {
//     filterableAttributes: 'category,price',
//     primaryKey: 'id',
//     sortableAttributes: 'id,price'
//   }
// }

const indexes = await client.search.listIndexes(storeName);
console.log(indexes); // [ 'articles' ]
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles \
  -H "Content-Type: application/json" \
  -d '{
        "metadata": {
          "filterableAttributes": "category,price",
          "sortableAttributes": "price"
        }
      }'
```

创建已存在的索引会返回 HTTP `409`（`ALREADY_EXISTS`），且 Dapr 不会更改已有索引的设置。

确认索引已创建。Meilisearch component 总会将 `id` 添加到可排序属性中，因为它以文档 ID 作为并列结果的次序依据，从而保证分页结果稳定：

```bash
curl http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles
```

```json
{
  "index": "articles",
  "documentCount": "0",
  "properties": {
    "filterableAttributes": "category,price",
    "primaryKey": "id",
    "sortableAttributes": "id,price"
  }
}
```

{{% /tab %}}

{{< /tabpane >}}

## 索引文档

文档的 `content` 必须是 JSON 对象。以下请求会索引三个文档，并最多等待 10 秒，以便 Meilisearch 完成索引：

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

以普通对象的形式传递内容；SDK 会为你完成序列化。文档可以包含可选的 `metadata`，它会与内容一起存储，并随内容一并返回。

```javascript
const waitOptions = {
  mode: "waitForCompletion",
  waitTimeout: "10s",
  onWaitTimeout: "failRequest",
};

const result = await client.search.indexDocuments(
  storeName,
  indexName,
  [
    {
      id: "doc-1",
      content: { title: "Getting started with Dapr", category: "guide", price: 10 },
      metadata: { author: "alice" },
    },
    {
      id: "doc-2",
      content: { title: "Dapr pub/sub deep dive", category: "guide", price: 25 },
    },
    {
      id: "doc-3",
      content: { title: "Search API reference", category: "reference", price: 30 },
    },
  ],
  waitOptions,
);

console.log(result.ack); // "completed"

if (result.failedItems.length > 0) {
  for (const item of result.failedItems) {
    console.error(`Failed to index ${item.id}: ${item.errorCode} ${item.errorMessage}`);
  }
}
```

如果部分文档无法建立索引，它们会连同错误信息列在 `failedItems` 中，而批次中的其余文档仍会被索引。例如，`content` 不是 JSON 对象的文档，或使用了 Meilisearch component 保留属性的文档，会以错误代码 `3`（`INVALID_ARGUMENT`）报告。

{{% alert title="注意" color="primary" %}}
如果省略选项，Dapr 会在 Meilisearch 将写入加入队列后立即返回（`ack` 为 `"queued"`）。文档会在 Meilisearch 处理完任务后不久变为可搜索。
{{% /alert %}}

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

由于 `content` 字段定义为 bytes，HTTP API 要求其为 base64 编码。例如，下面第一个文档的内容是 `{"title":"Getting started with Dapr","category":"guide","price":10}` 的 base64 编码。

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/documents \
  -H "Content-Type: application/json" \
  -d '{
        "documents": [
          {
            "id": "doc-1",
            "content": "eyJ0aXRsZSI6IkdldHRpbmcgc3RhcnRlZCB3aXRoIERhcHIiLCJjYXRlZ29yeSI6Imd1aWRlIiwicHJpY2UiOjEwfQ==",
            "metadata": { "author": "alice" }
          },
          {
            "id": "doc-2",
            "content": "eyJ0aXRsZSI6IkRhcHIgcHViL3N1YiBkZWVwIGRpdmUiLCJjYXRlZ29yeSI6Imd1aWRlIiwicHJpY2UiOjI1fQ=="
          },
          {
            "id": "doc-3",
            "content": "eyJ0aXRsZSI6IlNlYXJjaCBBUEkgcmVmZXJlbmNlIiwiY2F0ZWdvcnkiOiJyZWZlcmVuY2UiLCJwcmljZSI6MzB9"
          }
        ],
        "options": {
          "mode": "INDEXING_MODE_WAIT_FOR_COMPLETION",
          "waitTimeout": "10s",
          "onWaitTimeout": "INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST"
        }
      }'
```

```json
{
  "failedItems": [],
  "ack": "INDEX_ACK_COMPLETED"
}
```

如果部分文档无法建立索引，它们会连同错误信息列在 `failedItems` 中，而批次中的其余文档仍会被索引。例如，`content` 不是 JSON 对象的文档，或使用了 Meilisearch component 保留属性的文档，会以 `INVALID_ARGUMENT` 报告。

{{% alert title="注意" color="primary" %}}
如果省略 `options`，Dapr 会在 Meilisearch 将写入加入队列后立即返回（`INDEX_ACK_QUEUED`）。文档会在 Meilisearch 处理完任务后不久变为可搜索。
{{% /alert %}}

{{% /tab %}}

{{< /tabpane >}}

## 搜索索引

对 `dapr` 执行全文搜索，结果限定为指南、按价格排序，并高亮 `title` 字段中的匹配项。由于 `topK` 为 `1` 且结果不止一条，响应中会包含一个 `continuationToken`，你可以将其回传以获取下一页。

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

以下循环通过将每次响应中的 `continuationToken` 传入下一次查询，遍历所有匹配的文档：

```javascript
let continuationToken;

do {
  const page = await client.search.search(storeName, indexName, {
    text: "dapr",
    filter: { category: { $eq: "guide" } },
    sort: [{ field: "price", order: "asc" }],
    highlightFields: ["title"],
    includeContent: true,
    topK: 1,
    continuationToken,
  });

  for (const hit of page.hits) {
    console.log(hit.document.id, hit.score, hit.document.content?.title);
    console.log(hit.highlights?.title); // "Getting started with <em>Dapr</em>"
  }

  console.log(`${page.totalHits} total hits (${page.totalHitsRelation})`);
  continuationToken = page.continuationToken;
} while (continuationToken);
```

延续令牌只对生成它的查询有效。在翻页之间更改查询、`topK`、过滤器、排序或字段选项，都会以 `INVALID_ARGUMENT` 失败。

若要列出索引中的所有文档，请不带查询调用 `search`，或使用既没有 `text` 也没有 `native` 的查询。过滤器（`filter`）仍然生效：

```javascript
const all = await client.search.search(storeName, indexName);

const guides = await client.search.search(storeName, indexName, {
  filter: { category: { $eq: "guide" } },
  topK: 50,
});
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

查询在请求的 `query` 字段中设置：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "text": "dapr",
          "filter": { "category": "guide" },
          "sort": [ { "field": "price", "order": "SORT_ORDER_ASC" } ],
          "highlightFields": [ "title" ],
          "includeContent": true,
          "topK": 1
        }
      }'
```

```json
{
  "hits": [
    {
      "document": {
        "id": "doc-1",
        "content": "eyJjYXRlZ29yeSI6Imd1aWRlIiwicHJpY2UiOjEwLCJ0aXRsZSI6IkdldHRpbmcgc3RhcnRlZCB3aXRoIERhcHIifQ==",
        "metadata": { "author": "alice" }
      },
      "score": 0.9,
      "highlights": {
        "title": "Getting started with <em>Dapr</em>"
      }
    }
  ],
  "totalHits": "2",
  "continuationToken": "eyJ...",
  "totalHitsRelation": "TOTAL_HITS_RELATION_ESTIMATE"
}
```

要获取下一页，请带上令牌再次发送相同的请求：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "text": "dapr",
          "filter": { "category": "guide" },
          "sort": [ { "field": "price", "order": "SORT_ORDER_ASC" } ],
          "highlightFields": [ "title" ],
          "includeContent": true,
          "topK": 1,
          "continuationToken": "<token from the previous response>"
        }
      }'
```

延续令牌只对生成它的查询有效。在翻页之间更改查询、`topK`、过滤器、排序或字段选项，都会返回 `INVALID_ARGUMENT` 错误。

若要列出索引中的所有文档，请省略 `query`，或发送不含 `text` 或 `native` 的 `query`。过滤器（`filter`）仍然生效。

{{% /tab %}}

{{< /tabpane >}}

### 使用提供方原生查询

当你需要可移植请求不支持的功能时，请在 `native` 中（而不是在 `text` 中）发送提供方原生查询。对于 Meilisearch，`native` 接受 [Meilisearch 搜索请求](https://www.meilisearch.com/docs/reference/api/search)中的字段，但分页和排序字段除外，这些字段必须使用可移植的 `topK`、`continuationToken` 和 `sort` 字段：

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

```javascript
const strict = await client.search.search(storeName, indexName, {
  native: { q: "dapr", matchingStrategy: "all" },
  topK: 10,
});
```

在同一个查询中同时设置 `text` 和 `native`，会在请求发送前抛出 `TypeError`。

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "native": { "q": "dapr", "matchingStrategy": "all" },
          "topK": 10
        }
      }'
```

{{% /tab %}}

{{< /tabpane >}}

## 按 ID 获取文档

按 ID 获取文档。找到的文档会按请求中的顺序返回；不存在的 ID 会被省略：

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

```javascript
const docs = await client.search.getDocuments(storeName, indexName, ["doc-1", "doc-42"], {
  includeContent: true,
});

for (const doc of docs) {
  console.log(doc.id, doc.content, doc.metadata);
}
// doc-1 { title: 'Getting started with Dapr', category: 'guide', price: 10 } { author: 'alice' }
```

如果不设置 `includeContent`，返回的每个文档的 `content` 都会是 `undefined`。

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/documents/get \
  -H "Content-Type: application/json" \
  -d '{
        "ids": [ "doc-1", "doc-42" ],
        "includeContent": true
      }'
```

{{% /tab %}}

{{< /tabpane >}}

## 删除文档

删除文档是写操作，与索引文档接受相同的选项。不存在的 ID 不算错误：

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

```javascript
const ack = await client.search.deleteDocuments(storeName, indexName, ["doc-2"], {
  mode: "waitForCompletion",
  waitTimeout: "10s",
  onWaitTimeout: "continueAsync",
});

console.log(ack); // "completed"，如果等待超时则为 "queued"
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/documents/delete \
  -H "Content-Type: application/json" \
  -d '{
        "ids": [ "doc-2" ],
        "options": {
          "mode": "INDEXING_MODE_WAIT_FOR_COMPLETION",
          "waitTimeout": "10s",
          "onWaitTimeout": "INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC"
        }
      }'
```

{{% /tab %}}

{{< /tabpane >}}

## 删除索引

{{< tabpane text=true >}}

{{% tab "JavaScript" %}}

```javascript
await client.search.deleteIndex(storeName, indexName);
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles
```

不带请求体的请求（获取、列出和删除索引）以 `metadata.<key>=<value>` 查询参数的形式传递请求 metadata。

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤

- [Search API 参考]({{% ref search_api %}})
- [search component 规范]({{% ref supported-search %}})
- [How-To: 存储和查询向量]({{% ref howto-vector %}})
