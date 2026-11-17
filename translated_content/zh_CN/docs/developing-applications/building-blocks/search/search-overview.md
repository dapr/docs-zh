---
type: docs
title: "搜索概述"
linkTitle: "概述"
weight: 1000
description: "搜索 API building block 概述"
---

{{% alert title="Alpha" color="primary" %}}
搜索 API 当前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}}) 阶段。
{{% /alert %}}

Dapr 的搜索 API 提供了一种统一、可移植的方式，用于在 Meilisearch、Elasticsearch 和 OpenSearch 等词法（全文）搜索引擎中存储、检索和查询文档。你无需为每种搜索引擎分别学习不同的 SDK 和查询语言，只需让应用为 JSON 文档编制索引，并通过同一个 API 查询；更换 [搜索组件]({{% ref path="supported-search" lang="en" %}}) 即可切换底层引擎。

搜索 API 的范围仅限于存储和查询已准备好编制索引的文档。文本提取、分块、嵌入生成和摄取流水线编排均不在其范围内；你的应用应在调用 API 前完成这些步骤。如需对嵌入进行相似性搜索，请改用 [向量 API]({{% ref vector-overview %}})。

你可以将搜索 API 与以下 Dapr 功能配合使用：

- [弹性策略]({{% ref resiliency-overview %}})，包括针对搜索引擎调用的断路器、超时和重试
- 可观测性：使用指标（按 `operation` 标记的 `dapr_component_search_count` 和 `dapr_component_search_latencies`），以及通过 OpenTelemetry 和 Zipkin 进行分布式追踪
- 用于搜索引擎凭据的[密钥存储引用]({{% ref component-secrets %}})

## 概念

| 概念 | 描述 |
| ------- | ----------- |
| 搜索存储 | 连接到搜索引擎的 Dapr [搜索组件]({{% ref path="supported-search" lang="en" %}})。 |
| 索引 | 搜索存储中用于存放文档的具名容器。索引设置因组件而异，并在创建索引时作为元数据传递。 |
| 文档 | 已准备好编制索引的条目，由调用方提供的 `id`、可编制索引并可搜索的 `content` JSON 对象，以及不透明字符串 `metadata` 组成。元数据会被存储并原样返回，但绝不会编制索引或用于筛选。 |
| 命中项 | 搜索返回的文档，包含其相关性 `score` 以及任何请求的 `highlights`。 |

## 功能

### 索引管理

创建、获取、列出和删除索引。创建已存在的索引会返回 `ALREADY_EXISTS`；Dapr 不会协调现有索引的设置。获取索引会返回文档数量的近似值和组件特定属性，例如已配置的可筛选或可排序属性。

### 按键写入

文档通过按键写入（upsert）。每个文档都必须携带一个非空的 `id`，且该 ID 在请求中必须唯一，因此重试同一请求具有幂等性。文档的 `content` 必须是 UTF-8 编码的 JSON 对象。其他任何内容都会逐项报告在 `failedItems` 中，并返回 `INVALID_ARGUMENT`，且不会发送到搜索引擎；批次中的其余文档仍会编制索引。

文档可以按请求顺序通过 ID 读回，也可以按 ID 删除。删除不存在的 ID 不会报错。

### 写入确认

许多搜索引擎会异步为文档编制索引。每次写入（为文档编制索引和删除文档）都接受相同的可选 `options`，用于控制 Dapr 何时返回：

| 模式 | 行为 |
| ---- | -------- |
| `INDEXING_MODE_RETURN_ON_ACCEPTANCE`（默认） | 搜索引擎持久接受写入后立即返回。如果引擎将写入加入队列，响应中的 `ack` 为 `INDEX_ACK_QUEUED`；这并不意味着任何文档已经完成索引。 |
| `INDEXING_MODE_WAIT_FOR_COMPLETION` | 等待最终结果，最长等待时间由 `waitTimeout` 决定。响应中的 `ack` 为 `INDEX_ACK_COMPLETED`，而 `failedItems` 包含每一项失败的信息。 |

等待完成时，你还必须设置 `onWaitTimeout`，以决定超时到期时的处理方式：

- `INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC`：返回 `INDEX_ACK_QUEUED`，并让已排队的工作继续执行。仅适用于会提供排队确认的搜索引擎。
- `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST`：以 `DEADLINE_EXCEEDED` 使请求失败。搜索引擎仍可能完成写入。

如果调用设置了剩余截止时间，`waitTimeout` 必须短于该时间。当搜索存储配置了[弹性]({{% ref resiliency-overview %}})超时策略时，`waitTimeout` 还必须至少比该超时时间短其十分之一，且至少短 100ms。否则，搜索引擎尚未被调用，请求就会以 `INVALID_ARGUMENT` 被拒绝。

### 查询

