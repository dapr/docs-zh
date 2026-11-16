---
type: docs
title: "Dapr 搜索 JavaScript SDK"
linkTitle: "搜索"
weight: 180200
description: 使用 Dapr JavaScript SDK 索引、检索和查询文档
---

Dapr JavaScript SDK 让 Node.js 应用能够管理索引，并在已配置的 Dapr 搜索组件中索引、检索、删除和查询 JSON 文档。使用 `DaprClient.search` 配合 HTTP 或 gRPC，可以实现全文搜索、过滤、排序、高亮和分页。

搜索功能需要 Dapr 运行时 1.19 或更高版本，以及 JavaScript SDK 3.19.0 或更高版本。底层的[搜索 API]({{% ref search_api.md %}})处于 Alpha 阶段。可用的查询功能取决于[搜索组件]({{% ref supported-search %}})。

要开始使用，请参阅[搜索操作指南]({{% ref js-search-howto.md %}})。有关方法签名、类型、写入确认、取消和错误处理的说明，请参阅[客户端用法指南]({{% ref js-search-client-usage.md %}})。
