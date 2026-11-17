---
type: docs
title: "向量 API 参考"
linkTitle: "向量 API"
description: "向量 API 的详细文档"
weight: 1650
---

{{% alert title="alpha" color="primary" %}}
向量 API 目前处于 [alpha]({{% ref "certification-lifecycle.md#certification-levels" %}})。
{{% /alert %}}

Dapr 提供了一组 API，用于管理集合，并在向量数据库中对稠密向量进行写入（upsert）、检索、删除和相似度查询。有关概念与功能的概述，请参阅[向量 API 概述]({{% ref vector-overview %}})。

所有 HTTP 请求和响应正文都使用[向量 protobuf 定义](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/vector.proto)的 JSON 映射：

- 字段名使用小驼峰命名（lowerCamelCase）。
- `bytes` 字段（例如记录的 `payload`）为 Base64 编码的字符串。
- 枚举值以其名称发送和返回，例如 `DISTANCE_METRIC_COSINE`。
- 64 位整数（例如 `recordCount`）以字符串形式返回。
- 时长（例如 `waitTimeout`）是带 `s` 后缀的字符串，例如 `"10s"`。
- 响应包含取默认值的字段，例如 `"recordCount": "0"`、`"score": 0`，或空的 `values` 数组。声明为 `optional` 的字段（例如记录的 `payload` 和 `metadata`）在未设置时省略。
- 请求中未知的字段会被忽略。

没有请求正文的路由（获取集合、列出集合和删除集合）通过查询参数 `metadata.<key>=<value>` 传递 component 特定的 metadata。

## 创建集合

在 vector store 中创建一个集合。

```
POST http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称。[查看所有可用的向量 component。]({{% ref supported-vector %}}) |
| `collection` | 要创建的集合名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `dimensions` | 集合中每个向量的长度。必须大于 `0`。必填 |
| `metric` | 集合的[距离度量](#距离度量)。省略或为 `DISTANCE_METRIC_UNSPECIFIED` 时，使用 component 的默认度量。component 无法提供的度量会返回 `INVALID_ARGUMENT`。可选 |
| `metadata` | component 特定的集合设置，例如索引参数。可选 |

#### 距离度量

| 取值 | 说明 |
| ----- | ----------- |
| `DISTANCE_METRIC_UNSPECIFIED` | 创建时使用 component 的默认度量。查询时使用为集合配置的度量 |
| `DISTANCE_METRIC_COSINE` | 余弦相似度。分数越高表示越接近 |
| `DISTANCE_METRIC_DOT_PRODUCT` | 点积相似度。分数越高表示越接近 |
| `DISTANCE_METRIC_EUCLIDEAN` | 欧氏距离。分数越低表示越接近 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 集合已创建 |
| `400` | 请求格式错误、缺少 `dimensions`，或度量不受支持 |
| `404` | 未找到 vector store |
| `409` | 集合已存在 |
| `500` | vector store 未配置或请求失败 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars \
  -H "Content-Type: application/json" \
  -d '{
        "dimensions": 4,
        "metric": "DISTANCE_METRIC_COSINE"
      }'
```

## 获取集合

获取集合的相关信息。

```
GET http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |
| `collection` | 集合的名称 |

### 查询参数

| 参数 | 说明 |
| --------- | ----------- |
| `metadata.<key>` | component 特定的请求 metadata。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `collection` | 集合的名称 |
| `recordCount` | 记录数量的近似值。无法高效提供此值的 vector store 返回 `0` |
| `dimensions` | 集合的维度 |
| `metric` | 实际生效的距离度量。始终为具体的值 |
| `properties` | component 特定的集合属性 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回集合信息 |
| `404` | 未找到 vector store 或集合 |
| `500` | vector store 未配置或请求失败 |

### 示例

```shell
curl http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars
```

```json
{
  "collection": "cars",
  "recordCount": "3",
  "properties": {
    "filterableAttributes": "daprMetadata",
    "primaryKey": "id"
  },
  "dimensions": 4,
  "metric": "DISTANCE_METRIC_COSINE"
}
```

## 列出集合

列出 vector store 中的集合。

```
GET http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |

### 查询参数

| 参数 | 说明 |
| --------- | ----------- |
| `metadata.<key>` | component 特定的请求 metadata。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `collections` | vector store 中集合的名称 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回集合列表 |
| `404` | 未找到 vector store |
| `500` | vector store 未配置或请求失败 |

### 示例

```shell
curl http://localhost:3500/v1.0-alpha1/vector/myvectors/collections
```

