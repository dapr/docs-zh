---
type: docs
title: "Dapr Metadata .NET SDK"
linkTitle: "metadata"
weight: 200000
description: "Dapr metadata building block 在 .NET 中的概述"
---

`Dapr.Metadata` 为 .NET 应用提供对 Dapr runtime metadata 的类型化访问。该包注册了一个托管服务，在启动时从 sidecar 获取 metadata，并通过 .NET 选项模式以 `DaprMetadata` 的形式对外提供。你可以通过 `IOptions<DaprMetadata>`、`IOptionsSnapshot<DaprMetadata>` 或 `IOptionsMonitor<DaprMetadata>` 注入它，从而访问运行时自身报告的 component、订阅、应用连接属性以及其他 metadata。

客户端通过 `AddDaprMetadata()` 注册到依赖注入中，并可以从 `IConfiguration` 或环境变量进行配置。

## 核心概念

- [操作指南：使用 .NET SDK 获取 Dapr runtime metadata]({{< ref dotnet-metadata-howto.md >}})：安装包、通过依赖注入进行注册、通过选项模式注入 metadata、读取 metadata 值以及配置 Dapr 端点。

## 后续步骤

- [操作指南：使用 .NET SDK 获取 Dapr runtime metadata]({{< ref dotnet-metadata-howto.md >}})
