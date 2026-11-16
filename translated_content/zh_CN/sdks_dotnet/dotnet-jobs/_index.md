---
type: docs
title: "Dapr Jobs .NET SDK"
linkTitle: "Jobs"
weight: 120000
description: "Dapr Jobs 构建块的 .NET 概述"
---

`Dapr.Jobs` 为 .NET 应用程序提供了专用客户端，用于与 Dapr Job API 交互。借助 `DaprJobsClient`，你可以按照预定义的计划调度未来要执行的操作，并可附带可选的有效负载。支持三种调度模式：在特定时间点触发的一次性作业、按固定 `TimeSpan` 周期重复执行的间隔作业，以及使用 Cron 表达式实现日历感知调度的 Cron 作业。该 SDK 还提供了最小 API 端点映射，使应用程序能够在作业触发时接收触发调用。

客户端通过 `AddDaprJobsClient()` 注册到依赖注入容器中，并可以通过 `IConfiguration`、环境变量或 `DaprJobsClientBuilder` 进行配置，以满足高级场景的需要。

## 核心概念

- [操作指南：在 .NET SDK 中编写和管理 Dapr Jobs]({{< ref dotnet-jobs-howto.md >}})：通过依赖注入注册客户端、使用 `IConfiguration` 以及手动实例化；在最小 API 中映射作业触发端点；调度一次性作业、间隔作业和基于 Cron 的作业；获取和删除作业。
- [DaprJobsClient 用法]({{< ref dotnet-jobsclient-usage.md >}})：生命周期管理、构建器配置、环境变量、gRPC 通道选项、取消、三种依赖注入重载、使用 JSON 辅助扩展方法进行有效负载序列化，以及错误处理。

## 后续步骤

- [操作指南：在 .NET SDK 中编写和管理 Dapr Jobs]({{< ref dotnet-jobs-howto.md >}})
- [DaprJobsClient 用法]({{< ref dotnet-jobsclient-usage.md >}})
