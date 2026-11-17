---
type: docs
title: "向量概述"
linkTitle: "概述"
weight: 1000
description: "向量 API building block 概述"
---

{{% alert title="Alpha 阶段" color="primary" %}}
向量 API 目前处于 [Alpha 阶段]({{% ref "certification-lifecycle#certification-levels" %}})。
{{% /alert %}}

Dapr 的向量 API 提供了一种统一、可移植的方式，用于在 Meilisearch、Pinecone、Qdrant、Milvus 和 pgvector 等向量数据库中存储、检索密集向量（嵌入）并执行相似度查询。它是检索增强生成（RAG）、语义搜索和推荐等 AI 模式的存储与检索层：你的应用程序使用一些元数据写入嵌入，然后查询与某个查询向量最接近的记录。你可以通过更改[向量组件]({{% ref path="supported-vector" lang="en" %}})来替换底层向量数据库。

向量 API 存储的是已完成嵌入的向量。生成嵌入不在其范围内；你的应用程序会在调用 API 之前生成嵌入，例如使用嵌入模型。对于 JSON 文档的关键词搜索和全文搜索，请改用[搜索 API]({{% ref search-overview %}})。

你可以将向量 API 与 Dapr 的其他功能配合使用，例如：

- 使用[对话 API]({{% ref conversation-overview %}})将检索到的上下文发送给大型语言模型（LLM）
- [弹性策略]({{% ref resiliency-overview %}})，包括熔断器、超时和针对向量数据库调用的重试
- 使用指标（`dapr_component_vector_count` 和 `dapr_component_vector_latencies`，按 `operation` 标记）进行可观测性，以及使用 OpenTelemetry 和 Zipkin 进行分布式追踪
- 使用[秘密存储引用]({{% ref component-secrets %}})存储向量数据库凭据

## 概念

| 概念 | 描述 |
| ------- | ----------- |
| 向量存储 | 连接到向量数据库的 Dapr [向量组件]({{% ref path="supported-vector" lang="en" %}})。 |
| 集合 | 一个有名称的记录容器。每个集合都有固定的 `dimensions` 和一个距离 `metric`。 |
| 记录 | 由调用方提供的 `id`、一个由浮点数 `values` 组成的密集向量、可用于筛选的结构化 `metadata`，以及不透明的 `payload` 构成。该负载会被存储并原样返回，但不能用于筛选。 |
| 匹配项 | 查询返回的记录，附带其相似度 `score`。 |

## 功能

### 集合管理

创建、获取、列出和删除集合。创建集合时，需要设置：

- `dimensions`（必需）：集合中每个向量的长度。未提供 `dimensions` 的请求会被拒绝，并返回 `INVALID_ARGUMENT`。
- `metric`（可选）：用于比较向量的距离度量。如果未指定，则使用组件的默认度量。如果请求的度量无法由向量数据库提供，则返回 `INVALID_ARGUMENT`。

创建已存在的集合会返回 `ALREADY_EXISTS`。获取集合会返回其生效的维度和度量、近似记录数以及特定于组件的属性。

### 距离度量与分数

| 度量 | 分数 |
| ------ | ----- |
| `DISTANCE_METRIC_COSINE` | 余弦相似度，范围为 `[-1, 1]`。数值越高，距离越近。 |
| `DISTANCE_METRIC_DOT_PRODUCT` | 点积。数值越高，距离越近。 |
| `DISTANCE_METRIC_EUCLIDEAN` | 欧几里得距离。数值越低，距离越近。 |

分数是度量的未归一化值，因此你可以用相同的方式理解不同向量数据库返回的分数。查询可以设置 `scoreThreshold`，以排除较弱的匹配项。阈值包含边界，并使用度量自身的数值范围：对于余弦相似度和点积，分数大于或等于阈值的匹配项会保留；对于欧几里得距离，分数小于或等于阈值的匹配项会保留。

### 按键 Upsert

记录通过带键的 upsert 写入。每条记录都必须包含非空的 `id`，且在同一请求中必须唯一，因此重试相同请求具有幂等性。记录的 `values` 必须符合集合的维度。单条记录写入失败时，会在 `failedItems` 中报告；批次中的其余记录仍会写入。

