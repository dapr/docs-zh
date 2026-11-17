---
type: docs
title: "Dapr 搜索 .NET SDK"
linkTitle: "搜索"
weight: 180200
description: 使用 Dapr 搜索 .NET SDK 为 JSON 文档建立索引并进行查询
---

`Dapr.Search` 包为 Dapr 的搜索 building block 提供了专用的 .NET 客户端。它支持索引管理、类型化文档的写入与读取、全文查询和提供方原生查询、过滤、排序、投影、高亮，以及基于延续令牌的分页。内置的源生成器可以生成一个类型化客户端，并将其绑定到某个 component、索引和文档类型。

本系列指南面向 Dapr .NET SDK 1.19.0 或更高版本，以及 Dapr runtime 1.19 或更高版本。

{{% alert title="Alpha API" color="primary" %}}
Search API 目前处于 [alpha]({{% ref "certification-lifecycle#certification-levels" %}})。
{{% /alert %}}

请先阅读 [操作指南：索引与搜索文档]({{% ref dotnet-search-howto.md %}})。有关查询选项、序列化、生成的客户端和错误处理，请参阅 [搜索客户端指南]({{% ref dotnet-search-client-usage.md %}})。

搜索接受可直接建立索引的 JSON 对象；它不提取文本、不切分文档，也不生成嵌入向量。如需基于嵌入向量进行相似性搜索，请使用 [Vector .NET SDK]({{% ref dotnet-vector %}})。

## 相关链接

- [Search API 概述]({{% ref search-overview %}})
- [search component specifications]({{% ref supported-search %}})
- [.NET SDK 搜索示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Search)
