---
type: docs
title: "Dapr Vector .NET SDK"
linkTitle: "向量"
weight: 180300
description: 使用 Dapr Vector .NET SDK 存储嵌入向量并执行相似性查询
---

`Dapr.Vector` 包为 Dapr 的向量构建块提供了专用的 .NET 客户端。它支持集合管理、向量的写入与检索、类型化或不透明的负载、元数据过滤、按向量或按 ID 查询、分数阈值，以及有序的批量查询结果。内置的源生成器可以生成一个类型化客户端，并将其绑定到某个组件、集合和负载类型。

这些指南面向 Dapr .NET SDK 1.19.0 或更高版本，以及 Dapr 运行时 1.19 或更高版本。

{{% alert title="Alpha API" color="primary" %}}
向量 API 目前处于 [Alpha 阶段]({{% ref "certification-lifecycle#certification-levels" %}})。
{{% /alert %}}

请先阅读 [操作指南：存储与查询向量]({{% ref dotnet-vector-howto.md %}})。有关配置、距离度量、批量错误、序列化和生成的客户端，请参阅 [向量客户端指南]({{% ref dotnet-vector-client-usage.md %}})。

你的应用程序必须提供预先计算好的嵌入向量，此客户端不会生成它们。如需对 JSON 文档进行词法或全文搜索，请使用 [搜索 .NET SDK]({{% ref dotnet-search %}})。

## 相关链接

- [向量 API 概述]({{% ref vector-overview %}})
- [向量组件规范]({{% ref supported-vector %}})
- [.NET SDK 向量示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Vector)
