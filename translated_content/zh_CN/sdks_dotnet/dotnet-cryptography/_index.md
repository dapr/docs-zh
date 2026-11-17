---
type: docs
title: "Dapr Cryptography .NET SDK"
linkTitle: "加密"
weight: 140000
description: "Dapr cryptography building block 在 .NET 中的概述"
---

`Dapr.Cryptography` 提供专用客户端，用于执行高性能的加密和解密操作。`DaprEncryptionClient` 支持流式操作，可处理任意大小的数据，并将加密计算工作交由 Dapr 运行时及其配置的加密 component 完成。

该客户端通过 `AddDaprEncryptionClient()` 注册到依赖注入中，并且可以从 `IConfiguration`、环境变量，或用于高级场景的 `DaprEncryptionClientBuilder` 进行配置。

## 核心概念

- [如何：在 .NET SDK 中创建并使用 Dapr Cryptography]({{< ref dotnet-cryptography-howto.md >}})：安装包、通过依赖注入注册客户端或手动构建客户端，并尝试示例。
- [DaprEncryptionClient 用法]({{< ref dotnet-cryptography-usage.md >}})：生命周期管理、构建器配置、环境变量、gRPC 通道选项、取消操作，以及三种依赖注入重载。

## 后续步骤

- [如何：在 .NET SDK 中创建并使用 Dapr Cryptography]({{< ref dotnet-cryptography-howto.md >}})
- [DaprEncryptionClient 用法]({{< ref dotnet-cryptography-usage.md >}})
