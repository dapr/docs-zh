---
type: docs
title: "Meilisearch"
linkTitle: "Meilisearch"
description: Meilisearch 向量 component 的详细信息
---

## component 格式

要设置 Meilisearch vector store，请创建一个类型为 `vector.meilisearch` 的 component。关于如何创建并应用 vector store 配置，请参阅[此指南]({{% ref "howto-vector.md#set-up-the-vector-component" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: vector.meilisearch
  version: v1
  metadata:
  - name: host
    value: "http://localhost:7700"
  - name: apiKey
    value: "<API_KEY>"
  - name: timeout
    value: "10s"
```

{{% alert title="警告" color="warning" %}}
上面的示例以纯文本字符串的形式使用 secrets。建议为 secrets 使用 secret store，具体说明见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规格 metadata 字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| `host` | Y | Meilisearch 主机 URL。 | `"http://localhost:7700"` |
| `apiKey` | N | Meilisearch API 密钥。当 Meilisearch 实例受主密钥（master key）保护时必填。默认为 `""`。 | `"masterKey"` |
| `timeout` | N | 发送给 Meilisearch 的请求所使用的 HTTP 客户端超时时间，为 Go 时长格式。 | `"10s"` |

## 支持的功能

| 功能 | 支持 | 说明 |
|---------|:---------:|---------|
| 稠密向量 | Y | 向量以[用户提供的嵌入向量](https://www.meilisearch.com/docs/learn/ai_powered_search/search_with_user_provided_embeddings)的形式存储。 |
| 距离度量 | 仅余弦 | 参见[距离度量与分数](#距离度量与分数)。 |
| 按 ID 查询 | Y | `byId` 查询使用 Meilisearch 的[相似文档](https://www.meilisearch.com/docs/reference/api/similar)搜索。不匹配任何记录的 `byId` 会使该查询以 `NOT_FOUND` 失败。 |
| 分数阈值 | Y | |
| metadata 过滤 | Y | 不支持 `$regex`。 |
| 批量查询 | Y | 每个查询独立求值。 |
| 排队确认 | Y | 当 Meilisearch 将任务排队时，写入会返回 `INDEX_ACK_QUEUED`，因此支持 `INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC`。 |
| 等待完成 | Y | 参见[等待写入完成](#等待写入完成)。 |

## 集合设置

集合是一个 Meilisearch 索引，带有一个名为 `default` 的单一 `userProvided` 嵌入器，其维度为请求中指定的 `dimensions`。记录的 metadata 默认可过滤。

你可以在[创建集合]({{% ref "vector_api.md#create-collection" %}})请求的 `metadata` 中，以逗号分隔的值的形式传入以下 Meilisearch [索引设置](https://www.meilisearch.com/docs/reference/api/settings)：

| metadata | 说明 | 示例 |
|----------|---------|---------|
| `filterableAttributes` | 需额外声明为可过滤的 Meilisearch 属性。`daprMetadata` 始终可过滤。 | `"daprMetadata.year"` |
| `sortableAttributes` | 需声明为可排序的 Meilisearch 属性。 | `"daprMetadata.year"` |

创建已存在的集合会返回 `ALREADY_EXISTS`，且不会更改其设置。集合与搜索索引共享同一个 Meilisearch 实例：列出集合时，只返回带有 `default` 用户提供嵌入器的索引；将任何其他索引作为集合获取或删除，或在其中执行更新插入（upsert）或删除记录，都会返回 `FAILED_PRECONDITION`。

[获取集合]({{% ref "vector_api.md#get-collection" %}})返回以下 `properties`：`primaryKey`（始终为 `id`）、`filterableAttributes`，以及设置后的 `sortableAttributes`。

## 记录映射

- 记录的 `id` 是 Meilisearch 的主键。它必须为 1 到 511 字节，且只能包含 ASCII 字母、数字、连字符和下划线。
- 记录的 `values` 存储在 `_vectors.default` 中。
- 记录的 `metadata` 以 `daprMetadata` 对象的形式存储。过滤路径会被转换为 `daprMetadata.<path>`，因此对 `dealer.city` 的过滤会作用于 `daprMetadata.dealer.city`。
- 记录的 `payload` 经 base64 编码后，存储在 `daprPayload` 属性下。

## 距离度量与分数

Meilisearch 对用户提供的嵌入向量只支持余弦相似度。`DISTANCE_METRIC_UNSPECIFIED` 选择余弦相似度；创建集合或查询请求中的任何其他度量都会返回 `INVALID_ARGUMENT`。由于所有分量都为零的向量的余弦相似度没有定义，这类向量，以及分量不是有限数字的向量，都会被以 `INVALID_ARGUMENT` 拒绝。

对于向量查询，Meilisearch 报告的归一化排序分数为 `(1 + cosine) / 2`。component 会将其换算回来，使匹配分数为 `[-1, 1]` 范围内的余弦相似度；并将 `scoreThreshold` 为 `t` 的设置转换为 Meilisearch 的 `rankingScoreThreshold`，其值为 `(1 + t) / 2`。`scoreThreshold` 超出 `[-1, 1]` 范围时，返回 `INVALID_ARGUMENT`。

未设置 `topK` 时，component 最多返回 10 个匹配项。

## 等待写入完成

Meilisearch 会将写入以[任务](https://www.meilisearch.com/docs/learn/async/asynchronous_operations)的形式异步处理。使用 `INDEXING_MODE_WAIT_FOR_COMPLETION` 时，component 会以指数退避的方式轮询 Meilisearch 任务 API，等待任务完成。

启用 Meilisearch 的实验性功能 [`tasksStreamingRoute`](https://www.meilisearch.com/docs/learn/resources/experimental_features_overview)，且 API 密钥具有 `tasks.get` 权限时，component 会改为让所有等待中的写入共享同一个任务变更流。若该路由报告不可用，component 会回退为轮询。这一选择对你的应用是透明的。

Meilisearch 任务是原子的：任务失败时，其中的记录都不会被写入，而等待完成的请求会以该任务的错误失败。因此，component 会在发送任务之前，先检查 Meilisearch 会拒绝的记录。`id` 无效、没有向量分量、分量数量与集合维度不一致，或向量的范数为零或包含非有限数值的记录，会在 `failedItems` 中以 `INVALID_ARGUMENT` 报告，其余记录仍会被写入。

向不存在的集合执行更新插入，会以 `NOT_FOUND` 使请求失败。

## 设置 Meilisearch

{{< tabpane text=true >}}

{{% tab "自托管" %}}
使用 Docker 在本地运行 Meilisearch：

```bash
docker run -d --name meilisearch -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterKey \
  getmeili/meilisearch:v1.43
```

将 `host` 设为 `http://localhost:7700`，将 `apiKey` 设为 `masterKey`。

其他安装方式请参阅 [Meilisearch 安装指南](https://www.meilisearch.com/docs/learn/self_hosted/install_meilisearch_locally)。
{{% /tab %}}

{{% tab "Meilisearch Cloud" %}}
在 [Meilisearch Cloud](https://www.meilisearch.com/cloud) 中创建一个项目，然后将 `host` 设为该项目的 URL，并将 `apiKey` 设为具有应用所需权限的 API 密钥。
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [向量 API 概述]({{% ref vector-overview %}})
- [向量 API 参考]({{% ref vector_api %}})
- [Meilisearch search component]({{% ref "/reference/components-reference/supported-search/meilisearch.md" %}})
- [Meilisearch AI 驱动搜索文档](https://www.meilisearch.com/docs/learn/ai_powered_search/getting_started_with_ai_search)