可以按请求顺序通过 ID 读回记录，并可选择是否包含其向量值；也可以按 ID 删除记录。删除不存在的 ID 不会报错。

### 写入确认

向量写入采用与搜索 API 相同的确认模型。Upsert 和删除操作接受相同的 `options`，可选择在向量数据库接受写入后立即返回（默认的 `INDEXING_MODE_RETURN_ON_ACCEPTANCE`），或者等待最终结果（`INDEXING_MODE_WAIT_FOR_COMPLETION`），并设置超时和超时操作。等待超时遵循相同的规则，包括需要低于向量存储弹性超时的余量。请参阅搜索概述中的[写入确认]({{% ref "search-overview.md#write-acknowledgements" %}})。

### 查询

查询请求必须包含 `query`，用于查找与以下某一项最接近的 `topK` 条记录：

- 查询向量（`vector.values`），不能为空。系统仅读取 `vector` 的 `values`；其其他字段会被忽略。
- 现有记录中存储的向量（`byId`）。

如果省略 `topK` 或将其设为 `0`，则使用组件的默认值。查询还可以设置 `metric`，以决定如何解释分数和分数阈值；如果未指定，则使用集合的度量。查询可以结合以下选项：

- 使用可移植的[筛选语言](#筛选语言)编写的**元数据筛选条件**
- **分数阈值**，仅保留足够接近的匹配项
- 使用 `includeValues` 和 `includePayload` 进行**投影**，以控制是否返回向量值和负载

### 批量查询

批量查询可通过一次调用，对同一集合执行多条查询。存储、集合和请求元数据在批量请求中设置一次；`queries` 中的每个条目都与单次查询请求中的 `query` 具有相同的结构。每条查询独立成功或失败，响应则按请求顺序为每条查询返回一个结果：要么是该查询的匹配项，要么是其错误。只有请求级别的失败（例如集合不存在或凭据无效）才会导致整个调用失败。

### 筛选语言

筛选条件针对记录的结构化 `metadata`，并使用点分表示法访问嵌套字段，例如 `dealer.city`。筛选语言与[搜索 API 的筛选语言]({{% ref "search-overview.md#filter-language" %}})相同：

| 类型 | 运算符 |
| ---- | --------- |
| 比较 | `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte` |
| 集合 | `$in`、`$nin` |
| 存在性 | `$exists`（布尔值） |
| 逻辑 | `$and`、`$or`、`$not` |

例如，以下筛选条件会匹配由西雅图或波特兰的经销商售出的 Tesla 汽车记录：

```json
{
  "make": "tesla",
  "dealer.city": { "$in": ["Seattle", "Portland"] }
}
```

### 错误报告与弹性

向量错误的报告方式与[搜索错误]({{% ref "search-overview.md#error-reporting" %}})相同：向量数据库返回的错误会保留其规范 gRPC 状态码和详细信息，使用 HTTP 时也是如此；Dapr 在调用向量数据库之前检测到的错误则使用 `ERR_VECTOR_STORE_NOT_FOUND`、`ERR_VECTOR_STORE_NOT_CONFIGURED` 或 `ERR_VECTOR_INVALID_REQUEST`。调用会遵循向量存储的弹性策略，并采用与搜索 API 相同的[重试和超时行为]({{% ref "search-overview.md#resiliency" %}})；如果重试的集合删除操作返回 `NOT_FOUND`，则会报告为成功。

## 试用向量 API

### 操作指南

了解向量 API building block 提供的功能后，请通过以下操作指南了解如何在应用程序中使用它：

- [操作指南：存储和查询向量]({{% ref path="howto-vector" lang="en" %}})

## 后续步骤

- [操作指南：存储和查询向量]({{% ref path="howto-vector" lang="en" %}})
- [向量 API 参考]({{% ref path="vector_api" lang="en" %}})
- [向量组件规范]({{% ref path="supported-vector" lang="en" %}})
- [搜索 API 概述]({{% ref search-overview %}})
