---
type: docs
title: "Dapr Secrets Management .NET SDK"
linkTitle: "Secrets Management"
weight: 160000
description: "Dapr Secrets Management building block 在 .NET 中的概述"
---

`Dapr.SecretsManagement` 提供了一个专用客户端，用于在 .NET 应用程序中从 Dapr secrets API 检索 secrets。借助 `DaprSecretsManagementClient`，你可以从已配置的 secret store component 中检索单个或批量 secrets，为请求传递 metadata，并使用源生成器，通过 `[SecretStore]` 和 `[Secret]` 特性以依赖注入的方式获得强类型的 secrets 访问。

客户端通过 `AddDaprSecretsManagement()` 注册到依赖注入中，并且可以从 `IConfiguration`、环境变量配置，在高级场景下也可以通过 `DaprSecretsManagementClientBuilder` 进行配置。

## 核心概念

- [操作指南：使用 Dapr Secrets Management .NET SDK 管理 secrets]({{< ref dotnet-secrets-howto.md >}})：客户端注册、带 metadata 检索单个和批量 secrets、用于强类型 secrets 的源生成器，以及测试方法。
- [DaprSecretsManagementClient 用法]({{< ref dotnet-secretsclient-usage.md >}})：生命周期管理、构建器配置、环境变量、gRPC 通道选项、取消操作、三种依赖注入重载、串联源生成器注册、API 响应结构，以及错误处理。

## 后续步骤

- [操作指南：使用 Dapr Secrets Management .NET SDK 管理 secrets]({{< ref dotnet-secrets-howto.md >}})
- [DaprSecretsManagementClient 用法]({{< ref dotnet-secretsclient-usage.md >}})