搜索请求可以携带可选的 `query`，用于选择命中项并控制其形式。query 最多设置以下其中一项：

- 可移植的全文查询（`text`），可选择限制在特定的 `searchFields` 中；或
- 提供程序原生查询（`native`），该查询会传递给搜索引擎，以使用可移植 API 未涵盖的功能。

既未设置这两者中的任何一项的查询，或未携带 `query` 的请求，都会匹配索引中的所有文档，但仍受筛选条件约束。查询可与以下选项组合使用：

- 使用可移植[筛选语言](#筛选语言)编写的**筛选条件**
- 按一个或多个字段升序或降序进行**排序**
- 针对所选字段突出显示匹配片段
- 使用 `returnFields` 进行**字段投影**，或设置 `includeContent: false` 以仅返回文档 ID 和元数据
- 使用不透明的续页令牌进行**分页**

命中项分数是未归一化且因提供程序而异的相关性值，分数越高表示相关性越强。只能在同一结果集中比较分数。

### 分页

使用 `topK` 设置每页大小。省略该值或设为 `0` 时，将应用组件的默认每页大小。有更多结果时，响应会包含 `continuationToken`；在下一个请求的 `query` 中原样传递该令牌即可获取下一页。续页令牌与生成它的查询形式绑定，因此下一个请求必须保持相同的查询、每页大小、筛选条件、排序和字段选项。如果令牌背后的搜索引擎游标过期，请求会以 `FAILED_PRECONDITION` 失败，错误原因为 `SEARCH_CONTINUATION_EXPIRED`。

响应还会尽力返回 `totalHits`，以及说明其准确性的 `totalHitsRelation`：`TOTAL_HITS_RELATION_EXACT`、`TOTAL_HITS_RELATION_LOWER_BOUND` 或 `TOTAL_HITS_RELATION_ESTIMATE`。

### 筛选语言

筛选条件是 JSON 对象，每个搜索组件都会将其转换为自身的原生查询语言。字段路径指向文档 `content` 中的键；嵌套键使用点号表示法，例如 `customer.region`。直接将字段设为某个值表示相等匹配，同一对象中的多个条件以逻辑 AND 组合。

| 类型 | 运算符 |
| --------- | ---------- |
| 比较 | `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte` |
| 集合 | `$in`、`$nin` |
| 存在性 | `$exists`（布尔值） |
| 逻辑 | `$and`、`$or`、`$not` |

例如，以下筛选条件会匹配费用低于 20 的指南，或 `reference` 类别中的任何文档：

```json
{
  "$or": [
    { "category": "guide", "price": { "$lt": 20 } },
    { "category": { "$in": ["reference"] } }
  ]
}
```

某些搜索引擎要求字段先声明为可筛选或可排序，才能使用这些字段。详情请查看[组件参考]({{% ref path="supported-search" lang="en" %}})。

### 错误报告

搜索引擎返回的错误会连同其规范 gRPC 状态码和详细信息一起传递给你的应用，而不会被包装成通用内部错误。通过 HTTP 访问时，响应状态与 gRPC 代码一致，`errorCode` 则是该代码的名称。例如，创建已存在的索引会返回 HTTP `409` 和 `ALREADY_EXISTS` 错误代码。

Dapr 在调用搜索引擎前检测到的错误会使用 Dapr 错误代码：`ERR_SEARCH_STORE_NOT_FOUND`、`ERR_SEARCH_STORE_NOT_CONFIGURED` 和 `ERR_SEARCH_INVALID_REQUEST`。详情请参阅[搜索 API 参考]({{% ref path="search_api.md#errors" lang="en" %}})。

### 弹性

对搜索引擎的调用会应用搜索存储的[弹性策略]({{% ref resiliency-overview %}})：

- 重试策略可以通过 `matching.gRPCStatusCodes` 匹配搜索引擎返回的规范 gRPC 代码。
- 超出策略超时时间的请求会以 `DEADLINE_EXCEEDED` 失败。
- 使用 `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST` 等待完成的写入，在等待超时后不会重试。
- 重试索引删除操作时，如果返回 `NOT_FOUND`，删除会被报告为成功，因为较早的尝试很可能已经删除了索引。
- 创建操作返回的 `ALREADY_EXISTS` 始终原样返回，包括重试时也是如此。

## 试用搜索 API

### 操作指南

了解搜索 API building block 所提供的功能后，请通过以下操作指南了解如何在应用中使用它：

- [操作指南：为文档编制索引并进行搜索]({{% ref path="howto-search" lang="en" %}})

## 后续步骤

- [操作指南：为文档编制索引并进行搜索]({{% ref path="howto-search" lang="en" %}})
- [搜索 API 参考]({{% ref path="search_api" lang="en" %}})
- [搜索组件规范]({{% ref path="supported-search" lang="en" %}})
- [向量 API 概述]({{% ref vector-overview %}})
