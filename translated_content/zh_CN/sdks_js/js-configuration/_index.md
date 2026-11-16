---
type: docs
title: "Dapr Configuration JavaScript SDK"
linkTitle: "配置"
weight: 54000
description: "使用 Dapr JavaScript SDK 读取应用配置并订阅配置变更"
---

使用 `DaprClient.configuration` 从已配置的存储中获取应用配置，并订阅配置变更。你可以读取指定的键或全部键，监听指定的键或整个存储，并传递特定于存储的请求元数据。

这些指南以 `@dapr/dapr` 3.19.0 或更高版本为目标。JavaScript SDK 中的配置操作需要 **gRPC**；对于读取和订阅，HTTP 客户端都会抛出 `HTTPNotSupportedError`，尽管 Dapr 运行时确实提供了 HTTP 配置 API。

该客户端只负责读取和监听配置，不会创建、更新或删除配置项。请使用后端存储自身的工具或 API 直接进行这些修改。本构建块管理的是应用程序设置，而不是 Dapr 运行时的 `Configuration` 资源。

请先阅读[配置操作指南]({{% ref js-configuration-howto.md %}})，其中有可运行的示例。完整的方法列表、元数据、响应结构、订阅生命周期和错误处理，请参阅[客户端用法指南]({{% ref js-configuration-client-usage.md %}})。

## 相关链接

- [配置构建块概述]({{% ref configuration-api-overview.md %}})
- [配置 API 参考]({{% ref configuration_api.md %}})
- [支持的配置存储]({{% ref supported-configuration-stores %}})
