---
type: docs
title: "Dapr 机密管理 .NET SDK"
linkTitle: "机密管理"
weight: 160000
description: "Dapr 机密管理构建块在 .NET 中的概述"
---

`Dapr.SecretsManagement` 提供了一个专用客户端，用于在 .NET 应用程序中从 Dapr 机密 API 检索机密。借助 `DaprSecretsManagementClient`，你可以从已配置的机密存储组件中检索单个或批量机密，为请求传递元数据，并使用源生成器，通过 `[SecretStore]` 和 `[Secret]` 特性以依赖注入的方式获得强类型的机密访问。

客户端通过 `AddDaprSecretsManagement()` 注册到依赖注入中，并且可以从 `IConfiguration`、环境变量配置，在高级场景下也可以通过 `DaprSecretsManagementClientBuilder` 进行配置。

## 核心概念

- [操作指南：使用 Dapr 机密管理 .NET SDK 管理机密]({{< ref dotnet-secrets-howto.md >}})：客户端注册、带元数据检索单个和批量机密、用于强类型机密的源生成器，以及测试方法。
- [DaprSecretsManagementClient 用法]({{< ref dotnet-secretsclient-usage.md >}})：生命周期管理、构建器配置、环境变量、gRPC 通道选项、取消操作、三种依赖注入重载、串联源生成器注册、API 响应结构，以及错误处理。

## 后续步骤

- [操作指南：使用 Dapr 机密管理 .NET SDK 管理机密]({{< ref dotnet-secrets-howto.md >}})
- [DaprSecretsManagementClient 用法]({{< ref dotnet-secretsclient-usage.md >}})
