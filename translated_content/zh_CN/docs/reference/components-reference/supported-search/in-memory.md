---
type: docs
title: "In-memory"
linkTitle: "In-memory"
description: "内存搜索组件的详细文档"
---

内存搜索存储将每个索引都保存在 Dapr 边车的内存中。它适用于不需要外部搜索服务的本地开发和测试。该存储不具备持久性：边车停止时，索引和文档都会丢失，并且不同边车实例之间不共享。

## 组件格式

要设置内存搜索存储，请创建一个类型为 `search.in-memory` 的组件。请参阅[本指南]({{% ref "howto-search.md#set-up-the-search-component" %}})了解如何创建和应用搜索存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: search.in-memory
  version: v1
  metadata:
  - name: indexingDelay
    value: "0s"
```

## 规范元数据字段

| 字段 | 必填 | 详细信息 | 示例 |
|-------|:--------:|---------|---------|
| `indexingDelay` | N | 将每次写入加入队列，并在此延迟时间过后再应用，以便你测试排队确认与等待超时。默认为 `"0s"`，即在调用返回前应用写入。 | `"2s"` |

## 支持的功能

| 功能 | 是否支持 | 详细信息 |
|---------|:---------:|---------|
| 全文搜索 | Y | 参见[分数与总命中数](#分数与总命中数)。 |
| 过滤 | Y | |
| 排序 | Y | |
| 高亮 | N | 带有 `highlightFields` 的查询会返回 `UNIMPLEMENTED`。 |
| 分页 | Y | 延续令牌基于偏移量。 |
| 原生查询 | N | 带有 `native` 的查询会返回 `UNIMPLEMENTED`。 |
| 排队确认 | Y | 设置 `indexingDelay` 时，写入返回 `INDEX_ACK_QUEUED`，因此支持 `INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC`。未设置延迟时，写入返回 `INDEX_ACK_COMPLETED`。 |
| 等待完成 | Y | 设置 `indexingDelay` 后，请求会等待排队的写入完成，最长等待 `waitTimeout`。 |

## 分数与总命中数

- 全文查询会搜索查询中的 `searchFields`；如果未设置 `searchFields`，则搜索所有内容字段。匹配不区分大小写，文本会按字母和数字组成的单词进行切分。
- 只有当每个查询词都出现在被搜索的字段中时，文档才会匹配。命中分数为查询词出现的次数。
- 未设置 `sort` 时，命中结果按分数从高到低排序，分数相同则按文档 ID 排序。设置 `sort` 后，分数和文档 ID 用于打破并列的情况。
- `totalHits` 是精确值，并以 `TOTAL_HITS_RELATION_EXACT` 报告。
- 未设置 `topK` 时，组件每页最多返回 10 条命中结果。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [搜索 API 概述]({{% ref search-overview %}})
- [搜索 API 参考]({{% ref search_api %}})
- [内存向量组件]({{% ref "/reference/components-reference/supported-vector/in-memory.md" %}})
