---
type: docs
title: "搜索客户端用法"
linkTitle: "客户端用法"
weight: 53100
description: 配置和使用 JavaScript 搜索客户端的核心指南
---

搜索功能可通过 `DaprClient.search` 使用，需要 JavaScript SDK 3.19.0 或更高版本以及 Dapr 运行时 1.19 或更高版本。HTTP 和 gRPC 均使用 Alpha 阶段的搜索 API，并提供相同的方法和 JavaScript 结果结构。

## 客户端生命周期与配置

请复用长生命周期的 `DaprClient`。应用关闭时，请先等待所有未完成的操作，再调用 `await client.stop()`。

HTTP 是默认协议。若要显式配置 gRPC：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

若使用 HTTP，请设置 `CommunicationProtocolEnum.HTTP`，并使用边车的 HTTP 端口（默认为 `"3500"`）。端口值为字符串。未显式提供主机和端口时，SDK 会根据所选协议使用 `DAPR_HTTP_ENDPOINT` 或 `DAPR_GRPC_ENDPOINT`；若未设置，则回退到主机和端口的默认值，以及 `DAPR_HTTP_PORT` 或 `DAPR_GRPC_PORT`。API 令牌默认取自 `DAPR_API_TOKEN`。请参阅[客户端配置]({{% ref "js-client#environment-variables" %}})。

## 选择操作

`storeName` 是搜索组件的 `metadata.name`。除 `listIndexes` 外，所有方法还需要索引名称。可选的选项对象作为最后一个参数传入。

| 方法 | 结果 |
|------|------|
| `createIndex(storeName, index, options?)` | `Promise<void>` |
| `getIndex(storeName, index, options?)` | `Promise<SearchIndex>` |
| `listIndexes(storeName, options?)` | `Promise<string[]>` |
| `deleteIndex(storeName, index, options?)` | `Promise<void>` |
| `indexDocuments<T>(storeName, index, documents, options?)` | `Promise<IndexDocumentsResult>` |
| `getDocuments<T>(storeName, index, ids, options?)` | `Promise<SearchDocument<T>[]>` |
| `deleteDocuments(storeName, index, ids, options?)` | `Promise<IndexAck>` |
| `search<T>(storeName, index, query?, options?)` | `Promise<SearchResult<T>>` |

TypeScript 应用可以从 `@dapr/dapr` 以类型形式导入 `IClientSearch`、`SearchOptions`、`IndexingOptions`、`SearchDocument`、`SearchIndex`、`SearchQuery`、`SearchResult`、`IndexAck` 和 `IndexDocumentsResult`。

每个操作都接受 `SearchOptions`：`metadata?: Readonly<Record<string, string>>` 和 `signal?: AbortSignal`。这里的 metadata 是组件特定的**请求元数据**，与存储的文档元数据相互独立。例如，`createIndex` 会用它传递提供方特定的索引设置。SDK 负责将其放入 HTTP 请求体或查询字符串，或放入 gRPC 请求字段。

`indexDocuments` 和 `deleteDocuments` 接受 `IndexingOptions`，它在这些选项的基础上增加了写入确认控制。`getDocuments` 还接受 `includeContent?: boolean`。

## 文档内容与 TypeScript 类型

`SearchDocument<T>` 包含 `id: string`、可选的 `content: T` 以及可选的字符串映射 `metadata`。内容在建立索引前必须能序列化为 JSON 对象。SDK 使用独立于应用自定义 `DaprClient` 序列化器的 JSON 序列化，将内容转换为 UTF-8 字节，并自动解码返回的内容。请勿将预先编码的 base64 或 JSON 文本作为内容传入。

除非在 `getDocuments` 或搜索查询中设置 `includeContent: true`，否则返回的 `content` 为 undefined。存储的元数据缺省时默认为空对象。元数据会原样返回，且从不参与索引、搜索或过滤。

泛型仅在编译时描述返回的内容，不会在运行时校验文档。未指定类型时，内容默认为 `unknown`。在 TypeScript 中，请为可复用的选项对象添加类型注解，以保留其字符串字面量类型：

