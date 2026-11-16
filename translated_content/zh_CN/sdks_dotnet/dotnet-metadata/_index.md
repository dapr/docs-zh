---
type: docs
title: "Dapr 元数据 .NET SDK"
linkTitle: "元数据"
weight: 200000
description: "Dapr 元数据构建块在 .NET 中的概述"
---

`Dapr.Metadata` 为 .NET 应用提供对 Dapr 运行时元数据的类型化访问。该包注册了一个托管服务，在启动时从边车获取元数据，并通过 .NET 选项模式以 `DaprMetadata` 的形式对外提供。你可以通过 `IOptions<DaprMetadata>`、`IOptionsSnapshot<DaprMetadata>` 或 `IOptionsMonitor<DaprMetadata>` 注入它，从而访问运行时自身报告的组件、订阅、应用连接属性以及其他元数据。

客户端通过 `AddDaprMetadata()` 注册到依赖注入中，并可以从 `IConfiguration` 或环境变量进行配置。

## 核心概念

- [操作指南：使用 .NET SDK 获取 Dapr 运行时元数据]({{< ref dotnet-metadata-howto.md >}})：安装包、通过依赖注入进行注册、通过选项模式注入元数据、读取元数据值以及配置 Dapr 端点。

## 后续步骤

- [操作指南：使用 .NET SDK 获取 Dapr 运行时元数据]({{< ref dotnet-metadata-howto.md >}})
