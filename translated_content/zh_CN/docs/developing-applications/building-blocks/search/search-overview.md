---
type: docs
title: "搜索概述"
linkTitle: "概述"
weight: 1000
description: "Search API building block 概述"
---

{{% alert title="Alpha" color="primary" %}}
Search API 当前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}}) 阶段。
{{% /alert %}}

Dapr 的 Search API 提供了一种统一、可移植的方式，用于在 Meilisearch、Elasticsearch 和 OpenSearch 等词法（全文）搜索引擎中存储、检索和查询文档。你无需为每种搜索引擎学习不同的 SDK 和查询语言，只需让应用为 JSON 文档编制索引，并通过同一个 API 进行查询；更换 [search component]({{% ref supported-search %}}) 即可切换底层引擎。

Search API 的范围仅限于存储和查询已可直接编制索引的文档。文本提取、分块、嵌入向量生成和摄取流水线编排均不在其范围内；你的应用应在调用 API 之前完成这些步骤。如需对嵌入向量进行相似性搜索，请改用 [向量 API]({{% ref vector-overview %}})。

你可以将 Search API 与以下 Dapr 功能配合使用：

- [resiliency 策略]({{% ref resiliency-overview %}})，包括针对搜索引擎调用的断路器、超时和重试
- observability：使用指标（按 `operation` 标记的 `dapr_component_search_count` 和 `dapr_component_search_latencies`），以及通过 OpenTelemetry 和 Zipkin 进行分布式追踪
- 用于搜索引擎凭据的 [secret store 引用]({{% ref component-secrets %}})

## 概念

| 概念 | 描述 |
| ------- | ----------- |
| search store | 连接到搜索引擎的 Dapr [search component]({{% ref supported-search %}})。 |
| 索引 | 在 search store 中用于存放文档的具名容器。索引设置因组件而异，并在创建索引时作为 metadata 传递。 |
| 文档 | 已可直接编制索引的条目，由调用方提供的 `id`、可编制索引并可搜索的 `content` JSON 对象，以及不透明的字符串 `metadata` 组成。它会被原样存储并返回，但绝不会被编制索引或用于过滤。 |
| 命中 | 搜索返回的文档，包含其相关性 `score` 以及任何请求的 `highlights`。 |

## 功能

### 索引管理

创建、获取、列出和删除索引。创建已存在的索引会返回 `ALREADY_EXISTS`；Dapr 从不 reconcile 现有索引的设置。获取索引会返回文档数量的近似值以及组件特定的属性，例如已配置的可过滤或可排序属性。

### 按键 Upsert

文档通过按键 Upsert 写入。每个文档都必须携带一个非空的 `id`，且该 ID 在同一请求中必须唯一，因此重试同一请求具有幂等性。文档的 `content` 必须是 UTF-8 编码的 JSON 对象。内容不符合要求的文档会在 `failedItems` 中逐项报告，并返回 `INVALID_ARGUMENT`，且不会发送到搜索引擎；批次中的其余文档仍会被编制索引。

文档可以按请求顺序通过 ID 读回，也可以按 ID 删除。删除不存在的 ID 不会报错。

### 写入确认

许多搜索引擎会异步地为文档编制索引。每次写入（为文档编制索引和删除文档）都接受相同的可选 `options`，用于控制 Dapr 何时返回：

| 模式 | 行为 |
| ---- | -------- |
| `INDEXING_MODE_RETURN_ON_ACCEPTANCE`（默认） | 搜索引擎持久接受写入后立即返回。如果引擎将写入排入队列，响应中的 `ack` 为 `INDEX_ACK_QUEUED`；这并不意味着任何文档已经完成编制索引。 |
| `INDEXING_MODE_WAIT_FOR_COMPLETION` | 等待最终结果，最长等待时间由 `waitTimeout` 决定。响应中的 `ack` 为 `INDEX_ACK_COMPLETED`，`failedItems` 包含每个条目各自的失败信息。 |

等待完成时，你还必须设置 `onWaitTimeout`，以决定超时到期时的处理方式：

- `INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC`：返回 `INDEX_ACK_QUEUED`，并让已排队的工作继续执行。仅适用于提供排队确认的搜索引擎。
- `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST`：以 `DEADLINE_EXCEEDED` 使请求失败。搜索引擎仍可能完成该写入。

当调用设置了剩余截止时间时，`waitTimeout` 必须短于该截止时间。当 search store 配置了 [resiliency]({{% ref resiliency-overview %}}) 超时策略时，`waitTimeout` 还必须比该超时时间至少短十分之一，且至少短 100ms。否则，请求会在调用搜索引擎之前以 `INVALID_ARGUMENT` 被拒绝。

### 查询