```json
{
  "collections": ["cars", "products"]
}
```

## 删除集合

删除一个集合及其中的所有记录。

```
DELETE http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |
| `collection` | 要删除的集合名称 |

### 查询参数

| 参数 | 说明 |
| --------- | ----------- |
| `metadata.<key>` | component 特定的请求 metadata。可选 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 集合已删除 |
| `404` | 未找到 vector store 或集合 |
| `500` | vector store 未配置或请求失败 |

当[resiliency]({{% ref resiliency-overview %}})的重试策略重试删除操作，且之后某次尝试发现集合已不存在时，删除视为成功，因为较早的尝试很可能已经将其删除。第一次尝试返回的 `NOT_FOUND` 则原样返回。

### 示例

```shell
curl -X DELETE http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars
```

## 写入向量

按键写入记录（upsert）。集合中已存在相同 ID 的记录会被替换。

```
POST http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>/vectors
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |
| `collection` | 集合的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `records` | 要写入的[记录](#记录)。每条记录必须具有非空的 `id`，且在同一请求中唯一。必填 |
| `options` | 控制请求何时返回的[索引选项]({{% ref "search_api.md#indexing-options" %}})。可选 |
| `metadata` | component 特定的请求 metadata。可选 |

#### 记录

| 字段 | 说明 |
| ----- | ----------- |
| `id` | 调用方提供的记录标识符，在集合内唯一。必填 |
| `values` | 稠密向量，即浮点数数组。其长度必须与集合的 `dimensions` 相等。必填 |
| `metadata` | 结构化的 JSON 对象属性，查询时可使用[过滤语言](#过滤语言)进行过滤。可选 |
| `payload` | 与记录一起存储并原样返回的 Base64 编码不透明字节。不可过滤。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `ack` | 写入到达的确认边界。成功时始终设置。取值之一：<ul><li>`INDEX_ACK_QUEUED`：vector store 已接受写入以进行异步处理。这并不表示任何记录已被写入。当 vector store 返回 Dapr 无法识别的确认时，也会返回此值。</li><li>`INDEX_ACK_COMPLETED`：vector store 已完成写入，`failedItems` 包含所有特定于条目的失败。</li></ul> |
| `failedItems` | 请求返回时已知的特定于条目的失败。每个条目包含记录 `id`，以及 `error`，其中有标准 [gRPC 状态码](https://grpc.io/docs/guides/status-codes/)（`code`）、`message` 和 `details` |

不含任何记录的写入会直接返回 `INDEX_ACK_COMPLETED`，而不会调用 vector store。

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 请求已接受。请检查 `ack` 和 `failedItems` 以了解每条记录的结果 |
| `400` | 请求格式错误、记录 ID 为空或重复，或索引选项无效 |
| `404` | 未找到 vector store 或集合 |
| `500` | vector store 未配置或请求失败 |
| `504` | `waitTimeout` 在使用 `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST` 时到期 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/vectors \
  -H "Content-Type: application/json" \
  -d '{
        "records": [
          {
            "id": "car-1",
            "values": [1, 0, 0, 0],
            "metadata": { "make": "tesla", "year": 2023, "dealer": { "city": "Seattle" } },
            "payload": "eyJuYW1lIjoiTW9kZWwgMyJ9"
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

## 获取向量

按 ID 获取记录。

```
POST http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>/vectors/get
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |
| `collection` | 集合的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `ids` | 要获取的记录的 ID。必填 |
| `includeValues` | 是否返回每条记录的向量 `values`。默认为 `false`。可选 |
| `metadata` | component 特定的请求 metadata。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `records` | 找到的[记录](#记录)，按请求顺序排列。不存在的 ID 会被省略。当 `includeValues` 不为 `true` 时，`values` 为空数组 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回记录 |
| `400` | 请求格式错误 |
| `404` | 未找到 vector store 或集合 |
| `500` | vector store 未配置或请求失败 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/vectors/get \
  -H "Content-Type: application/json" \
  -d '{
        "ids": ["car-1", "car-42"],
        "includeValues": true
      }'
```

```json
{
  "records": [
    {
      "id": "car-1",
      "values": [1, 0, 0, 0],
      "payload": "eyJuYW1lIjoiTW9kZWwgMyJ9",
      "metadata": { "dealer": { "city": "Seattle" }, "make": "tesla", "year": 2023 }
    }
  ]
}
```

## 删除向量

按 ID 删除记录。删除属于写入操作，与[写入向量](#写入向量)共享确认模型。不存在的 ID 不算错误。

```
POST http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>/vectors/delete
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |
| `collection` | 集合的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `ids` | 要删除的记录的 ID。必填 |
| `options` | 控制请求何时返回的[索引选项]({{% ref "search_api.md#indexing-options" %}})。可选 |
| `metadata` | component 特定的请求 metadata。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `ack` | `INDEX_ACK_QUEUED` 或 `INDEX_ACK_COMPLETED`，含义与[写入向量](#写入向量)中的相同。成功时始终设置 |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 删除已接受或已完成 |
| `400` | 请求格式错误或索引选项无效 |
| `404` | 未找到 vector store 或集合 |
| `500` | vector store 未配置或请求失败 |
| `504` | `waitTimeout` 在使用 `INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST` 时到期 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/vectors/delete \
  -H "Content-Type: application/json" \
  -d '{
        "ids": ["car-1", "car-2"]
      }'
```

```json
{
  "ack": "INDEX_ACK_QUEUED"
}
```

## 查询向量

查找与查询向量或某条现有记录最接近的记录。

```
POST http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>/query
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |
| `collection` | 集合的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `query` | [向量查询](#向量查询)。必填 |
| `metadata` | component 特定的请求 metadata。可选 |

#### 向量查询

| 字段 | 说明 |
| ----- | ----------- |
| `vector` | 查询向量，为带有 `values` 的对象。仅读取 `values`，且不能为空；记录的其他字段会被忽略。`vector` 与 `byId` 必须恰好提供其一 |
| `byId` | 已存储记录的 ID，该记录的向量将用作查询向量。`vector` 与 `byId` 必须恰好提供其一 |
| `topK` | 返回的最大匹配数。为 `0` 或省略时，使用 component 默认值。可选 |
| `filter` | 对记录 `metadata` 的过滤器，使用可移植的[过滤语言](#过滤语言)编写。可选 |
| `includeValues` | 是否返回每个匹配的向量 `values`。默认为 `false`。可选 |
| `includePayload` | 是否返回每个匹配的 `payload`。默认为 `false`。可选 |
| `metric` | 用于解释 `score` 和 `scoreThreshold` 的[距离度量](#距离度量)。省略时，使用集合的度量。component 无法为该集合计算的度量会返回 `INVALID_ARGUMENT`。可选 |
| `scoreThreshold` | 基于度量自身、未归一化刻度的包含式分数阈值。余弦和点积保留分数大于或等于该值的匹配，欧氏距离保留分数小于或等于该值的匹配。可选 |

所有查询字段都必须放在 `query` 内。由于会忽略未知字段，放在请求正文顶层的 `vector` 等字段不会生效，请求会因缺少查询而被拒绝。

#### 过滤语言

过滤器是 JSON 对象，向量 component 会把它转换为各自的原生查询语言。字段路径指向记录 `metadata` 的键，嵌套键使用点号表示法，例如 `dealer.city`。直接设为某个值的字段表示等值匹配，同一对象中的多个条件以逻辑与（AND）组合。

| 类型 | 运算符 |
| ---- | --------- |
| 比较 | `$eq`、`$ne`、`$gt`、`$gte`、`$lt`、`$lte` |
| 集合 | `$in`、`$nin` |
| 存在性 | `$exists`（布尔值） |
| 逻辑 | `$and`、`$or`、`$not` |

```json
{
  "$or": [
    { "make": "tesla", "year": { "$gte": 2024 } },
    { "dealer.city": { "$in": ["Seattle", "Portland"] } }
  ]
}
```

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `matches` | 最接近的记录，按从近到远排序。每个匹配包含 `record` 和 `score` |
| `matches[].record` | 匹配的[记录](#记录)。始终返回 `id`，记录有 `metadata` 时也会返回。除非 `includeValues` 为 `true`，否则 `values` 为空数组；仅当 `includePayload` 为 `true` 时才返回 `payload` |
| `matches[].score` | 实际生效度量的未归一化值 |
| `metric` | 用于分数的实际生效度量。始终为具体的值，即使请求未设置 `metric` |

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回查询结果 |
| `400` | 请求格式错误、缺少 `query`、`vector` 与 `byId` 均未设置或均已设置、查询向量为空、过滤器无效，或度量不受支持 |
| `404` | 未找到 vector store 或集合 |
| `500` | vector store 未配置或请求失败 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "vector": { "values": [1, 0, 0, 0] },
          "topK": 2,
          "filter": { "make": "tesla" },
          "includePayload": true,
          "scoreThreshold": 0.5
        }
      }'
```

```json
{
  "matches": [
    {
      "record": {
        "id": "car-1",
        "values": [],
        "payload": "eyJuYW1lIjoiTW9kZWwgMyJ9",
        "metadata": { "dealer": { "city": "Seattle" }, "make": "tesla", "year": 2023 }
      },
      "score": 1
    }
  ],
  "metric": "DISTANCE_METRIC_COSINE"
}
```

## 批量查询向量

在同一集合上运行多个查询。每个查询独立求值，各自成功或失败。

```
POST http://localhost:<daprPort>/v1.0-alpha1/vector/<storeName>/collections/<collection>/batch-query
```

### URL 参数

| 参数 | 说明 |
| --------- | ----------- |
| `daprPort` | Dapr 端口 |
| `storeName` | 向量 component 的名称 |
| `collection` | 集合的名称 |

### 请求正文

| 字段 | 说明 |
| ----- | ----------- |
| `queries` | 要运行的[向量查询](#向量查询)，每个查询的字段与[查询向量](#查询向量)请求中的 `query` 对象相同。每个查询都针对 URL 中的存储和集合运行。必填 |
| `metadata` | component 特定的请求 metadata。适用于每个查询。可选 |

### 响应内容

| 字段 | 说明 |
| ----- | ----------- |
| `results` | 每个查询对应一个结果，按请求顺序排列。每个结果包含与[查询向量](#查询向量)响应结构相同的 `response`，或包含 `error`，其中有标准 [gRPC 状态码](https://grpc.io/docs/guides/status-codes/)（`code`）、`message` 和 `details` |

未通过校验的查询（例如既没有设置 `vector` 也没有设置 `byId`，或查询向量为空）不会发送到 vector store。其所在位置会返回 `INVALID_ARGUMENT` 错误，原因为 `DAPR_VECTOR_INVALID_REQUEST`，并附带 `google.rpc.BadRequest` 字段违规信息，按位置指明该查询，例如 `queries[1]` 或 `queries[1].vector.values`。其他查询仍会运行。

只有整个请求范围内的失败（例如 vector store 或集合不存在、凭据无效或传输错误）才会导致整个请求失败。

### HTTP 响应代码

| 代码 | 说明 |
| ---- | ----------- |
| `200` | 已返回结果。请检查每个结果中的 `response` 或 `error` |
| `400` | 请求格式错误 |
| `404` | 未找到 vector store 或集合 |
| `500` | vector store 未配置或请求失败 |

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/batch-query \
  -H "Content-Type: application/json" \
  -d '{
        "queries": [
          { "vector": { "values": [1, 0, 0, 0] }, "topK": 1 },
          { "topK": 1 },
          { "byId": "car-1", "topK": 1, "metric": "DISTANCE_METRIC_EUCLIDEAN" }
        ]
      }'
```

本例中，第二个查询既没有设置 `vector` 也没有设置 `byId`，因此 Dapr 会直接拒绝它，而不会调用 vector store。第三个查询请求了 Meilisearch 不支持的度量，因此 vector store 在其对应位置返回错误。第一个查询返回了匹配结果：

```json
{
  "results": [
    {
      "response": {
        "matches": [
          {
            "record": {
              "id": "car-1",
              "values": [],
              "metadata": { "dealer": { "city": "Seattle" }, "make": "tesla", "year": 2023 }
            },
            "score": 1
          }
        ],
        "metric": "DISTANCE_METRIC_COSINE"
      }
    },
    {
      "error": {
        "code": 3,
        "message": "exactly one of vector or by_id must be set",
        "details": [
          {
            "@type": "type.googleapis.com/google.rpc.BadRequest",
            "fieldViolations": [
              {
                "field": "queries[1]",
                "description": "exactly one of vector or by_id must be set",
                "reason": "",
                "localizedMessage": null
              }
            ]
          },
          {
            "@type": "type.googleapis.com/google.rpc.ResourceInfo",
            "resourceType": "vector",
            "resourceName": "myvectors",
            "owner": "",
            "description": ""
          },
          {
            "@type": "type.googleapis.com/google.rpc.ErrorInfo",
            "reason": "DAPR_VECTOR_INVALID_REQUEST",
            "domain": "dapr.io",
            "metadata": {}
          }
        ]
      }
    },
    {
      "error": {
        "code": 3,
        "message": "meilisearch only supports the cosine distance metric for user-provided embeddings",
        "details": []
      }
    }
  ]
}
```

## 错误

Dapr runtime 自身检测到的错误（例如 vector store 不存在或请求无效）会以标准 Dapr 错误格式返回，错误代码如下：

| 错误代码 | HTTP 状态 | gRPC 代码 | 说明 |
| ---------- | ----------- | --------- | ----------- |
| `ERR_VECTOR_STORE_NOT_FOUND` | `404` | `NOT_FOUND` | 指定的 vector store 不存在 |
| `ERR_VECTOR_STORE_NOT_CONFIGURED` | `500` | `FAILED_PRECONDITION` | 未配置任何 vector store |
| `ERR_VECTOR_INVALID_REQUEST` | `400` | `INVALID_ARGUMENT` | 请求未通过校验，例如 `dimensions` 设为 `0`、记录 ID 为空或重复、缺少 `query`、`vector` 与 `byId` 均未设置或均已设置、查询向量为空，或[索引选项]({{% ref "search_api.md#indexing-options" %}})无效。`google.rpc.BadRequest` 详情会指明出错字段，例如 `dimensions`、`records.id`、`query`、`query.vector.values`、`options` 或 `options.wait_timeout`。在[批量查询](#批量查询向量)中，错误会改为返回到失败查询所在的位置 |
| `ERR_MALFORMED_REQUEST` | `400` | N/A | HTTP 请求正文不是有效的 JSON |

vector store 返回的错误（例如集合不存在）会原样传递其标准 [gRPC 状态码](https://grpc.io/docs/guides/status-codes/)和详情。通过 HTTP 访问时，响应正文使用标准代码名称作为 `errorCode`，状态详情放在 `details` 中，HTTP 状态的映射方式与[Search API]({{% ref "search_api.md#errors" %}})相同，例如 `NOT_FOUND` 映射为 `404`、`ALREADY_EXISTS` 映射为 `409`、`UNAVAILABLE` 映射为 `503`、`DEADLINE_EXCEEDED` 映射为 `504`：

```json
{
  "errorCode": "ALREADY_EXISTS",
  "message": "meilisearch collection \"cars\" already exists"
}
```

没有 gRPC 状态的 vector store 错误会报告为 `INTERNAL`。

无法确定结果的写入（即 vector store 报告了批次级失败，但未说明哪些记录已生效）会带有 `dapr.io` 域中原因为 `INDEXING_OUTCOME_UNKNOWN` 的 `google.rpc.ErrorInfo` 详情。请重试该请求；按键的 upsert 和删除操作都是幂等的。

### Resiliency

vector store 调用在该存储的[resiliency]({{% ref resiliency-overview %}})下运行：

- 重试策略可以通过 `matching.gRPCStatusCodes` 匹配 vector store 的标准 gRPC 代码。
- 策略超时返回为 `DEADLINE_EXCEEDED`，被取消的请求返回为 `CANCELLED`，断路器打开时返回为 `UNAVAILABLE`。
- 对重试的[创建集合](#创建集合)返回的 `ALREADY_EXISTS` 原样返回，因为该集合可能属于其他调用方。对重试的[删除集合](#删除集合)返回的 `NOT_FOUND` 视为成功。
- 等待超时（`INDEXING_WAIT_TIMEOUT_ACTION_FAIL_REQUEST`）到期的写入不会被重试。

## gRPC API

向量 API 也可以通过 gRPC 使用，位于 [Dapr runtime protos](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/vector.proto) 中的 `Dapr` 服务：

| RPC | 说明 |
| --- | ----------- |
| `CreateCollectionAlpha1` | [创建集合](#创建集合) |
| `GetCollectionAlpha1` | [获取集合](#获取集合) |
| `ListCollectionsAlpha1` | [列出集合](#列出集合) |
| `DeleteCollectionAlpha1` | [删除集合](#删除集合) |
| `UpsertVectorsAlpha1` | [写入向量](#写入向量) |
| `GetVectorsAlpha1` | [获取向量](#获取向量) |
| `DeleteVectorsAlpha1` | [删除向量](#删除向量) |
| `QueryVectorsAlpha1` | [查询向量](#查询向量) |
| `BatchQueryVectorsAlpha1` | [批量查询向量](#批量查询向量) |

通过 gRPC 使用时，`storeName` 和 `collection` 是请求消息的字段，`payload` 以原始字节形式发送。

## 后续步骤

- [向量 API 概述]({{% ref vector-overview %}})
- [操作指南：存储和查询向量]({{% ref howto-vector %}})
- [向量 component 规范]({{% ref supported-vector %}})
