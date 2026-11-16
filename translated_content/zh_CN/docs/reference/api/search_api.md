---
type: docs
title: "搜索 API 参考"
linkTitle: "搜索 API"
description: "搜索 API 的详细文档"
weight: 1250
---

{{% alert title="Alpha 阶段" color="primary" %}}
搜索 API 目前处于 [Alpha 阶段]({{% ref "certification-lifecycle.md#certification-levels" %}})。
{{% /alert %}}

Dapr 提供了一组 API，用于管理索引，并在词法（全文）搜索引擎中索引、检索、删除和查询文档。有关概念与功能的概述，请参阅[搜索 API 概述]({{% ref search-overview %}})。

所有 HTTP 请求和响应正文都使用[搜索 protobuf 定义](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/search.proto)的 JSON 映射：

- 字段名使用小驼峰命名（lowerCamelCase）。
- `bytes` 字段（例如文档的 `content`）为 Base64 编码的字符串。
- 枚举值以其名称发送和返回，例如 `INDEX_ACK_COMPLETED`。
- 64 位整数（例如 `documentCount` 和 `totalHits`）以字符串形式返回。
- 时长（例如 `waitTimeout`）是带 `s` 后缀的字符串，例如 `"10s"` 或 `"1.5s"`。
- 响应包含取默认值的字段，例如 `"documentCount": "0"`、`"score": 0`，或空的 `failedItems` 数组。声明为 `optional` 的字段在未设置时省略，例如最后一页上的 `continuationToken`，以及搜索存储无法提供时的 `totalHits`。
- 请求中未知的字段会被忽略。

没有请求正文的路由（获取索引、列出索引和删除索引）通过查询参数 `metadata.<key>=<value>` 传递组件特定的元数据。

## 创建索引

在搜索存储中创建一个索引。

```
POST http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes/<index>
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称。[查看所有可用的搜索组件。]({{% ref supported-search %}}) |
| `index` | 要创建的索引名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `metadata` | 组件特定的索引设置，例如声明为可过滤或可排序的属性。可选 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 索引已创建 |
| `400` | 请求格式错误 |
| `404` | 未找到搜索存储 |
| `409` | 索引已存在。现有索引的设置不会更改 |
| `500` | 搜索存储未配置或请求失败 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles \
  -H "Content-Type: application/json" \
  -d '{
        "metadata": {
          "filterableAttributes": "category,price",
          "sortableAttributes": "price"
        }
      }'
```

## 获取索引

获取索引的相关信息。

```
GET http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes/<index>
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称 |
| `index` | 索引的名称 |

### 查询参数

| 参数 | 说明 |
| --------- | ----------- |
| `metadata.<key>` | 组件特定的请求元数据。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `index` | 索引的名称 |
| `documentCount` | 索引中文档数量的近似值。无法高效提供此值的搜索存储返回 `0` |
| `properties` | 组件特定的索引属性 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回索引信息 |
| `404` | 未找到搜索存储或索引 |
| `500` | 搜索存储未配置或请求失败 |

### 示例

```shell
curl http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles
```

```json
{
  "index": "articles",
  "documentCount": "3",
  "properties": {
    "filterableAttributes": "category,price",
    "primaryKey": "id",
    "sortableAttributes": "id,price"
  }
}
```

## 列出索引

列出搜索存储中的索引。

```
GET http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称 |

### 查询参数

| 参数 | 说明 |
| --------- | ----------- |
| `metadata.<key>` | 组件特定的请求元数据。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `indexes` | 搜索存储中索引的名称 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回索引列表 |
| `404` | 未找到搜索存储 |
| `500` | 搜索存储未配置或请求失败 |

### 示例

```shell
curl http://localhost:3500/v1.0-alpha1/search/mysearch/indexes
```

```json
{
  "indexes": ["articles", "products"]
}
```

## 删除索引

删除一个索引及其中的所有文档。

