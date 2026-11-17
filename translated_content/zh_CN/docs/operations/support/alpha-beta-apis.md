---
type: docs
title: "Alpha 和 Beta API"
linkTitle: "Alpha 与 Beta API"
weight: 5000
description: "当前 alpha 和 beta API 列表"
---

## Alpha 版 API

| 构建块/API | gRPC | HTTP | 描述 | 文档 | 引入版本 | 
| ------------------ | ---- | ---- | ----------- | ------------- | ------------------ |
| 状态查询    | [Query State proto](https://github.com/dapr/dapr/blob/5aba3c9aa4ea9b3f388df125f9c66495b43c5c9e/dapr/proto/runtime/v1/dapr.proto#L44)     | `v1.0-alpha1/state/statestore/query` | 状态查询 API 使你能够检索、过滤和排序存储在 state store 组件中的键/值数据。 | [状态查询 API]({{% ref "howto-state-query-api.md" %}}) | v1.5 |
| 分布式锁    | [Lock proto](https://github.com/dapr/dapr/blob/5aba3c9aa4ea9b3f388df125f9c66495b43c5c9e/dapr/proto/runtime/v1/dapr.proto#L112)     | `/v1.0-alpha1/lock` | 分布式锁 API 使你能够对资源加锁。 | [分布式锁 API]({{% ref "distributed-lock-api-overview.md" %}}) | v1.8 |
| 加密    |  [Crypto proto](https://github.com/dapr/dapr/blob/5aba3c9aa4ea9b3f388df125f9c66495b43c5c9e/dapr/proto/runtime/v1/dapr.proto#L118)    | `v1.0-alpha1/crypto` | 加密 API 使你能够执行消息加密和解密的**高层级**加密操作。 | [加密 API]({{% ref "cryptography-overview.md" %}}) | v1.11 |
| 流式订阅    |  [Streaming Subscription proto](https://github.com/dapr/dapr/blob/310c83140b2f0c3cb7d2bef19624df88af3e8e0a/dapr/proto/runtime/v1/dapr.proto#L454)    | N/A | 订阅在应用程序代码中定义。流式订阅是动态的，意味着它们允许在运行时添加或删除订阅。 | [流式订阅 API]({{% ref "subscription-methods/#streaming-subscriptions" %}}) | v1.14 |
| 对话    |  [Conversation proto](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/dapr.proto#L226)    | `v1.0-alpha2/conversation` | 使用对话 API 在不同大语言模型之间进行交谈。 | [对话 API]({{% ref "conversation-overview.md" %}}) | v1.15 |
| Actor 应用发起的流    |  [SubscribeActorEventsAlpha1 proto](https://github.com/dapr/dapr/blob/2fe035dfd8d248a3272dd29574ce2e315b8cf570/dapr/proto/runtime/v1/dapr.proto#L125)    | N/A | Actor 宿主会向 daprd 打开一个双向 gRPC 流，并通过该连接接收所有 Actor 回调（调用、提醒、定时器、停用）。应用无需暴露服务器端口。 | [Actor 应用发起的流]({{% ref "actors-app-initiated-streams" %}}) | v1.18 |
| 搜索    |  [Search proto](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/search.proto)    | `v1.0-alpha1/search` | 使用搜索 API 在全文搜索引擎中索引、检索和查询文档。 | [搜索 API]({{% ref "search-overview.md" %}}) | v1.19 |
| 向量    |  [Vector proto](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/vector.proto)    | `v1.0-alpha1/vector` | 使用向量 API 存储预先嵌入的向量，并运行相似性查询。 | [向量 API]({{% ref "vector-overview.md" %}}) | v1.19 |
| Binary Store    |  [Binary Store proto](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/binarystore.proto)    | `v1.0-alpha1/binarystore` | 使用 Binary Store API 存储、检索和删除 state store 无法容纳的大文件。 | [Binary Store API]({{% ref "binary_store_api.md" %}}) | v1.19 |

## Beta 版 API

当前没有 beta 版 API。

## 相关链接

[了解有关 Alpha、Beta 和 Stable 生命周期阶段的更多信息。]({{% ref "certification-lifecycle.md#certification-levels" %}})
