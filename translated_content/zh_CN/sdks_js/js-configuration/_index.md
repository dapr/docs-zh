---
type: docs
title: "Dapr Configuration JavaScript SDK"
linkTitle: "配置"
weight: 54000
description: "使用 Dapr JavaScript SDK 读取应用配置并订阅配置变更"
---

使用 `DaprClient.configuration` 从已配置的 configuration store 中获取应用配置，并订阅配置变更。你可以读取指定的键或全部键，监听指定的键或整个 configuration store，并传递特定于 store 的请求 metadata。

这些指南以 `@dapr/dapr` 3.19.0 或更高版本为目标。JavaScript SDK 中的配置操作需要 **gRPC**；对于读取和订阅，HTTP 客户端都会抛出 `HTTPNotSupportedError`，尽管 Dapr runtime 确实提供了 HTTP Configuration API。

该客户端只负责读取和监听配置，不会创建、更新或删除配置项。请直接使用后端 configuration store 自身的工具或 API 进行这些修改。本 building block 管理的是应用程序设置，而不是 Dapr runtime 的 `Configuration` 资源。

请先阅读[配置操作指南]({{% ref js-configuration-howto.md %}})，其中有可运行的示例。完整的方法列表、metadata、响应结构、订阅生命周期和错误处理，请参阅[客户端用法指南]({{% ref js-configuration-client-usage.md %}})。

## 相关链接

- [Configuration building block 概述]({{% ref configuration-api-overview.md %}})
- [Configuration API 参考]({{% ref configuration_api.md %}})
- [支持的 configuration store]({{% ref supported-configuration-stores %}})
