---
type: docs
title: "How to: Index and search documents with the Dapr JavaScript SDK"
linkTitle: "操作指南：搜索文档"
weight: 53050
description: "了解如何配置 search component，并使用 Dapr JavaScript SDK 管理和查询文档"
---

使用 `DaprClient.search` 通过 Dapr search component 管理索引并搜索 JSON 文档。本指南使用 Meilisearch，涵盖创建索引、写入文档、全文搜索、过滤、排序、分页、检索和删除。所有示例均可通过 HTTP 或 gRPC 运行。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化的 [Dapr environment]({{% ref install-dapr-selfhost.md %}})，且 Dapr runtime 版本为 1.19 或更高
- [Node.js](https://nodejs.org/) 18 或更高版本
- 用于在本地运行 Meilisearch 的 [Docker](https://docs.docker.com/get-docker/)
- 版本为 3.19.0 或更高的 [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 包

在应用目录中，如果还没有 npm 项目，请先初始化一个，然后安装 SDK：

```sh
npm init -y
npm install @dapr/dapr@3.19.0
```

示例使用 JavaScript ES 模块，以 `.mjs` 文件运行，无需 TypeScript 编译器。相同的 API 在 TypeScript 中同样可用。

## 配置 Meilisearch

启动一个本地 Meilisearch 实例：

```sh
docker run -d --name meilisearch -p 7700:7700 -e MEILI_MASTER_KEY=masterKey getmeili/meilisearch:v1.43
```

在应用目录中创建 `components` 目录，并将以下内容保存为 `components\search.yaml`：

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
此配置在本地开发中直接使用明文的 API 密钥。生产环境的凭据请使用[secret store 引用]({{% ref component-secrets.md %}})。
{{% /alert %}}

component 的 `metadata.name`（即 `mysearch`）是传递给每个客户端操作的 store 名称，它既不是 component 类型，也不是 YAML 文件名。有关设置和提供方限制，请参阅 [Meilisearch component 参考]({{% ref "reference/components-reference/supported-search/meilisearch.md" %}})。

## 创建索引并搜索文档

将以下内容保存为 `app.mjs`：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});

const storeName = "mysearch";
const indexName = "articles";
const waitOptions = {
  mode: "waitForCompletion",
  waitTimeout: "10s",
  onWaitTimeout: "failRequest",
};

try {
  await client.search.createIndex(storeName, indexName, {
    metadata: {
      filterableAttributes: "category,price",
      sortableAttributes: "price",
      searchableAttributes: "title",
    },
  });

  const indexed = await client.search.indexDocuments(
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
  if (indexed.failedItems.length > 0) {
    console.error("Documents not indexed:", indexed.failedItems);
    throw new Error("Document indexing had item failures");
  }
  console.log("Write acknowledgement:", indexed.ack);

  const query = {
    text: "dapr",
    filter: { category: { $eq: "guide" } },
    sort: [{ field: "price", order: "asc" }],
    highlightFields: ["title"],
    includeContent: true,
    topK: 1,
  };
  let continuationToken;
  do {
    const page = await client.search.search(storeName, indexName, {
      ...query,
      continuationToken,
    });
    for (const hit of page.hits) {
      console.log(hit.document.id, hit.document.content, hit.score, hit.highlights);
    }
    continuationToken = page.continuationToken;
  } while (continuationToken);
} finally {
  await client.stop();
}
```

使用 Dapr sidecar 启动应用，并从 `components` 目录加载 component：

```sh
dapr run --app-id search-example --dapr-http-port 3500 --dapr-grpc-port 50001 --resources-path .\components -- node app.mjs
```

若要改用 gRPC，请将 `communicationProtocol` 改为 `CommunicationProtocolEnum.GRPC`，并将 `daprPort` 改为 `"50001"`。搜索相关代码无需其他改动。

示例会在搜索前等待索引完成，然后按价格升序分两页返回 `doc-1` 和 `doc-2`。Meilisearch 会用 `<em>` 标签高亮匹配内容。分数和总命中数估计值取决于提供方，请勿依赖某个具体的分数值。

创建已存在的索引会以 `ALREADY_EXISTS` 失败，且不会更新其设置。在对同一 Meilisearch 实例重新运行本应用之前，请使用下文的 `deleteIndex` 删除示例索引，或选择一个新的索引名称。与内存 store 不同，Meilisearch 可以在 sidecar 重启后保留文档。

以下代码片段复用 `client`、`storeName`、`indexName` 和 `waitOptions`。请将它们添加到 `try` 块中，位于搜索循环之后、客户端停止之前。删除示例请最后运行。

## 查看索引

```javascript
const indexes = await client.search.listIndexes(storeName);
console.log("Indexes:", indexes);

const index = await client.search.getIndex(storeName, indexName);
console.log(index.index, index.documentCount, index.properties);
```

`documentCount` 是近似计数；如果提供方无法高效提供该值，则为 `0`。对于 Meilisearch，`properties` 包含 `primaryKey` 以及已配置的属性设置。Meilisearch 要求在创建索引时声明过滤和排序属性；component 会将 `id` 添加为可排序属性，作为分页的并列排序字段。

## 检索与更新文档

```javascript
const documents = await client.search.getDocuments(
  storeName,
  indexName,
  ["doc-2", "missing", "doc-1"],
  { includeContent: true },
);
console.log(documents);

const updated = await client.search.indexDocuments(
  storeName,
  indexName,
  [
    {
      id: "doc-1",
      content: { title: "Updated Dapr guide", category: "guide", price: 12 },
      metadata: { author: "alice", revision: "2" },
    },
  ],
  waitOptions,
);
if (updated.failedItems.length > 0) {
  console.error("Documents not updated:", updated.failedItems);
  throw new Error("Document update had item failures");
}
```

检索会按请求顺序返回找到的文档，并省略不存在的 ID。若未设置 `includeContent: true`，则只返回 ID 和已存储的 metadata，`content` 为 undefined。索引操作使用按键 upsert：提交已存在的 ID 即可更新该文档。请提供完整的目标内容和 metadata，而不要假定存在局部补丁（partial-patch）操作。

请将普通的 JSON 对象作为 `content` 传入；SDK 会负责序列化并处理传输编码，包括 HTTP 下的 base64 编码。不要自行对内容进行 base64 编码或字符串化。已存储的文档 metadata 是不透明的，既不能搜索，也不能过滤。需要搜索、过滤或排序的字段必须位于 `content` 中。

对于 Meilisearch，文档 ID 必须为 1 至 511 字节的 ASCII 字母、数字、连字符和下划线。内容中不得包含保留的顶层键 `id`、`daprMetadata`、`daprPayload`，或以 `_` 开头的键。无效内容会在 `failedItems` 中报告，而批次中的有效文档仍可正常索引。

## 整理搜索结果

将全文搜索限定在指定字段，并且只返回所需的内容字段：

```javascript
const projected = await client.search.search(storeName, indexName, {
  text: "dapr",
  searchFields: ["title"],
  filter: {
    $and: [
      { category: { $eq: "guide" } },
      { price: { $lt: 20 } },
    ],
  },
  includeContent: true,
  returnFields: ["title", "price"],
  topK: 10,
});
console.log(projected.hits.map((hit) => hit.document.content));
```

仅设置 `returnFields` 并不会请求内容，还需同时设置 `includeContent: true`。省略查询即可匹配所有文档；若只想浏览某个子集，可只指定过滤条件：

```javascript
const all = await client.search.search(storeName, indexName);
const guides = await client.search.search(storeName, indexName, {
  filter: { category: "guide" },
  includeContent: true,
});
console.log(all.hits, guides.hits);
```

每次调用只返回一页，不一定包含所有匹配项。请像完整示例那样沿用 `continuationToken` 翻页。翻页期间，所有查询字段（包括 `topK`）都应保持不变，只更换令牌。令牌是不透明的：不要解码、编辑或进行 URL 编码。

### 使用提供方原生查询

若要使用特定提供方的搜索功能，请用 `native` 代替 `text`：

```javascript
const native = await client.search.search(storeName, indexName, {
  native: { q: "dapr", matchingStrategy: "all" },
  topK: 10,
  includeContent: true,
});
console.log(native.hits);
```

`text` 与 `native` 互斥。对于 Meilisearch，原生查询不得设置 `offset`、`limit`、`page`、`hitsPerPage` 或 `sort`，应改用可移植的 `topK`、`continuationToken` 和 `sort` 字段。原生过滤条件会以 AND 方式与可移植过滤条件组合。

## 删除文档和索引

```javascript
const ack = await client.search.deleteDocuments(
  storeName,
  indexName,
  ["doc-2", "missing"],
  waitOptions,
);
console.log("Delete acknowledgement:", ack);

await client.search.deleteIndex(storeName, indexName);
```

删除不存在的文档 ID 不会报错。删除文档使用与索引相同的写入确认选项，但直接返回确认字符串。删除索引会移除该索引及其所有文档。

## 后续步骤

请阅读[客户端使用指南]({{% ref js-search-client-usage.md %}})，了解完整的查询与结果结构、写入确认模式、取消和错误处理。有关运行时语义，请参阅[Search API 概述]({{% ref search-overview.md %}})和[Search API 参考]({{% ref search_api.md %}})。