```typescript
import type { IndexingOptions, SearchDocument, SearchQuery } from "@dapr/dapr";

type Article = { title: string; category: string; price: number };

const documents: SearchDocument<Article>[] = [
  { id: "doc-1", content: { title: "Dapr guide", category: "guide", price: 10 } },
];
const waitOptions: IndexingOptions = {
  mode: "waitForCompletion",
  waitTimeout: "10s",
  onWaitTimeout: "failRequest",
};
const query: SearchQuery = {
  text: "dapr",
  includeContent: true,
  returnFields: ["title", "price"],
};

const indexed = await client.search.indexDocuments(storeName, indexName, documents, waitOptions);
if (indexed.failedItems.length > 0) {
  console.error("Documents not indexed:", indexed.failedItems);
  throw new Error("Document indexing had item failures");
}
const result = await client.search.search<Pick<Article, "title" | "price">>(
  storeName,
  indexName,
  query,
);
for (const hit of result.hits) {
  console.log(hit.document.content?.title);
}
```

此示例假定已存在 `client`、`storeName` 和 `indexName`。投影字段时，请使用与所选 `returnFields` 一致的内容类型，而不是完整的存储文档类型。

## 写入确认与部分失败

索引文档和删除文档可能是异步的。`IndexAck` 的值为 `"queued"` 或 `"completed"`；这些是 SDK 字符串，而不是原始 HTTP 请求所用的 protobuf 枚举名。

| 选项 | 行为 |
|------|------|
| 省略，或 `mode: "returnOnAcceptance"` | 提供方接受写入后返回。`"queued"` 并不表示文档已可搜索或已被删除。若工作已经完成，提供方可以返回 `"completed"`。 |
| `mode: "waitForCompletion"` | 最多等待 `waitTimeout` 直至完成。需要同时提供正数的 protobuf 时长（例如 `"10s"` 或 `"0.250s"`）以及明确的 `onWaitTimeout`。 |
| `onWaitTimeout: "continueAsync"` | 等待超时后返回 `"queued"`，并让提供方继续处理。需要提供方支持排队确认。 |
| `onWaitTimeout: "failRequest"` | 等待超时后以 `DEADLINE_EXCEEDED` 拒绝请求。提供方的工作仍可能完成。 |

未设置 `mode: "waitForCompletion"` 时，请勿提供 `waitTimeout` 或 `onWaitTimeout`。`waitTimeout` 应短于请求的截止时间。若配置了组件弹性策略超时，请按[搜索 API 概述]({{% ref "search-overview.md#write-acknowledgements" %}})中的说明，至少留出该超时时间 10% 且不少于 100 毫秒的余量。

`indexDocuments` 解析为 `{ ack, failedItems }`。即使 Promise 已解析且 `ack` 为 `"completed"`，也务必检查 `failedItems`。每个失败项包含 `id`、数字类型的 `errorCode`（规范的非 OK `google.rpc.Code`）、`errorMessage` 和 `details`。例如，内容不是对象时，可能产生错误码为 `3`（`INVALID_ARGUMENT`）的条目失败，而同一批次中的有效文档仍会被索引。

只会返回在确认边界处已知的失败。排队中的工作之后仍可能失败，而此 API 既不提供操作句柄，也没有获取最终结果的方法。若后续操作依赖写入的可见性，请使用完成模式。`deleteDocuments` 直接返回确认字符串，而不是 `{ ack }`。

文档 ID 必须非空，且在同一写入请求中唯一。ID 重复会直接拒绝整个请求，而不会产生部分条目失败。对相同 ID 执行 Upsert 可实现幂等重试，但不要假定超时、取消或等待失败就意味着提供方已回滚写入。

## 查询选项

请将 `SearchQuery` 直接作为 `client.search.search` 的第三个参数传入，不要包在 `{ query: ... }` 中。

| 字段 | 行为 |
|------|------|
| `text` | 可移植的全文搜索字符串。与 `native` 互斥。 |
| `native` | 提供方原生的 JSON 查询对象。与 `text` 互斥。 |
| `filter` | 作用于内容字段的可移植 JSON 过滤器。支持 `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte`、`$in`、`$nin`、`$exists`、`$and`、`$or` 和 `$not`。点号路径用于访问嵌套字段。 |
| `topK` | 每页大小。省略或为 `0` 时使用提供方默认值。必须为 `0` 到 `4294967295` 之间的整数；提供方可能设置更小的上限。 |
| `continuationToken` | 上一页返回的不透明令牌。使用相同的查询结构时，请原样传入。 |
| `includeContent` | 默认为 `false`。设为 `true` 时返回文档内容。 |
| `returnFields` | 要投影的内容字段。不会隐式启用 `includeContent`。 |
| `searchFields` | 可移植文本查询所搜索的字段。 |
| `sort` | 有序的 `{ field, order?: "asc" \| "desc" }` 子句。省略 order 时按升序排列。 |
| `highlightFields` | 需要返回高亮片段的字段。 |

