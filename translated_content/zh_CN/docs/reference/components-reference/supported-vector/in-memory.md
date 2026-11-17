---
type: docs
title: "In-memory"
linkTitle: "In-memory"
description: "内存向量 component 的详细文档"
---

内存 vector store 将每个集合都保存在 Dapr sidecar 的内存中。它适用于不需要外部向量数据库的本地开发和测试。该存储不具备持久性：sidecar 停止时，集合和记录都会丢失，并且不同 sidecar 实例之间不共享。

## component 格式

要设置内存 vector store，请创建一个类型为 `vector.in-memory` 的 component。请参阅[本指南]({{% ref "howto-vector.md#set-up-the-vector-component" %}})了解如何创建和应用 vector store 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: vector.in-memory
  version: v1
  metadata:
  - name: indexingDelay
    value: "0s"
```

## 规范 metadata 字段

| 字段 | 必填 | 详细信息 | 示例 |
|-------|:--------:|---------|---------|
| `indexingDelay` | N | 将每次写入加入队列，并在此延迟时间过后再应用，以便你测试排队确认与等待超时。默认为 `"0s"`，即在调用返回前应用写入。 | `"2s"` |

## 支持的功能

| 功能 | 是否支持 | 详细信息 |
|---------|:---------:|---------|
| 稠密向量 | Y | |
| 距离度量 | 余弦、点积、欧氏距离 | `DISTANCE_METRIC_UNSPECIFIED` 在创建集合时选择余弦距离。查询可以使用与集合不同的度量。 |
| 按 ID 查询 | Y | 如果 `byId` 没有匹配任何记录，该查询会以 `NOT_FOUND` 失败。 |
| 分数阈值 | Y | |
| metadata 过滤 | Y | |
| 批量查询 | Y | 每个查询都会独立求值。 |
| 排队确认 | Y | 设置 `indexingDelay` 时，写入返回 `INDEX_ACK_QUEUED`，因此支持 `INDEXING_WAIT_TIMEOUT_ACTION_CONTINUE_ASYNC`。未设置延迟时，写入返回 `INDEX_ACK_COMPLETED`。 |
| 等待写入完成 | Y | 设置 `indexingDelay` 后，请求会等待排队的写入完成，最长等待 `waitTimeout`。 |

## 查询与记录

- 查询会将查询向量与集合中的每条记录进行比较，因此查询时间会随记录数量增长。
- 如果记录的值数量与集合的维度不同，或其值不是有限数字，该记录会出现在 `failedItems` 中，并附带 `INVALID_ARGUMENT`。在余弦相似度下，所有值均为零的向量同样会被拒绝。其余记录仍会被写入。
- 未设置 `topK` 时，component 最多返回 10 条匹配结果。

## 相关链接

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [向量 API 概述]({{% ref vector-overview %}})
- [向量 API 参考]({{% ref vector_api %}})
- [内存 search component]({{% ref "/reference/components-reference/supported-search/in-memory.md" %}})
