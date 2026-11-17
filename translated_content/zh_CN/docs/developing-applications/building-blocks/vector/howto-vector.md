---
type: docs
title: "如何：存储和查询向量"
linkTitle: "如何：查询向量"
weight: 2000
description: "了解如何存储嵌入向量，并使用向量 API 运行相似性查询"
---

{{% alert title="Alpha" color="primary" %}}
向量 API 目前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}})。
{{% /alert %}}

让我们开始使用 [向量 API]({{% ref vector-overview %}})。在本指南中，你将学习如何：

- 设置 Meilisearch 向量 component。
- 创建集合。
- 插入或更新带有向量、metadata 和负载的记录。
- 使用 metadata 过滤器和分数阈值运行相似性查询。
- 在一个批次中运行多个查询。
- 按 ID 检索和删除记录。

本指南中的示例使用 `curl` 调用 Dapr HTTP API，并使用 4 维向量以便于阅读。在实际应用中，向量来自嵌入模型，通常具有数百或数千个维度。HTTP API 使用 [protobuf 消息的 JSON 映射](https://protobuf.dev/programming-guides/json/)：字段名为 camelCase，64 位整数为字符串，字节则使用 base64 编码。响应中会包含值为零值的字段，并省略未设置的可选字段。如需查看使用类型化负载、metadata 过滤器和批量查询的 .NET 示例，请参阅 [向量 .NET SDK 指南]({{% ref dotnet-vector-howto.md %}})，其适用于 SDK 1.19.0 或更高版本。

## 前提条件

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)
- [Docker](https://docs.docker.com/get-docker/)

## 启动 Meilisearch

使用 Docker 运行本地 Meilisearch 实例：

```bash
docker run -d --name meilisearch -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterKey \
  getmeili/meilisearch:v1.43
```

## 设置向量 component

在你的 component 目录（例如 `./components`）中创建名为 `vector.yaml` 的文件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: myvectors
spec:
  type: vector.meilisearch
  version: v1
  metadata:
  - name: host
    value: "http://localhost:7700"
  - name: apiKey
    value: "masterKey"
```

{{% alert title="警告" color="warning" %}}
上面的示例将 secrets 作为明文字符串直接使用。建议使用 secret store 来保存这些 secrets，具体方法见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

有关所有受支持的向量 component，请参阅[向量 component 规范]({{% ref supported-vector %}})。

## 运行 Dapr sidecar

启动一个加载该 component 的 Dapr sidecar：

```bash
dapr run --app-id vector-app --dapr-http-port 3500 --resources-path ./components
```

## 创建集合

创建一个名为 `cars` 的集合，用于存放 4 维向量，并使用余弦相似度进行比较：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars \
  -H "Content-Type: application/json" \
  -d '{
        "dimensions": 4,
        "metric": "DISTANCE_METRIC_COSINE"
      }'
```

确认集合已创建：

```bash
curl http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars
```

```json
{
  "collection": "cars",
  "recordCount": "0",
  "properties": {
    "filterableAttributes": "daprMetadata",
    "primaryKey": "id"
  },
  "dimensions": 4,
  "metric": "DISTANCE_METRIC_COSINE"
}
```

## 插入或更新记录

每条记录都包含一个 `id`、向量 `values`、可用于过滤的结构化 `metadata`，以及可选的不透明 `payload`。由于 `payload` 定义为字节类型，HTTP API 要求其使用 base64 编码。在本示例中，`car-1` 的 payload 是 `{"name":"Model 3"}` 的 base64 编码。

以下请求插入或更新三条记录，并最多等待 10 秒以完成写入：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/vectors \
  -H "Content-Type: application/json" \
  -d '{
        "records": [
          {
            "id": "car-1",
            "values": [1, 0, 0, 0],
            "metadata": { "make": "tesla", "year": 2023, "dealer": { "city": "Seattle" } },
            "payload": "eyJuYW1lIjoiTW9kZWwgMyJ9"
          },
          {
            "id": "car-2",
            "values": [0.9, 0.1, 0, 0],
            "metadata": { "make": "tesla", "year": 2025, "dealer": { "city": "Portland" } },
            "payload": "eyJuYW1lIjoiTW9kZWwgWSJ9"
          },
          {
            "id": "car-3",
            "values": [0, 1, 0, 0],
            "metadata": { "make": "ford", "year": 2024, "dealer": { "city": "Seattle" } }
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

无法写入的记录会连同错误信息一并列在 `failedItems` 中，而批次中的其余记录仍会被写入。例如，使用 Meilisearch 时，若某条记录的 `values` 维度与集合的维度不一致，则会以 `INVALID_ARGUMENT` 报告。

{{% alert title="注意" color="primary" %}}
如果省略 `options`，Dapr 会在 Meilisearch 将写入请求排入队列后立即返回（`INDEX_ACK_QUEUED`）。Meilisearch 处理完该任务后，记录很快就可以被查询到。
{{% /alert %}}

## 查询集合

查找与查询向量最接近的两条记录，且仅限在西雅图或波特兰销售的 Tesla 汽车，并返回它们的负载。查询内容设置在请求中必填的 `query` 字段内：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "vector": { "values": [1, 0, 0, 0] },
          "topK": 2,
          "filter": {
            "make": "tesla",
            "dealer.city": { "$in": ["Seattle", "Portland"] }
          },
          "includePayload": true
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
    },
    {
      "record": {
        "id": "car-2",
        "values": [],
        "payload": "eyJuYW1lIjoiTW9kZWwgWSJ9",
        "metadata": { "dealer": { "city": "Portland" }, "make": "tesla", "year": 2025 }
      },
      "score": 0.9938837
    }
  ],
  "metric": "DISTANCE_METRIC_COSINE"
}
```

分数是查询向量与每条记录之间的余弦相似度，其中 `1` 表示完全相同。由于查询未设置 `includeValues`，因此 `values` 为空。

### 按分数过滤

使用 `scoreThreshold` 仅保留足够接近的匹配结果。对于余弦相似度，分数大于或等于阈值的匹配会被保留：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "vector": { "values": [1, 0, 0, 0] },
          "topK": 10,
          "scoreThreshold": 0.5
        }
      }'
```

