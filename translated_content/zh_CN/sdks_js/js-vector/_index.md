---
type: docs
title: "Dapr 向量 JavaScript SDK"
linkTitle: "向量"
weight: 180200
description: 使用 Dapr JavaScript SDK 存储嵌入向量并查询相似向量
---

Dapr JavaScript SDK 让 Node.js 应用能够管理集合、存储预先计算的稠密向量，并通过已配置的 Dapr 向量存储组件执行相似性搜索。使用 `DaprClient.vector` 配合 HTTP 或 gRPC 即可。

向量功能需要 JavaScript SDK 3.19.0 或更高版本，以及 1.19 版本线或更高版本中支持向量功能的 Dapr 运行时。

SDK 接受你在其他地方生成的嵌入向量，它不会根据文本、图像或负载生成嵌入向量。记录还可以携带不透明的负载字节，以及结构化、可过滤的元数据。

要开始使用，请参阅[向量操作指南]({{% ref js-vector-howto.md %}})。有关方法签名、索引行为、查询语义、取消和错误处理的说明，请参阅[客户端用法指南]({{% ref js-vector-client-usage.md %}})。