搜索请求可以携带可选的 `query`，用于选择命中并决定其呈现形式。查询最多只能设置以下其中一项：

- 可移植的全文查询（`text`），可选择限定在特定的 `searchFields` 中；或
- 提供方原生查询（`native`），该查询会传递给搜索引擎，用于使用可移植 API 未涵盖的功能。

未设置上述任何一项的查询，或未携带 `query` 的请求，都会匹配索引中的所有文档，但仍受过滤条件的约束。查询可以与以下功能组合使用：

- **过滤条件**：使用可移植的[过滤语言](#过滤语言)编写
- **排序**：按一个或多个字段升序或降序排序
- **高亮**：为所选字段突出显示匹配的片段
- **字段投影**：使用 `returnFields`，或设置 `includeContent: false` 以仅返回文档 ID 和元数据
- **分页**：使用不透明的延续令牌

命中分数是未归一化的、因提供方而异的相关性值，分数越高表示相关性越强。请仅在同一结果集内比较分数。

### 分页

使用 `topK` 设置每页大小。省略该值或将其设为 `0` 时，应用组件的默认每页大小。当还有更多结果时，响应会包含 `continuationToken`；在下一个请求的 `query` 中原样传递该令牌即可获取下一页。延续令牌与生成它的查询形式绑定，因此下一个请求必须保持相同的查询、每页大小、过滤条件、排序和字段选项。如果令牌背后的搜索引擎游标已过期，请求会以 `FAILED_PRECONDITION` 失败，错误原因为 `SEARCH_CONTINUATION_EXPIRED`。

响应还会尽力返回 `totalHits`，以及说明其准确性的 `totalHitsRelation`：`TOTAL_HITS_RELATION_EXACT`、`TOTAL_HITS_RELATION_LOWER_BOUND` 或 `TOTAL_HITS_RELATION_ESTIMATE`。

### 过滤语言

过滤条件是 JSON 对象，每个搜索组件都会将其转换为自身的原生查询语言。字段路径指向文档 `content` 中的键；嵌套键使用点号表示法，例如 `customer.region`。直接将字段设为某个值表示相等匹配，同一对象中的多个条件以逻辑 AND 组合。

| 类型 | 运算符 |
| --------- | ---------- |
| 比较 | `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte` |
| 集合 | `$in`、`$nin` |
| 存在性 | `$exists`（布尔值） |
| 逻辑 | `$and`、`$or`、`$not` |

例如，以下过滤条件会匹配价格低于 20 的指南，或 `reference` 类别中的任何文档：

```json
{
  "$or": [
    { "category": "guide", "price": { "$lt": 20 } },
    { "category": { "$in": ["reference"] } }
  ]
}
```

某些搜索引擎要求字段先声明为可过滤或可排序，才能使用这些字段。详情请参阅[组件参考]({{% ref supported-search %}})。

### 错误报告

搜索引擎返回的错误会连同其规范的 gRPC 状态码和详细信息一起传递给你的应用，而不会被包装为通用的内部错误。通过 HTTP 访问时，响应状态与 gRPC 代码一致，`errorCode` 为该代码的名称。例如，创建已存在的索引会返回 HTTP `409` 和 `ALREADY_EXISTS` 错误代码。

Dapr 在调用搜索引擎之前检测到的错误则使用 Dapr 错误代码：`ERR_SEARCH_STORE_NOT_FOUND`、`ERR_SEARCH_STORE_NOT_CONFIGURED` 和 `ERR_SEARCH_INVALID_REQUEST`。详情请参阅 [Search API 参考]({{% ref "search_api.md#errors" %}})。

### Resiliency

对搜索引擎的调用会受 search store 的 [resiliency 策略]({{% ref resiliency-overview %}}) 约束：

- Retry policies 可以通过 `matching.gRPCStatusCodes` 匹配搜索引擎返回的规范 gRPC 代码。
- 超出策略超时时间的请求会以 `DEADLINE_EXCEEDED` 失败。
- 使用 `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST` 等待完成的写入，在其等待超时后不会重试。
- 重试索引删除时，如果返回 `NOT_FOUND`，该删除会被报告为成功，因为较早的一次尝试很可能已经删除了索引。
- `ALREADY_EXISTS` 在创建时始终原样返回，包括重试时也是如此。

## 试用 Search API

### 操作指南

了解 Search API building block 提供的功能后，请通过以下操作指南了解如何在应用中使用它：

- [操作指南：为文档编制索引并进行搜索]({{% ref howto-search %}})

## 后续步骤

- [操作指南：为文档编制索引并进行搜索]({{% ref howto-search %}})
- [Search API 参考]({{% ref search_api %}})
- [search component 规范]({{% ref supported-search %}})
- [向量 API 概述]({{% ref vector-overview %}})