### 按记录 ID 查询

如需查找与已存储的某条记录相似的记录，请使用 `byId` 代替查询向量：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/query \
  -H "Content-Type: application/json" \
  -d '{
        "query": {
          "byId": "car-3",
          "topK": 3
        }
      }'
```

## 运行批量查询

在一次调用中向同一集合发送多个查询。`queries` 中的每一项与单个查询请求的 `query` 结构相同，并针对 URL 中的集合执行。每个查询相互独立地成功或失败，结果按请求顺序返回。在本示例中，第二个查询无效，因为它既未设置向量，也未设置记录 ID，因此其位置包含一个错误，而第一个查询仍会返回匹配结果（为简洁起见，以下响应中省略了错误的 `details`）：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/batch-query \
  -H "Content-Type: application/json" \
  -d '{
        "queries": [
          { "vector": { "values": [0, 1, 0, 0] }, "topK": 1 },
          { "topK": 1 }
        ]
      }'
```

```json
{
  "results": [
    {
      "response": {
        "matches": [
          { "record": { "id": "car-3", "values": [], "metadata": { "dealer": { "city": "Seattle" }, "make": "ford", "year": 2024 } }, "score": 1 }
        ],
        "metric": "DISTANCE_METRIC_COSINE"
      }
    },
    {
      "error": {
        "code": 3,
        "message": "exactly one of vector or by_id must be set"
      }
    }
  ]
}
```

## 按 ID 获取记录

按 ID 获取记录，包括其向量值。找到的记录按请求顺序返回；不存在的 ID 会被省略：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/vectors/get \
  -H "Content-Type: application/json" \
  -d '{
        "ids": [ "car-1", "car-42" ],
        "includeValues": true
      }'
```

## 删除记录

删除记录同样属于写入操作，并接受与插入或更新相同的 `options`。不存在的 ID 不会导致错误：

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars/vectors/delete \
  -H "Content-Type: application/json" \
  -d '{
        "ids": [ "car-2" ]
      }'
```

## 删除集合

```bash
curl -X DELETE http://localhost:3500/v1.0-alpha1/vector/myvectors/collections/cars
```

没有请求体的请求（获取、列出和删除集合）通过 `metadata.<key>=<value>` 查询参数传递请求 metadata。

## 后续步骤

- [向量 API 参考]({{% ref vector_api %}})
- [向量 component 规范]({{% ref supported-vector %}})
- [conversation API 概述]({{% ref conversation-overview %}})
