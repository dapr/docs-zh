---
type: docs
title: "Alpha and Beta APIs"
linkTitle: "Alpha & Beta APIs"
weight: 5000
description: "当前 alpha 和 beta API 列表"
---

## Alpha 版 API

| 构建块/API | gRPC | HTTP | 描述 | 文档 | 引入版本 | 
| ------------------ | ---- | ---- | ----------- | ------------- | ------------------ |
| Query State    | [Query State proto](https://github.com/dapr/dapr/blob/5aba3c9aa4ea9b3f388df125f9c66495b43c5c9e/dapr/proto/runtime/v1/dapr.proto#L44)     | `v1.0-alpha1/state/statestore/query` | 状态查询 API 使您能够检索、过滤和排序存储在状态存储组件中的键/值数据。 | [Query State API]({{% ref "howto-state-query-api.md" %}}) | v1.5 |
| Distributed Lock    | [Lock proto](https://github.com/dapr/dapr/blob/5aba3c9aa4ea9b3f388df125f9c66495b43c5c9e/dapr/proto/runtime/v1/dapr.proto#L112)     | `/v1.0-alpha1/lock` | 分布式锁 API 使您能够对资源加锁。	 | [Distributed Lock API]({{% ref "distributed-lock-api-overview.md" %}}) | v1.8 |
| Cryptography    |  [Crypto proto](https://github.com/dapr/dapr/blob/5aba3c9aa4ea9b3f388df125f9c66495b43c5c9e/dapr/proto/runtime/v1/dapr.proto#L118)    | `v1.0-alpha1/crypto` | 加密 API 使您能够执行消息加密和解密的**高层级**加密操作。 | [Cryptography API]({{% ref "cryptography-overview.md" %}}) | v1.11 |
| Jobs    |  [Jobs proto](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/dapr.proto#L212-219)    | `v1.0-alpha1/jobs` | Jobs API 使您能够调度和编排作业。 | [Jobs API]({{% ref "jobs-overview.md" %}}) | v1.14 |
| Streaming Subscription    |  [Streaming Subscription proto](https://github.com/dapr/dapr/blob/310c83140b2f0c3cb7d2bef19624df88af3e8e0a/dapr/proto/runtime/v1/dapr.proto#L454)    | N/A | 	订阅在应用程序代码中定义。流式订阅是动态的，意味着它们允许在运行时添加或删除订阅。 | [Streaming Subscription API]({{% ref "subscription-methods/#streaming-subscriptions" %}}) | v1.14 |
| Conversation    |  [Conversation proto](https://github.com/dapr/dapr/blob/master/dapr/proto/runtime/v1/dapr.proto#L226)    | `v1.0-alpha2/conversation` | 使用 conversation API 在不同大语言模型之间进行对话。 | [Conversation API]({{% ref "conversation-overview.md" %}}) | v1.15 |

## Beta 版 API

当前没有 beta 版 API。

## 相关链接

[了解有关 Alpha、Beta 和 Stable 生命周期阶段的更多信息。]({{% ref "certification-lifecycle.md#certification-levels" %}})
