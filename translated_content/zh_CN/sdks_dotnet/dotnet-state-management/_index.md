---
type: docs
title: "Dapr 状态管理 .NET SDK"
linkTitle: "状态管理"
weight: 180000
description: "Dapr 状态管理构建块在 .NET 中的概览"
---

`Dapr.StateManagement` 为 .NET 应用提供了一个专用客户端，用于与 Dapr 状态管理 API 交互。通过 `DaprStateManagementClient`，你可以在已配置的状态存储组件中保存、获取、删除和查询键/值状态条目。该包支持单键与批量操作、基于 ETag 的乐观并发控制、状态事务以及状态查询。它还包含一个源生成器，借助 `[StateStore]` 和 `[State]` 特性，通过依赖注入提供强类型、按状态存储划分范围的访问方式。

客户端通过 `AddDaprStateManagement()` 注册到依赖注入容器中，并可以从 `IConfiguration`、环境变量或 `DaprStateManagementClientBuilder` 进行配置，以满足高级场景的需要。

## 核心概念

- [操作指南：使用 Dapr 状态管理 .NET SDK 管理状态]({{< ref dotnet-statemanagement-howto.md >}})：端到端的演练，涵盖保存、获取、删除和查询操作、ETag、批量操作、状态事务、用于强类型状态存储访问的源生成器以及测试。
- [DaprStateManagementClient 用法]({{< ref dotnet-statemanagementclient-usage.md >}})：生命周期管理、构建器配置、环境变量、gRPC 通道选项、依赖注入重载、JSON 序列化默认值、API 响应结构、用于一致性与并发控制的 `StateOptions`、错误处理，以及从 `DaprClient` 迁移。

## 后续步骤

- [操作指南：使用 Dapr 状态管理 .NET SDK 管理状态]({{< ref dotnet-statemanagement-howto.md >}})
- [DaprStateManagementClient 用法]({{< ref dotnet-statemanagementclient-usage.md >}})