若同时省略 `text` 和 `native`，或完全省略查询，则匹配所有满足 `filter` 的文档。在过滤器中直接赋值的字段表示等值比较；同一对象中的条件之间为逻辑与（AND）关系。请参阅[可移植过滤语言]({{% ref "search-overview.md#filter-language" %}})。

提供方的能力决定了支持的查询选项和字段限制。Meilisearch 要求在创建索引时声明可过滤和可排序的属性。原生查询语法因提供方而异，无法在不同组件之间移植。

## 结果与分页

`SearchResult<T>` 包含以下字段：

| 字段 | 含义 |
|------|------|
| `hits` | 由 `{ document: SearchDocument<T>, score: number, highlights: Record<string, string> }` 组成的数组。没有匹配项时为空数组。 |
| `totalHits` | 可选的尽力统计数。不可用时为 undefined，而不一定是 `0`。 |
| `totalHitsRelation` | `"exact"`、`"lowerBound"`、`"estimate"` 或 `"unspecified"`，用于描述 `totalHits` 的精确程度。 |
| `continuationToken` | 下一页的可选令牌。未返回令牌时停止翻页。 |

分数是提供方特定的未归一化数值，只能在同一结果集内相互比较。高亮片段是由提供方生成的字符串，不能替代内容；在应用中渲染前请妥善处理。

每一页都应复制原始查询，并且只修改 `continuationToken`。更改文本或原生查询、页大小、过滤器、排序或字段选项都会使令牌失效。若提供方游标过期，运行时会返回原因为 `SEARCH_CONTINUATION_EXPIRED` 的 `FAILED_PRECONDITION`；此时应发起新的查询，而不是修改令牌。

与原始 HTTP 响应不同，SDK 将 `documentCount` 和 `totalHits` 作为 JavaScript 数字返回。超出 `Number.MAX_SAFE_INTEGER` 的值会以 `RangeError` 拒绝，而不会悄悄丢失精度。`SearchIndex` 包含 `index`、`documentCount` 以及提供方特定的字符串映射 `properties`。

## 取消

每个搜索方法都在最后一个选项参数中接受 `AbortSignal`。例如，在 30 秒后取消搜索：

```javascript
const result = await client.search.search(
  storeName,
  indexName,
  { text: "dapr", includeContent: true },
  { signal: AbortSignal.timeout(30_000) },
);
console.log(result.hits);
```

此示例假定已存在客户端和索引。对于写入操作，请在同一个选项对象中将 `signal` 与 `mode`、`waitTimeout` 和 `onWaitTimeout` 一起传入。已中止的信号会直接拒绝，而不会发送搜索操作。取消不同于提供方的 `waitTimeout`，并不保证能取消提供方端的写入。不同协议下的错误结构可能不同。

## 错误

请等待每个操作，并在应用的错误边界处理被拒绝的 Promise，同时检查已解析的索引结果中的 `failedItems`。

- **HTTP：** 运行时失败为 JavaScript `Error` 实例，其 `message` 是一个 JSON 字符串，包含 `status`（HTTP 状态码）、`error`（状态文本）和 `error_msg`（运行时响应体）。传输、取消和本地校验失败的结构可能不同；不要假定每条错误消息都是 JSON。
- **gRPC：** 运行时失败会保留 `@connectrpc/connect` 中的 `ConnectError` 代码，而不是 HTTP 状态码。
- **无效参数：** 存储名、索引名或文档 ID 为空，存储名或索引名为 `.` 或 `..`，元数据值不是字符串，`text` 与 `native` 同时出现，或选项类型无效，都会在本地被拒绝。无效的 `topK` 值和非正数的等待时长会被拒绝；无效的 protobuf 时长语法同样会被拒绝。提供方特定的校验仍由运行时或组件完成。

创建已存在的索引会以 `ALREADY_EXISTS` 失败；存储或索引不存在以及不受支持的查询同样会被拒绝。`getDocuments` 中缺失的 ID 会被省略，删除不存在的文档 ID 不会报错。

通过 HTTP 时，每个条目的 `details` 是 protobuf JSON 对象。通过 gRPC 时，每个 detail 表示为 `{ "@type": typeUrl, value: base64ProtobufBytes }`，因为可能无法获取提供方特定的 schema 来解码它。不要假定两种协议下的 detail 负载完全相同。

运行时错误的语义请参阅[搜索 API 参考]({{% ref "search_api.md#errors" %}})，完整的配置与可运行示例请参阅[操作指南]({{% ref js-search-howto.md %}})。