```
DELETE http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes/<index>
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称 |
| `index` | 要删除的索引名称 |

### 查询参数

| 参数 | 说明 |
| --------- | ----------- |
| `metadata.<key>` | 组件特定的请求元数据。可选 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 索引已删除 |
| `404` | 未找到搜索存储或索引 |
| `500` | 搜索存储未配置或请求失败 |

当[弹性策略]({{% ref resiliency-overview %}})的重试策略重试删除操作，且之后某次尝试发现索引已不存在时，删除视为成功，因为较早的尝试很可能已经将其删除。第一次尝试返回的 `NOT_FOUND` 则原样返回。

### 示例

```shell
curl -X DELETE http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles
```

## 索引文档

按键写入文档（upsert）。索引中已存在相同 ID 的文档会被替换。

```
POST http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes/<index>/documents
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称 |
| `index` | 索引的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `documents` | 要索引的[文档](#文档)。每个文档必须具有非空的 `id`，且在同一请求中唯一。必填 |
| `options` | 控制请求何时返回的[索引选项](#索引选项)。可选 |
| `metadata` | 组件特定的请求元数据。可选 |

#### 文档

| 字段 | 说明 |
| ----- | ----------- |
| `id` | 调用方提供的文档标识符，在索引内唯一。必填 |
| `content` | Base64 编码的 UTF-8 JSON 对象。字段级请求选项（`searchFields`、`returnFields`、`highlightFields`、`sort` 和 `filter`）作用于其顶层键和使用点号表示的嵌套键。内容不是 JSON 对象的文档会在 `failedItems` 中以 `INVALID_ARGUMENT` 报告，且不会发送到搜索存储 |
| `metadata` | 与文档一起存储并原样返回的不透明字符串键/值对。元数据不会被索引、不可过滤，也不能被字段级请求选项寻址。可选 |

#### 索引选项

同一组选项适用于每一次写入：[索引文档](#索引文档)、[删除文档](#删除文档)，以及向量 API 的 [upsert]({{% ref "vector_api.md#upsert-vectors" %}}) 和 [删除]({{% ref "vector_api.md#delete-vectors" %}}) 操作。

| 字段 | 说明 |
| ----- | ----------- |
| `mode` | 请求何时返回。取值之一：<ul><li>`INDEXING_MODE_RETURN_ON_ACCEPTANCE`：搜索存储持久接受写入并转入后台处理后返回。API 不会公开任何最终结果。</li><li>`INDEXING_MODE_WAIT_FOR_COMPLETION`：等待最终结果，最长等待 `waitTimeout`。</li><li>`INDEXING_MODE_UNSPECIFIED`（默认）：与 `INDEXING_MODE_RETURN_ON_ACCEPTANCE` 相同。</li></ul> |
| `waitTimeout` | 等待写入完成的时长，例如 `"10s"`。在 `INDEXING_MODE_WAIT_FOR_COMPLETION` 下必填且必须为正数，在其他模式下不得设置。当请求有截止时间时，`waitTimeout` 必须短于剩余时间。当存储配置了[弹性策略]({{% ref resiliency-overview %}})的超时策略时，`waitTimeout` 还必须比该超时至少短其十分之一，且不少于 100ms。例如，超时策略为 `10s` 时，`waitTimeout` 最多为 `9s` |
| `onWaitTimeout` | `waitTimeout` 到期时的处理方式。在 `INDEXING_MODE_WAIT_FOR_COMPLETION` 下必填，在其他模式下不得设置。取值之一：<ul><li>`INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC`：返回 `INDEX_ACK_QUEUED`，并让排队中的写入继续执行。没有排队确认的搜索存储会以 `INVALID_ARGUMENT` 拒绝此选项。</li><li>`INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST`：请求以 `DEADLINE_EXCEEDED` 失败。弹性策略中的重试策略不会重试该请求，且不保证搜索存储会取消该写入。</li></ul> |

违反这些规则的索引选项会在写入到达存储之前被拒绝，返回 `INVALID_ARGUMENT`、`ERR_SEARCH_INVALID_REQUEST` 错误代码（向量 API 为 `ERR_VECTOR_INVALID_REQUEST`），以及 `options` 或 `options.wait_timeout` 上的 `google.rpc.BadRequest` 字段违规信息。

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `ack` | 写入到达的确认边界。成功时始终设置。取值之一：<ul><li>`INDEX_ACK_QUEUED`：搜索存储已接受写入以进行异步处理。这并不表示任何文档已被索引。当搜索存储返回 Dapr 无法识别的确认时，也会返回此值。</li><li>`INDEX_ACK_COMPLETED`：搜索存储已完成写入，`failedItems` 包含所有特定于条目的失败。</li></ul> |
| `failedItems` | 请求返回时已知的特定于条目的失败。每个条目包含文档 `id`，以及 `error`，其中有标准 [gRPC 状态码](https://grpc.io/docs/guides/status-codes/)（`code`）、`message` 和 `details` |

当没有需要写入的文档时（即请求没有文档，或所有文档都被拒绝），搜索存储不会被调用，`ack` 为 `INDEX_ACK_COMPLETED`。

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 请求已接受。请检查 `ack` 和 `failedItems` 以了解每个文档的结果 |
| `400` | 请求格式错误、文档 ID 为空或重复，或索引选项无效 |
| `404` | 未找到搜索存储或索引 |
| `500` | 搜索存储未配置或请求失败 |
| `504` | `waitTimeout` 在使用 `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST` 时到期 |

### 示例

```shell
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
            "content": "WyJub3QiLCAiYW4iLCAib2JqZWN0Il0="
          }
        ],
        "options": {
          "mode": "INDEXING_MODE_WAIT_FOR_COMPLETION",
          "waitTimeout": "10s",
          "onWaitTimeout": "INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST"
        }
      }'
```

本例中，`doc-2` 的内容是 JSON 数组而不是对象，因此被拒绝，而 `doc-1` 则被正常索引：

```json
{
  "failedItems": [
    {
      "id": "doc-2",
      "error": {
        "code": 3,
        "message": "content must be a JSON object",
        "details": []
      }
    }
  ],
  "ack": "INDEX_ACK_COMPLETED"
}
```

## 获取文档

按 ID 获取文档。

```
POST http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes/<index>/documents/get
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称 |
| `index` | 索引的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `ids` | 要获取的文档的 ID。必填 |
| `includeContent` | 是否返回文档的 `content`。为 `false`（默认）时，仅返回 `id` 和 `metadata`。可选 |
| `metadata` | 组件特定的请求元数据。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `documents` | 找到的[文档](#文档)，按请求顺序排列。不存在的 ID 会被省略。当 `includeContent` 不为 `true` 时，`content` 为空字符串 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回文档 |
| `400` | 请求格式错误 |
| `404` | 未找到搜索存储或索引 |
| `500` | 搜索存储未配置或请求失败 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/documents/get \
  -H "Content-Type: application/json" \
  -d '{
        "ids": ["doc-1", "doc-42"],
        "includeContent": true
      }'
```

```json
{
  "documents": [
    {
      "id": "doc-1",
      "content": "eyJjYXRlZ29yeSI6Imd1aWRlIiwicHJpY2UiOjEwLCJ0aXRsZSI6IkdldHRpbmcgc3RhcnRlZCB3aXRoIERhcHIifQ==",
      "metadata": { "author": "alice" }
    }
  ]
}
```

## 删除文档

按 ID 删除文档。删除属于写入操作，与[索引文档](#索引文档)共享确认模型。不存在的 ID 不算错误，删除操作也永远不会报告失败条目。

```
POST http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes/<index>/documents/delete
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称 |
| `index` | 索引的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `ids` | 要删除的文档的 ID。必填 |
| `options` | 控制请求何时返回的[索引选项](#索引选项)。可选 |
| `metadata` | 组件特定的请求元数据。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `ack` | `INDEX_ACK_QUEUED` 或 `INDEX_ACK_COMPLETED`，含义与[索引文档](#索引文档)中的相同。成功时始终设置 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 删除已接受或已完成 |
| `400` | 请求格式错误或索引选项无效 |
| `404` | 未找到搜索存储或索引 |
| `500` | 搜索存储未配置或请求失败 |
| `504` | `waitTimeout` 在使用 `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST` 时到期 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/documents/delete \
  -H "Content-Type: application/json" \
  -d '{
        "ids": ["doc-1", "doc-2"]
      }'
```

```json
{
  "ack": "INDEX_ACK_QUEUED"
}
```

## 搜索

查询索引。

```
POST http://localhost:<daprPort>/v1.0-alpha1/search/<storeName>/indexes/<index>/query
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 搜索组件的名称 |
| `index` | 索引的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `query` | [搜索查询](#搜索查询)。省略时，索引中的每个文档都会匹配。可选 |
| `metadata` | 组件特定的请求元数据。可选 |

#### 搜索查询

| 字段 | 说明 |
| ----- | ----------- |
| `text` | 全文查询。`text` 与 `native` 最多只能设置其中一个 |
| `native` | 提供方原生查询，为 JSON 对象，会原样传递给搜索存储。支持的格式参见[组件参考]({{% ref supported-search %}})。`text` 与 `native` 最多只能设置其中一个 |
| `filter` | 使用可移植的[过滤语言](#过滤语言)编写的过滤器。可选 |
| `topK` | 本页返回的最大命中数。为 `0` 或省略时，使用组件默认值。可选 |
| `continuationToken` | 上一页返回的令牌。第一页时省略。可选 |
| `searchFields` | 将全文查询限制在这些内容字段中。可选 |
| `returnFields` | 仅在每个命中结果中返回这些内容字段。可选 |
| `includeContent` | 是否在每个命中结果中返回文档的 `content`。为 `false`（默认）且 `returnFields` 为空时，仅返回 `id` 和 `metadata`。可选 |
| `sort` | 排序子句，按顺序应用。每个子句包含 `field` 和 `order`，取值为 `SORT_ORDER_ASC` 或 `SORT_ORDER_DESC`。可选 |
| `highlightFields` | 需要返回高亮片段的内容字段。可选 |

既不设置 `text` 也不设置 `native` 的查询会匹配索引中的每个文档（受 `filter` 约束）。所有查询字段都必须放在 `query` 内；由于会忽略未知字段，放在请求正文顶层的 `text` 等字段不会生效。

#### 过滤语言

过滤器是 JSON 对象，搜索组件会把它转换为各自的原生查询语言。字段路径指向文档内容的键，嵌套键使用点号表示法，例如 `customer.region`。直接设为某个值的字段表示等值匹配，同一对象中的多个条件以逻辑与（AND）组合。

| 类型 | 运算符 |
| ---- | --------- |
| 比较 | `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte` |
| 集合 | `$in`、`$nin` |
| 存在性 | `$exists`（布尔值） |
| 逻辑 | `$and`、`$or`、`$not` |

```json
{
  "$and": [
    { "category": { "$in": ["guide", "reference"] } },
    { "price": { "$gte": 10, "$lt": 50 } },
    { "$not": { "author.name": "bob" } }
  ]
}
```

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `hits` | 匹配的文档。每个命中结果包含 `document`、`score` 和 `highlights` |
| `hits[].document` | 匹配的[文档](#文档)。仅当 `includeContent` 为 `true` 或设置了 `returnFields` 时包含 `content`，否则为空字符串 |
| `hits[].score` | 未归一化、与提供方相关的相关性得分。数值越高表示匹配越相关 |
| `hits[].highlights` | 高亮片段，按字段名称分组 |
| `totalHits` | 匹配文档总数的尽力估计值。搜索存储无法提供时省略 |
| `totalHitsRelation` | `totalHits` 的准确程度：`TOTAL_HITS_RELATION_EXACT`、`TOTAL_HITS_RELATION_LOWER_BOUND` 或 `TOTAL_HITS_RELATION_ESTIMATE`。省略 `totalHits` 时为 `TOTAL_HITS_RELATION_UNSPECIFIED` |
| `continuationToken` | 用于获取下一页的不透明令牌。没有更多结果时省略 |

延续令牌与生成它的查询绑定。要获取下一页，请发送相同的查询，并将 `query.continuationToken` 设为该令牌；更改查询、过滤器、排序或字段选项会返回 `INVALID_ARGUMENT`。如果延续令牌背后的搜索存储游标已过期，请求会以 `FAILED_PRECONDITION` 失败，并返回 `SEARCH_CONTINUATION_EXPIRED` [错误原因](#错误原因)。

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回搜索结果 |
| `400` | 请求格式错误、过滤器无效、延续令牌无效或已过期 |
| `404` | 未找到搜索存储或索引 |
| `500` | 搜索存储未配置或请求失败 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/search/mysearch/indexes/articles/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "text": "dapr",
          "filter": { "category": "guide" },
          "sort": [ { "field": "price", "order": "SORT_ORDER_ASC" } ],
          "highlightFields": ["title"],
          "includeContent": true,
          "topK": 10
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
  "totalHits": "1",
  "totalHitsRelation": "TOTAL_HITS_RELATION_ESTIMATE"
}
```

## 错误

Dapr 运行时自身检测到的错误（例如搜索存储不存在或请求无效）会以标准 Dapr 错误格式返回，错误代码如下：

| 错误代码 | HTTP 状态 | gRPC 代码 | 说明 |
| ---------- | ----------- | --------- | ----------- |
| `ERR_SEARCH_STORE_NOT_FOUND` | `404` | `NOT_FOUND` | 指定的搜索存储不存在 |
| `ERR_SEARCH_STORE_NOT_CONFIGURED` | `500` | `FAILED_PRECONDITION` | 未配置任何搜索存储 |
| `ERR_SEARCH_INVALID_REQUEST` | `400` | `INVALID_ARGUMENT` | 请求未通过校验，例如文档 ID 为空或重复，或[索引选项](#索引选项)无效。`google.rpc.BadRequest` 详情会指明出错字段，例如 `documents.id`、`options` 或 `options.wait_timeout` |
| `ERR_MALFORMED_REQUEST` | `400` | N/A | HTTP 请求正文不是有效的 JSON |

搜索存储返回的错误（例如索引不存在）会原样传递其标准 [gRPC 状态码](https://grpc.io/docs/guides/status-codes/)和详情。通过 HTTP 访问时，响应正文使用标准代码名称作为 `errorCode`，状态详情放在 `details` 中，HTTP 状态则由代码映射而来：

| gRPC 代码 | HTTP 状态 |
| --------- | ----------- |
| `INVALID_ARGUMENT`、`FAILED_PRECONDITION`、`OUT_OF_RANGE` | `400` |
| `UNAUTHENTICATED` | `401` |
| `PERMISSION_DENIED` | `403` |
| `NOT_FOUND` | `404` |
| `CANCELLED` | `408` |
| `ALREADY_EXISTS`、`ABORTED` | `409` |
| `RESOURCE_EXHAUSTED` | `429` |
| `UNKNOWN`、`INTERNAL`、`DATA_LOSS` | `500` |
| `UNIMPLEMENTED` | `501` |
| `UNAVAILABLE` | `503` |
| `DEADLINE_EXCEEDED` | `504` |

```json
{
  "errorCode": "ALREADY_EXISTS",
  "message": "meilisearch index \"articles\" already exists"
}
```

带详情的错误，例如已过期的延续令牌：

```json
{
  "errorCode": "FAILED_PRECONDITION",
  "message": "...",
  "details": [
    {
      "@type": "type.googleapis.com/google.rpc.ErrorInfo",
      "reason": "SEARCH_CONTINUATION_EXPIRED",
      "domain": "dapr.io"
    }
  ]
}
```

没有 gRPC 状态的搜索存储错误会报告为 `INTERNAL`。

### 弹性策略

搜索存储调用在该存储的[弹性策略]({{% ref resiliency-overview %}})下运行：

- 重试策略可以通过 `matching.gRPCStatusCodes` 匹配搜索存储的标准 gRPC 代码。
- 策略超时返回为 `DEADLINE_EXCEEDED`，被取消的请求返回为 `CANCELLED`，断路器打开时返回为 `UNAVAILABLE`。
- 对重试的[创建索引](#创建索引)返回的 `ALREADY_EXISTS` 原样返回，因为该索引可能属于其他调用方。对重试的[删除索引](#删除索引)返回的 `NOT_FOUND` 视为成功。
- 等待超时（`INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST`）到期的写入不会被重试。

### 错误原因

部分错误带有 `dapr.io` 域中的 [`google.rpc.ErrorInfo`](https://cloud.google.com/apis/design/errors#error_info) 详情，其原因为下列之一：

| 原因 | 代码 | 说明 |
| ------ | ---- | ----------- |
| `SEARCH_CONTINUATION_EXPIRED` | `FAILED_PRECONDITION` | 延续令牌所引用的搜索存储游标已过期。请从第一页重新开始查询 |
| `INDEXING_OUTCOME_UNKNOWN` | 因情况而异 | 搜索存储报告了批次级失败，但无法确定哪些条目已生效。请重试该请求；按键的 upsert 和删除操作都是幂等的 |

## gRPC API

搜索 API 也可以通过 gRPC 使用，位于 [Dapr 运行时 protos](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/search.proto) 中的 `Dapr` 服务：

| RPC | 说明 |
| --- | ----------- |
| `CreateIndexAlpha1` | [创建索引](#创建索引) |
| `GetIndexAlpha1` | [获取索引](#获取索引) |
| `ListIndexesAlpha1` | [列出索引](#列出索引) |
| `DeleteIndexAlpha1` | [删除索引](#删除索引) |
| `IndexDocumentsAlpha1` | [索引文档](#索引文档) |
| `GetDocumentsAlpha1` | [获取文档](#获取文档) |
| `DeleteDocumentsAlpha1` | [删除文档](#删除文档) |
| `SearchAlpha1` | [搜索索引](#搜索) |

通过 gRPC 使用时，`storeName` 和 `index` 是请求消息的字段，`content` 以原始字节形式发送。

## 后续步骤

- [搜索 API 概述]({{% ref search-overview %}})
- [操作指南：索引和搜索文档]({{% ref howto-search %}})
- [搜索组件规范]({{% ref supported-search %}})
