---
type: docs
title: "Meilisearch"
linkTitle: "Meilisearch"
description: Meilisearch search component 的详细信息
---

## component 格式

要设置 Meilisearch search store，请创建一个类型为 `search.meilisearch` 的 component。关于如何创建并应用 search store 配置，请参阅[本指南]({{% ref "howto-search.md#set-up-the-search-component" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: search.meilisearch
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
上面的示例将 secrets 用作明文字符串。建议将 secrets 保存在 secret store 中，具体做法见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范 metadata 字段

| 字段 | 必填 | 详情 | 示例 |
|------|:----:|------|------|
| `host` | 是 | Meilisearch 主机 URL。 | `"http://localhost:7700"` |
| `apiKey` | 否 | Meilisearch API 密钥。当 Meilisearch 实例受主密钥保护时必填。默认为 `""`。 | `"masterKey"` |
| `timeout` | 否 | 发往 Meilisearch 的 HTTP 客户端请求超时时间，以 Go 时长格式表示。 | `"10s"` |

## 支持的功能

| 功能 | 支持 | 详情 |
|------|:----:|------|
| 全文搜索 | 是 | `text` 查询使用 Meilisearch 的关键词搜索。 |
| 过滤 | 是 | 过滤条件只能使用在 `filterableAttributes` 中声明的属性。不支持 `$regex`。 |
| 排序 | 是 | 排序字段必须在 `sortableAttributes` 中声明。 |
| 高亮 | 是 | 高亮片段使用 `<em>` 标签。 |
| 分页 | 是 | 延续令牌基于偏移量。 |
| 原生查询 | 是 | 参见[原生查询](#原生查询)。 |
| 排队确认 | 是 | 当 Meilisearch 将任务排入队列时，写入会返回 `INDEX_ACK_QUEUED`，因此支持 `INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC`。 |
| 等待写入完成 | 是 | 参见[等待写入完成](#等待写入完成)。 |

## 索引设置

在[创建索引]({{% ref "search_api.md#create-index" %}})请求的 `metadata` 中，以逗号分隔的值传入以下 Meilisearch [索引设置](https://www.meilisearch.com/docs/reference/api/settings)：

| metadata | 详情 | 示例 |
|--------|------|------|
| `filterableAttributes` | 过滤可以使用的内容字段。Meilisearch 会拒绝对未在此声明的字段进行过滤。 | `"category,price"` |
| `sortableAttributes` | 排序可以使用的内容字段。component 使用文档 ID 作为稳定分页的决胜字段，因此始终会自动添加 `id`。 | `"price,publishedAt"` |
| `searchableAttributes` | 全文查询所搜索的内容字段，按重要性排序。省略时，所有字段均可搜索。 | `"title,body"` |

component 还会把 `sort` 排序规则移到最前，使带有 `sort` 的查询按请求的顺序返回命中结果，相关性则用于打破并列。

设置仅在创建索引时生效。对已存在的索引再次创建会返回 `ALREADY_EXISTS`，且不会更改其设置。

[获取索引]({{% ref "search_api.md#get-index" %}})会返回以下 `properties`：`primaryKey`（始终为 `id`），以及已设置时的 `filterableAttributes`、`sortableAttributes` 和 `searchableAttributes`。

## 文档映射

- 文档 `id` 即 Meilisearch 主键，必须为 1 到 511 字节的 ASCII 字母、数字、连字符和下划线。
- 文档 `content` 的键会作为顶层 Meilisearch 属性存储。`id`、`daprMetadata`、`daprPayload` 以及以 `_` 开头的键由 component 保留，不能在 `content` 中使用。
- 文档的 `metadata` 存储在保留属性 `daprMetadata` 下，并原样返回。全文查询永远不会搜索它。
- `id` 无效或 `content` 使用了保留键的文档，会在 `failedItems` 中以 `INVALID_ARGUMENT` 报告，且不会发送到 Meilisearch。批次中的其余文档仍会被索引。
- 向不存在的索引写入文档时，请求会以 `NOT_FOUND` 失败，而不是让 Meilisearch 在没有 component 设置的情况下自动创建索引。

## 分数与总命中数

- 命中分数是 Meilisearch 的[排序分数](https://www.meilisearch.com/docs/learn/relevancy/ranking_score)，取值在 `0` 到 `1` 之间，分数越高，相关性越强。
- `totalHits` 是 Meilisearch 估算的命中总数，以 `TOTAL_HITS_RELATION_ESTIMATE` 报告。当总数达到索引的分页设置 `maxTotalHits` 时，会以 `TOTAL_HITS_RELATION_LOWER_BOUND` 报告，并且无法翻页到超出该上限的结果。
- 未设置 `topK` 时，component 每页最多返回 20 条命中结果。

## 原生查询

[搜索]({{% ref "search_api.md#search" %}})请求中的 `query.native` 字段接受 [Meilisearch Search API](https://www.meilisearch.com/docs/reference/api/search) 的参数，例如 `q`、`filter`、`matchingStrategy` 或 `attributesToCrop`。分页和排序使用可移植的查询字段，因此原生查询不得设置 `offset`、`limit`、`page`、`hitsPerPage` 或 `sort`。原生 `filter` 会与可移植的 `filter` 以逻辑与（AND）组合，因此它只能缩小结果范围。

```json
{
  "query": {
    "native": { "q": "dapr", "matchingStrategy": "all" },
    "topK": 10
  }
}
```

## 等待写入完成

Meilisearch 会以[任务](https://www.meilisearch.com/docs/learn/async/asynchronous_operations)的形式异步处理写入。使用 `INDEXING_MODE_WAIT_FOR_COMPLETION` 时，component 会以指数退避的方式轮询 Meilisearch 任务 API，等待任务完成。

当启用实验性 Meilisearch [`tasksStreamingRoute`](https://www.meilisearch.com/docs/learn/resources/experimental_features_overview) 功能，且 API 密钥具有 `tasks.get` 权限时，component 会改为让所有等待中的写入共享同一个任务变更流。如果该路由报告不可用，component 会回退为轮询。这一选择对你的应用是透明的。

Meilisearch 任务是原子性的：如果任务失败，其中的所有文档都不会被索引，等待完成的请求会以该任务的错误失败。因此，component 会在发送任务之前检查 Meilisearch 会拒绝的文档，并按[文档映射](#文档映射)中的说明，将其报告在 `failedItems` 中。

## 设置 Meilisearch

{{< tabpane text=true >}}

{{% tab "自托管" %}}
使用 Docker 在本地运行 Meilisearch：

```bash
docker run -d --name meilisearch -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterKey \
  getmeili/meilisearch:v1.43
```

将 `host` 设置为 `http://localhost:7700`，将 `apiKey` 设置为 `masterKey`。

其他安装方式，请参阅 [Meilisearch 安装指南](https://www.meilisearch.com/docs/learn/self_hosted/install_meilisearch_locally)。
{{% /tab %}}

{{% tab "Meilisearch Cloud" %}}
在 [Meilisearch Cloud](https://www.meilisearch.com/cloud) 中创建一个项目，然后将 `host` 设置为项目 URL，并将 `apiKey` 设置为具有应用所需权限的 API 密钥。
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr component 基本结构]({{% ref component-schema %}})
- [Search API 概述]({{% ref search-overview %}})
- [Search API 参考]({{% ref search_api %}})
- [Meilisearch 向量 component]({{% ref "/reference/components-reference/supported-vector/meilisearch.md" %}})
- [Meilisearch 文档](https://www.meilisearch.com/docs/)
