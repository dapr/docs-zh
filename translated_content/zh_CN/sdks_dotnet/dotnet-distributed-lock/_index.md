---
type: docs
title: "Dapr 分布式锁 .NET SDK"
linkTitle: "分布式锁"
weight: 240000
description: "Dapr 分布式锁构建块的 .NET 概述"
---

借助 Dapr 分布式锁包，您可以在资源上创建和移除锁，以管理分布式应用程序之间的独占性。`DaprDistributedLockClient` 提供了一个专用客户端，用于与 Dapr 分布式锁 API 交互，支持获取锁（并在释放时自动解锁）、可配置的超时时间以及取消操作。

{{% alert title="包使用建议" color="primary" %}}
虽然此功能同时在 `Dapr.Client` 和 `Dapr.DistributedLock` 包中实现，但两者的使用方式略有不同。建议新的实现使用 `Dapr.DistributedLock` 包。
{{% /alert %}}

## 核心概念

- [操作方法：使用分布式锁客户端]({{< ref dotnet-distributedlock-howto.md >}})：安装包、通过依赖注入注册客户端或手动构建客户端，并尝试示例。
- [DaprDistributedLockClient 用法]({{< ref dotnet-distributedlock-usage.md >}})：生命周期管理、构建器配置、环境变量、gRPC 通道选项、取消操作，以及三种依赖注入重载。

## 后续步骤

- [操作方法：使用分布式锁客户端]({{< ref dotnet-distributedlock-howto.md >}})
- [DaprDistributedLockClient 用法]({{< ref dotnet-distributedlock-usage.md >}})
